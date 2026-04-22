'use client';
import type { JSX } from 'react';

import { TopCategoriesCharts } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesCharts';
import { TopCategoriesLeaderboard } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesLeaderboard';
import { TopCategoriesStatCards } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesStatCards';
import type { CategorySortKey } from '@/app/(main)/statements/components/top-categories.utils';
import type { useTopCategoriesViewModel } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';

type Props = { vm: ReturnType<typeof useTopCategoriesViewModel> };

function TopCategoriesChartsSection({ vm }: Props): JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const chartTheme = vm.resolvedTheme === 'dark' ? 'dark' : 'light';
  const { labels } = vm;
  return (
    <TopCategoriesCharts
      trendChart={vm.trendChart as object}
      sourceChart={vm.sourceChart as object}
      topCategoriesChart={vm.topCategoriesChart as object}
      chartTheme={chartTheme}
      trendTitle={isIncomeView ? labels.incomeTrend : labels.spendTrend}
      sourceSplitTitle={labels.sourceSplit}
      categoriesTitle={isIncomeView ? labels.topIncomeCategories : labels.topCategories}
    />
  );
}

function TopCategoriesLeaderboardSection({ vm }: Props): JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  const sourceLabels = { sourceBank: labels.sourceBank, sourceReceipt: labels.sourceReceipt, sourceGmailInbox: labels.sourceGmailInbox };
  const columnLabels = { category: labels.category, source: labels.source, operations: labels.operations, average: labels.average, amount: labels.amount, lastOperation: labels.lastOperation };
  const sortLabels = { sortByAmount: labels.sortByAmount, sortByAverage: labels.sortByAverage, sortByOperations: labels.sortByOperations };
  return (
    <TopCategoriesLeaderboard
      rows={vm.sortedAggregatedRows}
      sortKey={vm.sortKey as CategorySortKey}
      onSortChange={vm.setSortKey}
      onRowClick={vm.setSelectedRowId}
      title={isIncomeView ? labels.incomeLeaderboard : labels.leaderboard}
      currency={workspaceCurrency}
      sourceLabels={sourceLabels}
      sortLabels={sortLabels}
      columnLabels={columnLabels}
    />
  );
}

export function TopCategoriesContent({ vm }: Props): JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <TopCategoriesStatCards
        totals={vm.totals}
        comparison={vm.comparison}
        isIncomeView={isIncomeView}
        primaryMetricLabel={isIncomeView ? labels.totalIncome : labels.totalSpend}
        statementsLabel={labels.statementsSpend}
        receiptsLabel={labels.receiptsSpend}
        operationsLabel={labels.totalOperations}
        currency={workspaceCurrency}
        noDataLabel={labels.comparisonNoData}
        vsPreviousPeriodLabel={labels.vsPreviousPeriod}
      />
      <TopCategoriesChartsSection vm={vm} />
      <TopCategoriesLeaderboardSection vm={vm} />
    </div>
  );
}
