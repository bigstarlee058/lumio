'use client';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import type { PayableSource, PayableStatus } from '@/app/lib/payables-api';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { PayablesFiltersState, PayablesSortOption } from './payables-utils';

interface PayableFiltersBarProps {
  value: PayablesFiltersState;
  onChange: (next: PayablesFiltersState) => void;
  onReset: () => void;
  labels: {
    searchPlaceholder: string;
    status: string;
    source: string;
    dueFrom: string;
    dueTo: string;
    sort: string;
    reset: string;
    allStatuses: string;
    allSources: string;
    statusOptions: Record<PayableStatus, string>;
    sourceOptions: Record<PayableSource, string>;
    sortOptions: Record<PayablesSortOption, string>;
  };
}

const selectClassName =
  'h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

export function PayableFiltersBar({ value, onChange, onReset, labels }: PayableFiltersBarProps) {
  const update = <K extends keyof PayablesFiltersState>(
    key: K,
    nextValue: PayablesFiltersState[K],
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={value.search}
            onChange={event => update('search', event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="pl-9"
            aria-label={labels.searchPlaceholder}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:items-center">
          <select
            className={selectClassName}
            value={value.status}
            onChange={event => update('status', event.target.value as PayableStatus | 'all')}
            aria-label={labels.status}
          >
            <option value="all">{labels.allStatuses}</option>
            {Object.entries(labels.statusOptions).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>

          <select
            className={selectClassName}
            value={value.source}
            onChange={event => update('source', event.target.value as PayableSource | 'all')}
            aria-label={labels.source}
          >
            <option value="all">{labels.allSources}</option>
            {Object.entries(labels.sourceOptions).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>

          <Input
            type="date"
            value={value.dueDateFrom}
            onChange={event => update('dueDateFrom', event.target.value)}
            aria-label={labels.dueFrom}
          />

          <Input
            type="date"
            value={value.dueDateTo}
            onChange={event => update('dueDateTo', event.target.value)}
            aria-label={labels.dueTo}
          />

          <select
            className={selectClassName}
            value={value.sort}
            onChange={event => update('sort', event.target.value as PayablesSortOption)}
            aria-label={labels.sort}
          >
            {Object.entries(labels.sortOptions).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>
        </div>

        <Button variant="ghost" onClick={onReset} className="shrink-0">
          <X className="h-4 w-4" />
          {labels.reset}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>{labels.sort}</span>
      </div>
    </div>
  );
}

export default PayableFiltersBar;
