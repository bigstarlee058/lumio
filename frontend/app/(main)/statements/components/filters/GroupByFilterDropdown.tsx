'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';

type GroupByFilterOption = {
  value: string;
  label: string;
};

type GroupByFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: GroupByFilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
};

export function GroupByFilterDropdown({
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
}: GroupByFilterDropdownProps) {
  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
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
