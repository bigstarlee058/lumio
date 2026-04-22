import { useSpendOverTimeAggregation, type SpendOverTimeAggregationReturn } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeAggregation';
import { useSpendOverTimeRecords, type SpendFromOption } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeRecords';
import type { UseSpendOverTimeStateReturn } from '@/app/(main)/statements/hooks/useSpendOverTimeState';
import type { SpendOverTimeGroupBy, SpendOverTimePoint, SpendOverTimeRecord } from '@/app/(main)/statements/components/spend-over-time.utils';
import { useAnalyticsData } from '@/app/(main)/statements/hooks/useAnalyticsData';
import { getRecordDate } from '@/app/lib/analytics-common';
import { useMemo } from 'react';

type WorkspaceLike = { id: string; name?: string | null };

type Params = {
  user: unknown;
  currentWorkspace: WorkspaceLike | null | undefined;
  workspaces: WorkspaceLike[];
  workspaceCurrency: string;
  resolvedTheme: string | undefined;
  labels: Record<string, string>;
  state: UseSpendOverTimeStateReturn;
  sortKey: 'amount' | 'average' | 'operations';
  selectedPeriod: string | null;
  searchInput: string;
};

export type SpendOverTimeDataReturn = SpendOverTimeAggregationReturn & {
  loading: boolean;
  flowFilteredRecords: SpendOverTimeRecord[];
  fromOptions: SpendFromOption[];
  currencyOptions: string[];
  drillDownRecords: SpendOverTimeRecord[];
  selectedPoint: SpendOverTimePoint | null;
};

const matchesPeriod = (date: Date, period: string, groupBy: SpendOverTimeGroupBy): boolean => {
  if (groupBy === 'day') return date.toISOString().split('T')[0] === period;
  if (groupBy === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    const normalized = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString().split('T')[0];
    return normalized === period;
  }
  if (groupBy === 'month') {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}` === period;
  }
  if (groupBy === 'quarter') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-Q${quarter}` === period;
  }
  return `${date.getFullYear()}` === period;
};

const filterDrillDownRecords = (period: string, groupBy: SpendOverTimeGroupBy, records: SpendOverTimeRecord[]): SpendOverTimeRecord[] =>
  records
    .filter(r => { const d = getRecordDate(r); return d ? matchesPeriod(d, period, groupBy) : false; })
    .sort((a, b) => (getRecordDate(b)?.getTime() ?? 0) - (getRecordDate(a)?.getTime() ?? 0));

export const useSpendOverTimeData = ({ user, currentWorkspace, workspaces, workspaceCurrency, resolvedTheme, labels, state, sortKey, selectedPeriod, searchInput }: Params): SpendOverTimeDataReturn => {
  const { statements: rawStatements, transactions: rawTransactions, gmailReceipts, loading } = useAnalyticsData({
    user,
    currentWorkspace,
    workspaces,
    workspaceFilter: state.workspaceFilter,
    currentWorkspaceLabel: labels.currentWorkspace,
    includeTransactions: true,
    errorToastMessage: labels.loadError,
  });
  const statements = rawStatements as unknown[];
  const transactions = rawTransactions as unknown[];
  const { flowFilteredRecords, flowRecordsWithoutDateFilter, fromOptions, currencyOptions } = useSpendOverTimeRecords({
    statements: statements as Parameters<typeof useSpendOverTimeRecords>[0]['statements'],
    transactions: transactions as Parameters<typeof useSpendOverTimeRecords>[0]['transactions'],
    gmailReceipts,
    workspaceCurrency,
    appliedFilters: state.appliedFilters,
    searchInput,
    activeFlowType: state.activeFlowType,
  });
  const { report, rows, comparison, trendChart, sourceChart, periodsChart } = useSpendOverTimeAggregation({
    flowFilteredRecords,
    flowRecordsWithoutDateFilter,
    activeFlowType: state.activeFlowType,
    groupBy: state.groupBy,
    viewType: state.viewType,
    sortKey,
    workspaceCurrency,
    resolvedTheme,
    totalIncomeLabel: labels.totalIncome,
    totalSpendLabel: labels.totalSpend,
    statementsAmountLabel: labels.statementsAmount,
    receiptsAmountLabel: labels.receiptsAmount,
  });
  const selectedPoint = useMemo(() => report.points.find(p => p.period === selectedPeriod) ?? null, [report.points, selectedPeriod]);
  const drillDownRecords = useMemo(() => selectedPoint ? filterDrillDownRecords(selectedPoint.period, state.groupBy, flowFilteredRecords) : [], [selectedPoint, state.groupBy, flowFilteredRecords]);
  return { loading, flowFilteredRecords, fromOptions, currencyOptions, report, rows, comparison, trendChart, sourceChart, periodsChart, drillDownRecords, selectedPoint };
};
