'use client';

import React from 'react';
import { Input } from '@/app/components/ui/input';
import type { PayableSource, PayableStatus } from '@/app/lib/payables-api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';

const toDate = (s: string): Date | null => { if (!s) return null; const d = parseISO(s); return isValid(d) ? d : null; };
const toStr = (d: Date | null): string => (d && isValid(d) ? format(d, 'yyyy-MM-dd') : '');
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

// eslint-disable-next-line max-lines-per-function
function PayableFiltersBar({ value, onChange, onReset, labels }: PayableFiltersBarProps): React.JSX.Element {
  // eslint-disable-next-line max-params
  const update = <K extends keyof PayablesFiltersState>(
    key: K,
    nextValue: PayablesFiltersState[K],
  ): void => {
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

          <DatePicker
            label={labels.dueFrom}
            value={toDate(value.dueDateFrom)}
            onChange={(d: Date | null) => update('dueDateFrom', toStr(d))}
            slotProps={{ textField: { size: 'small' } as never }}
          />

          <DatePicker
            label={labels.dueTo}
            value={toDate(value.dueDateTo)}
            onChange={(d: Date | null) => update('dueDateTo', toStr(d))}
            slotProps={{ textField: { size: 'small' } as never }}
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
