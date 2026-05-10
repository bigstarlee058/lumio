'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { ActiveRouteFilter } from './ActiveRouteFilter';

type TypeFilterOption = {
  value: string;
  label: string;
};

type TypeFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TypeFilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
  routeFilterLabel?: string | null;
  onResetRouteFilter?: () => void;
};

export function TypeFilterDropdown({
  open,
  onOpenChange,
  options,
  value,
  onChange,
  onApply,
  onReset,
  trigger,
  applyLabel,
  resetLabel,
  routeFilterLabel,
  onResetRouteFilter,
}: TypeFilterDropdownProps) {
  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
      {routeFilterLabel && onResetRouteFilter ? (
        <div style={{ marginBottom: 12 }}>
          <ActiveRouteFilter
            label={routeFilterLabel}
            resetLabel={resetLabel}
            onReset={onResetRouteFilter}
          />
        </div>
      ) : null}
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {options.map(option => (
          <FilterOptionRow
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            variant="radio"
          />
        ))}
      </div>
      <FilterActions
        onReset={onReset}
        onApply={onApply}
        applyLabel={applyLabel}
        resetLabel={resetLabel}
      />
    </FilterDropdown>
  );
}
