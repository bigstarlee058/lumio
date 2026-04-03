'use client';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { AppPagination } from '@/app/components/ui/pagination';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import type { Payable } from '@/app/lib/payables-api';
import { Edit3, MoreHorizontal } from 'lucide-react';
import {
  formatMoney,
  formatPayableDate,
  getPayableStatusVariant,
  isPayableOverdue,
} from './payables-utils';

interface PayablesListProps {
  items: Payable[];
  locale?: string;
  emptyTitle: string;
  emptyDescription: string;
  labels: {
    vendor: string;
    dueDate: string;
    amount: string;
    source: string;
    status: string;
    actions: string;
    markPaid: string;
    edit: string;
    archive: string;
    delete: string;
    pageShown: string;
    statusLabels: Record<string, string>;
    sourceLabels: Record<string, string>;
  };
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  actionState?: {
    markingPaidId?: string | null;
    archivingId?: string | null;
    deletingId?: string | null;
  };
  onEdit: (payable: Payable) => void;
  onMarkPaid: (payable: Payable) => void;
  onArchive: (payable: Payable) => void;
  onDelete: (payable: Payable) => void;
}

const fillTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );

function PayablesList({
  items,
  locale = 'en',
  emptyTitle,
  emptyDescription,
  labels,
  pagination,
  actionState,
  onEdit,
  onMarkPaid,
  onArchive,
  onDelete,
}: PayablesListProps) {
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  const rangeStart =
    pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
  const safeRangeStart = pagination.totalItems === 0 ? 0 : Math.min(rangeStart, rangeEnd);

  const renderActions = (payable: Payable) => {
    const canMarkPaid = payable.status !== 'paid' && payable.status !== 'archived';

    return (
      <div className="flex items-center justify-end gap-2">
        {canMarkPaid ? (
          <Button
            size="sm"
            variant="soft"
            onClick={() => onMarkPaid(payable)}
            disabled={actionState?.markingPaidId === payable.id}
          >
            {labels.markPaid}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => onEdit(payable)}>
          <Edit3 className="h-4 w-4" />
          {labels.edit}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label={labels.actions}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => onArchive(payable)}>{labels.archive}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(payable)}>{labels.delete}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {isMobile ? (
        <div className="divide-y divide-gray-100">
          {items.map(payable => {
            const overdue = isPayableOverdue(payable);
            return (
              <div key={payable.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{payable.vendor}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {labels.dueDate}: {formatPayableDate(payable.dueDate, locale)}
                    </div>
                  </div>
                  <Badge variant={getPayableStatusVariant(payable.status, overdue)}>
                    {labels.statusLabels[overdue ? 'overdue' : payable.status] || payable.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">{labels.amount}</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(payable.amount, payable.currency, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">{labels.source}</span>
                  <span className="font-medium text-slate-700">
                    {labels.sourceLabels[payable.source] || payable.source}
                  </span>
                </div>
                {renderActions(payable)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                <th className="px-5 py-4">{labels.vendor}</th>
                <th className="px-5 py-4">{labels.dueDate}</th>
                <th className="px-5 py-4">{labels.source}</th>
                <th className="px-5 py-4">{labels.status}</th>
                <th className="px-5 py-4 text-right">{labels.amount}</th>
                <th className="px-5 py-4 text-right">{labels.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(payable => {
                const overdue = isPayableOverdue(payable);

                return (
                  <tr key={payable.id} className="align-middle">
                    <td className="px-5 py-4 font-medium text-slate-900">{payable.vendor}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatPayableDate(payable.dueDate, locale)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {labels.sourceLabels[payable.source] || payable.source}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getPayableStatusVariant(payable.status, overdue)}>
                        {labels.statusLabels[overdue ? 'overdue' : payable.status] ||
                          payable.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatMoney(payable.amount, payable.currency, locale)}
                    </td>
                    <td className="px-5 py-4">{renderActions(payable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          {fillTemplate(labels.pageShown, {
            from: safeRangeStart,
            to: rangeEnd,
            count: pagination.totalItems,
          })}
        </div>
        <AppPagination
          page={pagination.page}
          total={pagination.totalPages}
          onChange={pagination.onPageChange}
        />
      </div>
    </div>
  );
}

export default PayablesList;
