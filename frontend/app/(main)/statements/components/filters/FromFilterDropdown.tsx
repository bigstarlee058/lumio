'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';

type FromOption = {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
  iconUrl?: string | null;
  bankName?: string | null;
};

type FromFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: FromOption[];
  values: string[];
  onChange: (values: string[]) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
};

export function FromFilterDropdown({
  open,
  onOpenChange,
  options,
  values,
  onChange,
  onApply,
  onReset,
  trigger,
  applyLabel,
  resetLabel,
}: FromFilterDropdownProps) {
  const selected = new Set(values);
  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {options.map(option => {
          const isSelected = selected.has(option.id);
          return (
            <FilterOptionRow
              key={option.id}
              label={option.label}
              description={option.description}
              avatarUrl={option.avatarUrl}
              iconUrl={option.iconUrl}
              bankName={option.bankName}
              selected={isSelected}
              onClick={() => {
                if (isSelected) {
                  onChange(values.filter(item => item !== option.id));
                } else {
                  onChange([...values, option.id]);
                }
              }}
            />
          );
        })}
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
