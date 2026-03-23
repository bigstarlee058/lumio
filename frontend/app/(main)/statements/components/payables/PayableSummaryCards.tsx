'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { PayablesSummary } from '@/app/lib/payables-api';
import { Banknote, CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { formatMoney, getSummaryCardItems } from './payables-utils';

interface PayableSummaryCardsProps {
  summary: PayablesSummary;
  locale?: string;
  currency?: string;
  labels: {
    toPay: string;
    overdue: string;
    dueThisWeek: string;
    paidThisMonth: string;
    itemsSuffix: string;
  };
}

const cardIcons = {
  toPay: Banknote,
  overdue: Clock3,
  dueThisWeek: CalendarClock,
  paidThisMonth: CheckCircle2,
} as const;

export function PayableSummaryCards({
  summary,
  locale = 'en',
  currency = 'KZT',
  labels,
}: PayableSummaryCardsProps) {
  const items = getSummaryCardItems(summary).map(item => ({
    ...item,
    label: labels[item.key],
    icon: cardIcons[item.key],
  }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(item => {
        const Icon = item.icon;
        const count = 'count' in item ? item.count : undefined;

        return (
          <Card key={item.key} className="border border-[#E8E8E8] bg-white shadow-none">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span>{item.label}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E8] bg-slate-50 text-slate-600">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {formatMoney(item.value, currency, locale)}
                </div>
                {typeof count === 'number' ? (
                  <div className="mt-1 text-sm text-slate-500">
                    {count} {labels.itemsSuffix}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default PayableSummaryCards;
