'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { FileUp } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '../ui/spinner';
import { ActionRequired } from './ActionRequired';
import { CashFlowMini } from './CashFlowMini';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
  effectivePeriod?: string | null;
}

export function OverviewTab({ data, formatAmount, range, isLoading, effectivePeriod }: OverviewTabProps) {
  const mappedActions = (data.actions || []).map(a => {
    let priority: 'critical' | 'warning' | 'info' | 'success' = 'info';
    if (a.type === 'payments_overdue') priority = 'critical';
    else if (
      a.type === 'statements_pending_review' ||
      a.type === 'receipts_pending_review' ||
      a.type === 'statements_pending_submit'
    )
      priority = 'warning';
    return { ...a, priority };
  });

  // TODO: move parsing warnings into backend getActions() to avoid client-side injection.
  if (data.dataHealth?.parsingWarnings > 0) {
    mappedActions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: 'Parsing issues found',
      href: '/statements?filter=has_errors',
      priority: 'warning' as const,
    });
  }

  const hasNoData =
    data.cashFlow.length === 0 && mappedActions.length === 0 && data.snapshot.totalBalance === 0;

  const rangeLabel = range === '7d' ? '7d' : range === '90d' ? '90d' : '30d';

  const snapshotCards = [
    {
      key: 'totalBalance' as const,
      label: 'TOTAL BALANCE',
      colorClass: (v: number) => (v >= 0 ? '#334155' : '#D13D56'),
    },
    {
      key: 'income30d' as const,
      label: `INCOME (${rangeLabel})`.toUpperCase(),
      colorClass: () => '#059669',
    },
    {
      key: 'expense30d' as const,
      label: `EXPENSE (${rangeLabel})`.toUpperCase(),
      colorClass: () => '#D13D56',
    },
    {
      key: 'netFlow30d' as const,
      label: `NET FLOW (${rangeLabel})`.toUpperCase(),
      colorClass: (v: number) => (v >= 0 ? '#059669' : '#D13D56'),
    },
  ];

  if (hasNoData) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 10,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            height: 80,
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            bgcolor: 'var(--card)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
          }}
        >
          <FileUp size={40} color="var(--muted-foreground)" />
        </Box>
        <Typography
          component="h2"
          sx={{
            mb: 1,
            fontSize: 20,
            fontWeight: 700,
            color: 'text.primary',
            fontFamily: 'var(--font-dashboard-mono)',
          }}
        >
          Upload your first statement
        </Typography>
        <Typography
          sx={{
            mb: 4,
            maxWidth: 448,
            fontSize: 14,
            color: 'text.secondary',
            fontFamily: 'var(--font-dashboard-sans)',
          }}
        >
          Start tracking your finances by uploading a bank statement. We&apos;ll parse it
          automatically and show your cash flow, categories, and insights.
        </Typography>
        <Link
          href="/statements?openExpenseDrawer=scan"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--primary)',
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--primary-foreground)',
            transition: 'background-color 150ms',
            textDecoration: 'none',
            fontFamily: 'var(--font-dashboard-sans)',
          }}
        >
          <FileUp size={16} />
          Parse statement
        </Link>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', pb: '40px' }}>
      {effectivePeriod ? (
        <Box
          sx={{
            border: '1px solid var(--border)',
            bgcolor: 'var(--muted)',
            px: 2,
            py: 1.5,
            fontSize: 12,
            color: 'text.secondary',
            backdropFilter: 'blur(12px)',
            fontFamily: 'var(--font-dashboard-sans)',
          }}
        >
          Showing latest available period: {effectivePeriod}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          gap: '32px',
        }}
      >
        {snapshotCards.map(({ key, label, colorClass }) => {
          const value = data.snapshot[key];
          const textColor = colorClass(value);
          return (
            <Box
              key={key}
              sx={{
                border: '1px solid var(--border)',
                bgcolor: 'white',
                height: 72,
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-dashboard-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-dashboard-mono)',
                    fontSize: 30,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: textColor,
                    marginTop: 4,
                  }}
                >
                  {isLoading ? (
                    <Spinner size={12} />
                  ) : (
                    <>
                      {value < 0 && key !== 'expense30d' ? '− ' : ''}
                      {formatAmount(Math.abs(value))}
                    </>
                  )}
                </span>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
          gap: 2.5,
          alignItems: 'stretch',
          mt: 2,
        }}
      >
        <Box
          sx={{
            gridColumn: 'span 4',
            border: '1px solid var(--border)',
            bgcolor: 'white',
            minHeight: 320,
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
          }}
        >
          <Box
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              gap: 1.5,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-dashboard-mono)',
              }}
            >
              ACTION REQUIRED
            </h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ActionRequired
                actions={mappedActions}
                title="Action Required"
                emptyLabel="No actions needed"
                isLoading={isLoading}
              />
            </div>
          </Box>
        </Box>

        <Box
          sx={{
            gridColumn: 'span 8',
            border: '1px solid var(--border)',
            bgcolor: 'white',
            minHeight: 320,
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
          }}
        >
          <Box
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              gap: 1.5,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-dashboard-mono)',
              }}
            >
              CASH FLOW ({rangeLabel.toUpperCase()})
            </h2>
            <div
              style={{
                backgroundColor: 'transparent',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                padding: '20px 24px',
                minHeight: 240,
              }}
            >
              <CashFlowMini data={data.cashFlow} emptyLabel="No cash flow data yet" />
            </div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
