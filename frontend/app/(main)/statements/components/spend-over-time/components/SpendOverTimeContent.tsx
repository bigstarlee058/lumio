'use client';
import type { JSX } from 'react';

import { SpendOverTimeCharts } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeCharts';
import { SpendOverTimeLeaderboard } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeLeaderboard';
import { SpendOverTimeStatCards } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeStatCards';
import type { useSpendOverTimeViewModel } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';

type Props = { vm: ReturnType<typeof useSpendOverTimeViewModel> };

export function SpendOverTimeContent({ vm }: Props): React.JSX.Element {
  const { labels, workspaceCurrency, activeFlowType, resolvedTheme } = vm;
  const isIncomeView = activeFlowType === 'income';
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  return (
    <div className="lumio-view-page__content">
      <SpendOverTimeStatCards totals={vm.report.totals} comparison={vm.comparison} isIncomeView={isIncomeView} primaryMetricLabel={isIncomeView ? labels.totalIncome : labels.totalSpend} statementsLabel={labels.statementsAmount} receiptsLabel={labels.receiptsAmount} operationsLabel={labels.totalOperations} avgPerPeriodLabel={labels.avgPerPeriod} currency={workspaceCurrency} noDataLabel={labels.comparisonNoData} vsPreviousPeriodLabel={labels.vsPreviousPeriod} />
      <SpendOverTimeCharts trendChart={vm.trendChart as object} sourceChart={vm.sourceChart as object} periodsChart={vm.periodsChart as object} chartTheme={chartTheme} trendTitle={labels.trendTitle} sourceSplitTitle={labels.sourceSplit} periodChartTitle={labels.periodChart} />
      <SpendOverTimeLeaderboard rows={vm.rows} sortKey={vm.sortKey} onSortChange={vm.setSortKey} onRowClick={vm.setSelectedPeriod} activeFlowType={activeFlowType} title={labels.leaderboard} currency={workspaceCurrency} sortLabels={{ sortByAmount: labels.sortByAmount, sortByAverage: labels.sortByAverage, sortByOperations: labels.sortByOperations }} columnLabels={{ period: labels.period, operations: labels.operations, average: labels.average, amount: labels.amount, lastOperation: labels.lastOperation }} />
    </div>
  );
}
