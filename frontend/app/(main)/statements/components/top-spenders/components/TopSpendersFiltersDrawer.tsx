'use client';
import type { JSX } from 'react';

import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import type { useTopSpendersViewModel } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';
import { buildFiltersDrawerLabels } from '@/app/(main)/statements/helpers/buildFiltersDrawerLabels';

type Props = { vm: ReturnType<typeof useTopSpendersViewModel> };

export function TopSpendersFiltersDrawer({ vm }: Props): React.JSX.Element {
  const { labels, filterOptions, filterOptionLabels } = vm;
  const fs = vm.filterState;
  const onClose = (): void => { fs.setFiltersDrawerOpen(false); fs.setFiltersDrawerScreen('root'); };
  const drawerLabels = buildFiltersDrawerLabels(labels, filterOptionLabels);
  return (
    <FiltersDrawer
      open={fs.filtersDrawerOpen}
      onClose={onClose}
      filters={fs.draftFilters}
      screen={fs.filtersDrawerScreen}
      onBack={() => fs.setFiltersDrawerScreen('root')}
      onSelect={fs.setFiltersDrawerScreen}
      onUpdateFilters={fs.updateFilter}
      onResetAll={fs.resetAllFilters}
      onViewResults={() => { fs.applyFilterChanges(); onClose(); }}
      typeOptions={filterOptions.typeOptions}
      statusOptions={filterOptions.statusOptions}
      datePresets={filterOptions.datePresets}
      dateModes={filterOptions.dateModes}
      fromOptions={vm.fromOptions}
      toOptions={vm.fromOptions}
      groupByOptions={filterOptions.groupByOptions}
      hasOptions={filterOptions.hasOptions}
      currencyOptions={vm.currencyOptions}
      labels={drawerLabels}
      activeCount={fs.activeFilterCount}
    />
  );
}
