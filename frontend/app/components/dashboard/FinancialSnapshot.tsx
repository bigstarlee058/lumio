'use client';

import Box from '@mui/material/Box';
import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardFinancialSnapshot } from '@/app/hooks/useDashboard';
import { ArrowDownRight, ArrowUpRight, Banknote, Clock, TrendingUp, Wallet } from 'lucide-react';

interface FinancialSnapshotProps {
  snapshot: DashboardFinancialSnapshot;
  formatAmount: (value: number) => string;
  labels: {
    totalBalance: string;
    income: string;
    expense: string;
    netFlow: string;
    toPay: string;
    overdue: string;
  };
}

const cards = [
  { key: 'totalBalance', icon: Wallet, labelKey: 'totalBalance' },
  { key: 'income30d', icon: ArrowUpRight, labelKey: 'income' },
  { key: 'expense30d', icon: ArrowDownRight, labelKey: 'expense' },
  { key: 'netFlow30d', icon: TrendingUp, labelKey: 'netFlow' },
  { key: 'totalPayable', icon: Banknote, labelKey: 'toPay' },
  { key: 'totalOverdue', icon: Clock, labelKey: 'overdue' },
] as const;

export function FinancialSnapshot({ snapshot, formatAmount, labels }: FinancialSnapshotProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(6, 1fr)' },
        gap: 2,
      }}
    >
      {cards.map(({ key, labelKey, icon: Icon }) => {
        const value = snapshot[key];

        return (
          <Card
            key={key}
            style={{ border: '1px solid #E8E8E8', background: 'var(--card-bg)', boxShadow: 'none', borderRadius: 0 }}
          >
            <CardContent style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8' }}>
                  <span>{labels[labelKey]}</span>
                  <Box
                    component="span"
                    sx={{ display: 'flex', height: 32, width: 32, alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--muted)', color: '#64748b', border: '1px solid #E8E8E8', transition: 'background-color 150ms, color 150ms' }}
                  >
                    <Icon size={16} />
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ibm-plex-sans)', letterSpacing: '-0.02em', color: '#0f172a' }}>
                    {formatAmount(value)}
                  </span>
                </Box>
              </div>

              {key === 'netFlow30d' ? (
                <Box sx={{ mt: 2 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid',
                      ...(value >= 0
                        ? { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
                        : { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecdd3' }),
                    }}
                  >
                    {value >= 0 ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    {value >= 0 ? 'Positive flow' : 'Negative flow'}
                  </span>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
