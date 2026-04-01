'use client';

import { Card, CardContent } from '@/app/components/ui/card';
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
      colorClass: (v: number) =>
        v >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-[#D13D56]',
    },
    {
      key: 'income30d' as const,
      label: `INCOME (${rangeLabel})`.toUpperCase(),
      colorClass: () => 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'expense30d' as const,
      label: `EXPENSE (${rangeLabel})`.toUpperCase(),
      colorClass: () => 'text-[#D13D56]',
    },
    {
      key: 'netFlow30d' as const,
      label: `NET FLOW (${rangeLabel})`.toUpperCase(),
      colorClass: (v: number) =>
        v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#D13D56]',
    },
  ];

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:bg-card">
          <FileUp className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2
          className="mb-2 text-xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-dashboard-mono)' }}
        >
          Upload your first statement
        </h2>
        <p
          className="mb-8 max-w-md text-sm text-muted-foreground"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          Start tracking your finances by uploading a bank statement. We&apos;ll parse it
          automatically and show your cash flow, categories, and insights.
        </p>
        <Link
          href="/statements?openExpenseDrawer=scan"
          className="inline-flex items-center gap-2 rounded-none bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          <FileUp className="h-4 w-4" />
          Parse statement
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[30px] w-full pb-10">
      {effectivePeriod ? (
        <div
          className="rounded-xl border border-border bg-muted/70 px-4 py-3 text-[12px] text-muted-foreground backdrop-blur-md"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          Showing latest available period: {effectivePeriod}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-[32px] xl:grid-cols-4">
        {snapshotCards.map(({ key, label, colorClass }) => {
          const value = data.snapshot[key];
          const textColor = colorClass(value);
          return (
            <Card
              key={key}
              className="h-[72px] rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card"
            >
              <CardContent className="px-3 py-2 flex flex-col justify-between h-full">
                <span
                  className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px]"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {label}
                </span>
                <span
                  className={`text-[30px] font-bold leading-none ${textColor} mt-1`}
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {isLoading ? (
                    <Spinner className="size-3" />
                  ) : (
                    <>
                      {value < 0 && key !== 'expense30d' ? '− ' : ''}
                      {formatAmount(Math.abs(value))}
                    </>
                  )}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 items-stretch lg:grid-cols-12 mt-4">
        <Card className="min-h-[320px] rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] lg:col-span-4 dark:border-border dark:bg-card">
          <CardContent className="p-6 flex flex-col h-full overflow-hidden gap-3">
            <h2
              className="text-[18px] font-bold text-foreground uppercase"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              ACTION REQUIRED
            </h2>
            <div className="flex-1 overflow-y-auto">
              <ActionRequired
                actions={mappedActions}
                title="Action Required"
                emptyLabel="No actions needed"
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[320px] rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] lg:col-span-8 dark:border-border dark:bg-card">
          <CardContent className="p-6 h-full flex flex-col overflow-hidden gap-3">
            <h2
              className="text-[18px] font-bold text-foreground uppercase"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              CASH FLOW ({rangeLabel.toUpperCase()})
            </h2>
            <div className="bg-transparent flex-1 flex flex-col relative px-6 py-5 min-h-[240px]">
              <CashFlowMini
                data={data.cashFlow}
                emptyLabel="No cash flow data yet"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
