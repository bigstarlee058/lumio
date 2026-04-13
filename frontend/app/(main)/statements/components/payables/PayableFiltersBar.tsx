'use client';

import { Input } from '@/app/components/ui/input';
import type { PayableSource, PayableStatus } from '@/app/lib/payables-api';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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

function PayableFiltersBar({ value, onChange, onReset, labels }: PayableFiltersBarProps) {
  const update = <K extends keyof PayablesFiltersState>(
    key: K,
    nextValue: PayablesFiltersState[K],
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="lumio-payable-filters">
      <div className="lumio-payable-filters__inner">
        <div className="lumio-payable-filters__search">
          <Search size={16} className="lumio-payable-filters__search-icon" />
          <Input
            value={value.search}
            onChange={event => update('search', event.target.value)}
            placeholder={labels.searchPlaceholder}
            style={{ paddingLeft: 36 }}
            aria-label={labels.searchPlaceholder}
          />
        </div>

        <div className="lumio-payable-filters__grid">
          <select
            className="lumio-payable-filters__select"
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
            className="lumio-payable-filters__select"
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
            className="lumio-payable-filters__select"
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

        <Button variant="ghost" onClick={onReset} style={{ flexShrink: 0 }}>
          <X size={16} />
          {labels.reset}
        </Button>
      </div>
      <div className="lumio-payable-filters__sort-label">
        <SlidersHorizontal size={14} />
        <span>{labels.sort}</span>
      </div>
    </div>
  );
}

export default PayableFiltersBar;
