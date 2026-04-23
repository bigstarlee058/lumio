'use client';
import type { JSX } from 'react';

import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import type { useSpendOverTimeViewModel } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';
import { buildFiltersDrawerLabels } from '@/app/(main)/statements/helpers/buildFiltersDrawerLabels';

type Props = { vm: ReturnType<typeof useSpendOverTimeViewModel> };

export function SpendOverTimeFiltersDrawer({ vm }: Props): React.JSX.Element {
  const { labels, filterOptions, filterOptionLabels } = vm;
  const { typeOptions, statusOptions, datePresets, dateModes, groupByOptions, hasOptions } = filterOptions;
  const onClose = (): void => { vm.setFiltersDrawerOpen(false); vm.setFiltersDrawerScreen('root'); };
  const drawerLabels = buildFiltersDrawerLabels(labels, filterOptionLabels);
  return (
    <FiltersDrawer
      open={vm.filtersDrawerOpen}
      onClose={onClose}
      filters={vm.draftFilters}
      screen={vm.filtersDrawerScreen}
      onBack={() => vm.setFiltersDrawerScreen('root')}
      onSelect={vm.setFiltersDrawerScreen}
      onUpdateFilters={vm.updateFilter}
      onResetAll={vm.resetAllFilters}
      onViewResults={() => { vm.applyFilterChanges(); onClose(); }}
      typeOptions={typeOptions}
      statusOptions={statusOptions}
      datePresets={datePresets}
      dateModes={dateModes}
      fromOptions={vm.fromOptions}
      toOptions={vm.fromOptions}
      groupByOptions={groupByOptions}
      hasOptions={hasOptions}
      currencyOptions={vm.currencyOptions}
      labels={drawerLabels}
      activeCount={vm.activeFilterCount}
    />
  );
}
