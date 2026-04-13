'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { GroupByFilterDropdown } from '@/app/(main)/statements/components/filters/GroupByFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { ViewFilterDropdown } from '@/app/(main)/statements/components/filters/ViewFilterDropdown';
import {
  type StatementFilterItem,
  type StatementFilters,
  applyStatementsFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import {
  type SpendOverTimeFlowType,
  type SpendOverTimeGroupBy,
  type SpendOverTimeRecord,
  buildSpendOverTimeReport,
  dedupeSpendOverTimeReceiptRecords,
  resolveSpendOverTimeFlow,
} from '@/app/(main)/statements/components/spend-over-time.utils';
import {
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveSourceChannel,
} from '@/app/(main)/statements/components/top-merchants.utils';
import {
  buildAnalyticsFilterLabels,
  buildAnalyticsFilterOptions,
  filterLinkClassName,
} from '@/app/(main)/statements/helpers/analytics-filter-labels';
import { useAnalyticsData } from '@/app/(main)/statements/hooks/useAnalyticsData';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import {
  formatMoney,
  getNestedValue,
  getRecordDate,
  getTransactionCurrency,
  getTransactionDate,
  resolveCurrencyCode,
  resolveLabel,
} from '@/app/lib/analytics-common';

import {
  buildSpendOverTimePeriodsChart,
  buildSpendOverTimeSourceChart,
  buildSpendOverTimeTrendChart,
} from '@/app/(main)/statements/components/spend-over-time.chart';
import {
  DEFAULT_SPEND_OVER_TIME_GROUP_BY,
  DEFAULT_SPEND_OVER_TIME_VIEW,
  useSpendOverTimeState,
} from '@/app/(main)/statements/hooks/useSpendOverTimeState';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import {
  ArrowDown,
  ArrowUp,
  ChartPie,
  ChevronDown,
  Landmark,
  Mail,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type SortKey = 'amount' | 'average' | 'operations';

const STORAGE_KEY = 'lumio-spend-over-time-filters-v2';

const getSourceLabel = (
  channel: SpendOverTimeRecord['sourceChannel'],
  labels: {
    sourceBank: string;
    sourceReceipt: string;
    sourceGmailInbox: string;
  },
) => {
  if (channel === 'gmail') return labels.sourceGmailInbox;
  if (channel === 'receipt') return labels.sourceReceipt;
  return labels.sourceBank;
};

const matchesPeriod = (date: Date, period: string, groupBy: SpendOverTimeGroupBy) => {
  if (groupBy === 'day') {
    return date.toISOString().split('T')[0] === period;
  }

  if (groupBy === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    const normalized = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .toISOString()
      .split('T')[0];
    return normalized === period;
  }

  if (groupBy === 'month') {
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
    return key === period;
  }

  if (groupBy === 'quarter') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-Q${quarter}` === period;
  }

  return `${date.getFullYear()}` === period;
};

export default function SpendOverTimeView() {
  const t = useIntlayer('statementsPage');
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const tx = (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback);

  const {
    workspaceFilter,
    setWorkspaceFilter,
    activeFlowType,
    setActiveFlowType,
    groupBy,
    draftGroupBy,
    setDraftGroupBy,
    viewType,
    draftViewType,
    setDraftViewType,
    groupByDropdownOpen,
    setGroupByDropdownOpen,
    viewDropdownOpen,
    setViewDropdownOpen,
    draftFilters,
    appliedFilters,
    setDraftFilters,
    typeDropdownOpen,
    statusDropdownOpen,
    dateDropdownOpen,
    fromDropdownOpen,
    filtersDrawerOpen,
    filtersDrawerScreen,
    activeFilterCount,
    setTypeDropdownOpen,
    setStatusDropdownOpen,
    setDateDropdownOpen,
    setFromDropdownOpen,
    setFiltersDrawerOpen,
    setFiltersDrawerScreen,
    updateFilter,
    applyFilterChanges,
    applyAndClose,
    resetAndClose,
    resetAllFilters,
  } = useSpendOverTimeState(STORAGE_KEY);

  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const { statements, transactions, gmailReceipts, loading, workspaceTargets } = useAnalyticsData({
    user,
    currentWorkspace,
    workspaces,
    workspaceFilter,
    currentWorkspaceLabel: tx(['spendOverTimeAnalytics', 'currentWorkspace'], 'Current workspace'),
    includeTransactions: true,
    errorToastMessage: tx(['loadListError'], 'Failed to load spending data'),
  });

  const labels = {
    title: tx(['spendOverTimeAnalytics', 'title'], 'Spend over time'),
    subtitle: tx(
      ['spendOverTimeAnalytics', 'subtitle'],
      'Track spend and income dynamics with the same filters and drill-down as Top merchants.',
    ),
    searchPlaceholder: tx(
      ['spendOverTimeAnalytics', 'searchPlaceholder'],
      'Search by merchant, sender or subject',
    ),
    totalSpend: tx(['spendOverTimeAnalytics', 'totalSpend'], 'Total spend'),
    totalIncome: tx(['spendOverTimeAnalytics', 'totalIncome'], 'Total income'),
    statementsAmount: tx(['spendOverTimeAnalytics', 'statementsAmount'], 'Statements'),
    receiptsAmount: tx(['spendOverTimeAnalytics', 'receiptsAmount'], 'Receipts'),
    totalOperations: tx(['spendOverTimeAnalytics', 'totalOperations'], 'Operations'),
    avgPerPeriod: tx(['spendOverTimeAnalytics', 'avgPerPeriod'], 'Average per period'),
    periodChart: tx(['spendOverTimeAnalytics', 'periodChart'], 'Top periods'),
    trendTitle: tx(['spendOverTimeAnalytics', 'trendTitle'], 'Trend'),
    sourceSplit: tx(['spendOverTimeAnalytics', 'sourceSplit'], 'Source split'),
    leaderboard: tx(['spendOverTimeAnalytics', 'leaderboard'], 'Periods leaderboard'),
    workspace: tx(['spendOverTimeAnalytics', 'workspace'], 'Workspace'),
    allWorkspaces: tx(['spendOverTimeAnalytics', 'allWorkspaces'], 'All workspaces'),
    currentWorkspace: tx(['spendOverTimeAnalytics', 'currentWorkspace'], 'Current workspace'),
    tabExpense: tx(['spendOverTimeAnalytics', 'tabExpense'], 'Expenses'),
    tabIncome: tx(['spendOverTimeAnalytics', 'tabIncome'], 'Income'),
    period: tx(['spendOverTimeAnalytics', 'period'], 'Period'),
    amount: tx(['spendOverTimeAnalytics', 'amount'], 'Amount'),
    average: tx(['spendOverTimeAnalytics', 'average'], 'Average'),
    operations: tx(['spendOverTimeAnalytics', 'operations'], 'Operations'),
    source: tx(['spendOverTimeAnalytics', 'source'], 'Source'),
    lastOperation: tx(['spendOverTimeAnalytics', 'lastOperation'], 'Last operation'),
    sortByAmount: tx(['spendOverTimeAnalytics', 'sortByAmount'], 'Amount'),
    sortByAverage: tx(['spendOverTimeAnalytics', 'sortByAverage'], 'Average'),
    sortByOperations: tx(['spendOverTimeAnalytics', 'sortByOperations'], 'Operations'),
    comparisonNoData: tx(['spendOverTimeAnalytics', 'comparisonNoData'], 'No previous period data'),
    vsPreviousPeriod: tx(['spendOverTimeAnalytics', 'vsPreviousPeriod'], 'vs previous period'),
    drillDown: tx(['spendOverTimeAnalytics', 'drillDown'], 'Drill-down'),
    noOperations: tx(['spendOverTimeAnalytics', 'noOperations'], 'No operations found'),
    sourceBank: tx(['spendOverTimeAnalytics', 'sourceBank'], 'Bank'),
    sourceReceipt: tx(['spendOverTimeAnalytics', 'sourceReceipt'], 'Receipt'),
    sourceGmailInbox: tx(['spendOverTimeAnalytics', 'sourceGmailInbox'], 'Gmail'),
    emptyStateTitle: tx(['spendOverTime', 'emptyStateTitle'], 'No data for selected period'),
    emptyStateDescription: tx(
      ['spendOverTime', 'emptyStateDescription'],
      'Upload statements or apply another filter',
    ),
    emptyStateUploadCta: tx(['spendOverTime', 'emptyStateUploadCta'], 'Go to statement upload'),
    emptyStateResetCta: tx(['spendOverTime', 'emptyStateResetCta'], 'Reset filters'),
    close: tx(['common', 'close'], 'Close'),
    filters: tx(['filters', 'filters'], 'Filters'),
    type: tx(['filters', 'type'], 'Type'),
    status: tx(['filters', 'status'], 'Status'),
    date: tx(['filters', 'date'], 'Date'),
    from: tx(['filters', 'from'], 'From'),
    apply: tx(['filters', 'apply'], 'Apply'),
    reset: tx(['filters', 'reset'], 'Reset'),
  };

  const filterOptionLabels = buildAnalyticsFilterLabels(tx);
  const {
    typeOptions,
    statusOptions,
    datePresets,
    dateModes,
    hasOptions: sharedHasOptions,
  } = buildAnalyticsFilterOptions(filterOptionLabels);

  const groupByOptions = [
    { value: 'day' as const, label: 'Day' },
    { value: 'week' as const, label: 'Week' },
    { value: 'month' as const, label: 'Month' },
    { value: 'quarter' as const, label: 'Quarter' },
    { value: 'year' as const, label: 'Year' },
  ];

  const viewOptions = [
    { value: 'line' as const, label: 'Line' },
    { value: 'bar' as const, label: 'Bar' },
    { value: 'stacked' as const, label: 'Stacked' },
  ];

  const hasOptions = sharedHasOptions;

  const allRecords = useMemo<SpendOverTimeRecord[]>(() => {
    const statementById = new Map(statements.map(statement => [statement.id, statement]));

    const mappedTransactions: SpendOverTimeRecord[] = transactions
      .map((item): SpendOverTimeRecord => {
        const statementMeta = item.statementId ? statementById.get(item.statementId) : undefined;
        const flow = resolveSpendOverTimeFlow({
          sourceType: 'statement' as const,
          debit: item.debit,
          credit: item.credit,
          amount: item.amount,
          transactionType: item.transactionType,
        });
        const currency = getTransactionCurrency(item, statementMeta, workspaceCurrency);
        const merchant = (item.counterpartyName || '').trim() || 'Unknown';
        const fileType = (statementMeta?.fileType || item.transactionType || 'expense')
          .toString()
          .toLowerCase();

        return {
          id: item.id,
          source: 'statement' as const,
          fileName: merchant,
          subject: null,
          sender: null,
          status: statementMeta?.status || null,
          fileType,
          createdAt: statementMeta?.createdAt || item.createdAt || null,
          statementDateFrom: statementMeta?.statementDateFrom || item.transactionDate || null,
          statementDateTo: statementMeta?.statementDateTo || null,
          bankName: statementMeta?.bankName || null,
          totalDebit: flow.flowType === 'expense' ? flow.amount : null,
          totalCredit: flow.flowType === 'income' ? flow.amount : null,
          currency,
          exported: statementMeta?.exported ?? null,
          paid: statementMeta?.paid ?? null,
          parsingDetails: statementMeta?.parsingDetails || null,
          user: statementMeta?.user || null,
          receivedAt: null,
          parsedData: {
            vendor: merchant,
            date: item.transactionDate || null,
          },
          sourceType: 'statement',
          sourceChannel: resolveSourceChannel({ sourceType: 'statement', fileType }),
          flowType: flow.flowType,
          amount: flow.amount,
          currencyValue: currency,
          dateValue: getTransactionDate(item, statementMeta),
          transactionId: item.id,
          workspaceId: statementMeta?.workspaceId || item.workspaceId,
          workspaceName: statementMeta?.workspaceName || item.workspaceName,
          merchant,
          paymentPurpose: item.paymentPurpose,
        };
      })
      .filter(record => record.amount > 0);

    const mappedReceipts: SpendOverTimeRecord[] = gmailReceipts
      .map((receipt): SpendOverTimeRecord => {
        const flow = resolveSpendOverTimeFlow({
          sourceType: 'gmail' as const,
          amount: receipt.parsedData?.amount ?? 0,
          transactionType: receipt.parsedData?.transactionType,
        });
        const merchant = resolveGmailMerchantLabel({
          vendor: receipt.parsedData?.vendor,
          sender: receipt.sender,
          subject: receipt.subject,
          fallback: 'Gmail receipt',
        });
        const currency = resolveCurrencyCode(receipt.parsedData?.currency, workspaceCurrency);

        return {
          id: receipt.id,
          source: 'gmail' as const,
          fileName: merchant,
          subject: receipt.subject,
          sender: receipt.sender,
          status: receipt.status,
          fileType: 'gmail',
          createdAt: receipt.receivedAt,
          statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
          statementDateTo: null,
          bankName: 'gmail',
          totalDebit: flow.flowType === 'expense' ? flow.amount : null,
          totalCredit: flow.flowType === 'income' ? flow.amount : null,
          currency,
          exported: null,
          paid: null,
          parsingDetails: null,
          user: null,
          receivedAt: receipt.receivedAt,
          parsedData: {
            vendor: merchant,
            date: receipt.parsedData?.date || receipt.receivedAt,
          },
          sourceType: 'gmail',
          sourceChannel: 'gmail',
          flowType: flow.flowType,
          amount: flow.amount,
          currencyValue: currency,
          dateValue: receipt.parsedData?.date || receipt.receivedAt,
          transactionId: receipt.transactionId ?? null,
          workspaceId: receipt.workspaceId,
          workspaceName: receipt.workspaceName,
          merchant,
          paymentPurpose: merchant,
        };
      })
      .filter(record => record.amount > 0);

    const existingTransactionIds = new Set(transactions.map(transaction => transaction.id));
    const uniqueReceipts = dedupeSpendOverTimeReceiptRecords(
      mappedReceipts,
      existingTransactionIds,
    );

    return [...mappedTransactions, ...uniqueReceipts];
  }, [transactions, gmailReceipts, statements, workspaceCurrency]);

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        bankName?: string | null;
      }
    >();

    allRecords.forEach(record => {
      if (record.user?.id && !seen.has(`user:${record.user.id}`)) {
        seen.set(`user:${record.user.id}`, {
          id: `user:${record.user.id}`,
          label: record.user.name || record.user.email || 'User',
          description: record.user.email ? `@${record.user.email.split('@')[0]}` : null,
        });
      }

      if (record.bankName && !seen.has(`bank:${record.bankName}`)) {
        seen.set(`bank:${record.bankName}`, {
          id: `bank:${record.bankName}`,
          label: record.bankName === 'gmail' ? 'Gmail' : record.bankName,
          bankName: record.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [allRecords]);

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    allRecords.forEach(record => {
      if (record.currencyValue) unique.add(record.currencyValue);
    });
    return Array.from(unique.values());
  }, [allRecords]);

  const filterBySearchQuery = (records: SpendOverTimeRecord[]) => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return records;

    return records.filter(record => {
      return (
        (record.merchant || '').toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.paymentPurpose || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
  };

  const filteredRecords = useMemo(() => {
    const filtered = applyStatementsFilters<SpendOverTimeRecord>(allRecords, appliedFilters);
    return filterBySearchQuery(filtered);
  }, [allRecords, appliedFilters, searchInput]);

  const flowFilteredRecords = useMemo(
    () => filteredRecords.filter(record => record.flowType === activeFlowType),
    [filteredRecords, activeFlowType],
  );

  const recordsWithoutDateFilter = useMemo(() => {
    const filtersWithoutDate = {
      ...appliedFilters,
      date: null,
    };
    const filtered = applyStatementsFilters<SpendOverTimeRecord>(allRecords, filtersWithoutDate);
    return filterBySearchQuery(filtered);
  }, [allRecords, appliedFilters, searchInput]);

  const flowRecordsWithoutDateFilter = useMemo(
    () => recordsWithoutDateFilter.filter(record => record.flowType === activeFlowType),
    [recordsWithoutDateFilter, activeFlowType],
  );

  const report = useMemo(
    () => buildSpendOverTimeReport(flowFilteredRecords, groupBy),
    [flowFilteredRecords, groupBy],
  );

  const rows = useMemo(() => {
    return [...report.points].sort((a, b) => {
      if (sortKey === 'average') {
        const aAvg = a.count > 0 ? (a.income + a.expense) / a.count : 0;
        const bAvg = b.count > 0 ? (b.income + b.expense) / b.count : 0;
        return bAvg - aAvg;
      }
      if (sortKey === 'operations') return b.count - a.count;
      return b.income + b.expense - (a.income + a.expense);
    });
  }, [report.points, sortKey]);

  const currentPeriodRange = useMemo(() => {
    const points = flowFilteredRecords
      .map(record => getRecordDate(record))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (points.length === 0) return null;

    return {
      start: points[0],
      end: points[points.length - 1],
    };
  }, [flowFilteredRecords]);

  const previousPeriodTotals = useMemo(() => {
    if (!currentPeriodRange) return null;
    const previousRange = buildPreviousPeriodRange(
      currentPeriodRange.start,
      currentPeriodRange.end,
    );
    if (!previousRange) return null;

    const previousRecords = flowRecordsWithoutDateFilter.filter(record => {
      const recordDate = getRecordDate(record);
      if (!recordDate) return false;
      return recordDate >= previousRange.start && recordDate <= previousRange.end;
    });

    return buildSpendOverTimeReport(previousRecords, groupBy).totals;
  }, [currentPeriodRange, flowRecordsWithoutDateFilter, groupBy]);

  const comparison = useMemo(() => {
    if (!previousPeriodTotals) return null;

    return {
      total: getComparisonDelta(
        activeFlowType === 'income' ? report.totals.income : report.totals.expense,
        activeFlowType === 'income' ? previousPeriodTotals.income : previousPeriodTotals.expense,
      ),
      statementsAmount: getComparisonDelta(
        report.totals.statementAmount,
        previousPeriodTotals.statementAmount,
      ),
      receiptsAmount: getComparisonDelta(
        report.totals.gmailAmount,
        previousPeriodTotals.gmailAmount,
      ),
      operations: getComparisonDelta(report.totals.count, previousPeriodTotals.count),
      avgPerPeriod: getComparisonDelta(
        report.totals.avgPerPeriod,
        previousPeriodTotals.avgPerPeriod,
      ),
    };
  }, [report.totals, previousPeriodTotals, activeFlowType]);

  const selectedPoint = useMemo(
    () => report.points.find(point => point.period === selectedPeriod) || null,
    [report.points, selectedPeriod],
  );

  const drillDownRecords = useMemo(() => {
    if (!selectedPoint) return [];

    return flowFilteredRecords
      .filter(record => {
        const date = getRecordDate(record);
        if (!date) return false;
        return matchesPeriod(date, selectedPoint.period, groupBy);
      })
      .sort((a, b) => {
        const aTime = getRecordDate(a)?.getTime() ?? 0;
        const bTime = getRecordDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [selectedPoint, flowFilteredRecords, groupBy]);

  const trendChart = useMemo(
    () =>
      buildSpendOverTimeTrendChart(
        report.points,
        viewType,
        activeFlowType,
        { totalIncome: labels.totalIncome, totalSpend: labels.totalSpend },
        resolvedTheme,
      ),
    [report.points, viewType, activeFlowType, labels.totalIncome, labels.totalSpend, resolvedTheme],
  );

  const sourceChart = useMemo(
    () =>
      buildSpendOverTimeSourceChart(report.totals, {
        statementsAmount: labels.statementsAmount,
        receiptsAmount: labels.receiptsAmount,
      }),
    [report.totals, labels.statementsAmount, labels.receiptsAmount],
  );

  const periodsChart = useMemo(
    () => buildSpendOverTimePeriodsChart(rows, activeFlowType, resolvedTheme),
    [rows, activeFlowType, resolvedTheme],
  );

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const formatPercentage = (value: number) => {
    const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    if (value > 0) return `+${normalized}%`;
    return `${normalized}%`;
  };

  const renderComparisonLine = (
    item: ReturnType<typeof getComparisonDelta> | null,
    isMoney = true,
  ) => {
    if (!item) {
      return <p style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>{labels.comparisonNoData}</p>;
    }

    const deltaColor =
      item.trend === 'up'
        ? '#059669'
        : item.trend === 'down'
          ? '#dc2626'
          : '#6b7280';
    const prefix = item.delta > 0 ? '+' : item.delta < 0 ? '-' : '';
    const deltaValue = isMoney
      ? formatMoney(Math.abs(item.delta), workspaceCurrency)
      : Math.abs(Math.round(item.delta)).toString();

    return (
      <p style={{ marginTop: 4, fontSize: 12, color: deltaColor }}>
        {formatPercentage(item.percentage)} ({prefix}
        {deltaValue}) {labels.vsPreviousPeriod}
      </p>
    );
  };

  const renderSourceBadge = (sourceChannel: SpendOverTimeRecord['sourceChannel']) => {
    const label = getSourceLabel(sourceChannel, {
      sourceBank: labels.sourceBank,
      sourceReceipt: labels.sourceReceipt,
      sourceGmailInbox: labels.sourceGmailInbox,
    });

    if (sourceChannel === 'gmail') {
      return (
        <span className="lumio-view-page__source-chip">
          <Mail size={14} />
          {label}
        </span>
      );
    }

    if (sourceChannel === 'receipt') {
      return (
        <span className="lumio-view-page__source-chip">
          <Receipt size={14} />
          {label}
        </span>
      );
    }

    return (
      <span className="lumio-view-page__source-chip">
        <Landmark size={14} />
        {label}
      </span>
    );
  };

  return (
    <div className="container-shared lumio-view-page">
      <div className="lumio-view-page__header">
        <div className="lumio-view-page__title-row">
          <div>
            <h1 className="lumio-view-page__title">{labels.title}</h1>
            <p className="lumio-view-page__subtitle">{labels.subtitle}</p>
          </div>
          <div className="lumio-view-page__period-tabs">
            <button
              type="button"
              className={`lumio-view-page__period-tab${activeFlowType === 'expense' ? ' lumio-view-page__period-tab--active' : ''}`}
              onClick={() => setActiveFlowType('expense')}
            >
              {labels.tabExpense}
            </button>
            <button
              type="button"
              className={`lumio-view-page__period-tab${activeFlowType === 'income' ? ' lumio-view-page__period-tab--active' : ''}`}
              onClick={() => setActiveFlowType('income')}
            >
              {labels.tabIncome}
            </button>
          </div>
        </div>

        <div className="lumio-view-page__search-filter-row">
          <div className="lumio-view-page__search">
            <Search size={16} className="lumio-view-page__search-icon" />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="lumio-view-page__search-input"
            />
          </div>
          <div>
            <label htmlFor="spend-over-time-workspace-filter" className="sr-only">
              {labels.workspace}
            </label>
            <select
              id="spend-over-time-workspace-filter"
              value={workspaceFilter}
              onChange={event => setWorkspaceFilter(event.target.value)}
              className="lumio-view-page__workspace-filter"
            >
              <option value="current">{labels.currentWorkspace}</option>
              <option value="all">{labels.allWorkspaces}</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <GroupByFilterDropdown
            open={groupByDropdownOpen}
            onOpenChange={setGroupByDropdownOpen}
            options={groupByOptions}
            value={draftGroupBy}
            onChange={value => setDraftGroupBy(value as SpendOverTimeGroupBy)}
            onApply={() => applyAndClose(() => setGroupByDropdownOpen(false))}
            onReset={() => {
              setDraftGroupBy(DEFAULT_SPEND_OVER_TIME_GROUP_BY);
              setGroupByDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                Group by: {groupByOptions.find(option => option.value === draftGroupBy)?.label}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <ViewFilterDropdown
            open={viewDropdownOpen}
            onOpenChange={setViewDropdownOpen}
            options={viewOptions}
            value={draftViewType}
            onChange={value => setDraftViewType(value as 'line' | 'bar' | 'stacked')}
            onApply={() => applyAndClose(() => setViewDropdownOpen(false))}
            onReset={() => {
              setDraftViewType(DEFAULT_SPEND_OVER_TIME_VIEW);
              setViewDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                View: {viewOptions.find(option => option.value === draftViewType)?.label}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <StatusFilterDropdown
            open={statusDropdownOpen}
            onOpenChange={setStatusDropdownOpen}
            options={statusOptions}
            values={draftFilters.statuses}
            onChange={values => updateFilter({ statuses: values })}
            onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
            onReset={() => resetAndClose('statuses', () => setStatusDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.statuses.length > 0}>
                {draftFilters.statuses.length > 0
                  ? `${labels.status} (${draftFilters.statuses.length})`
                  : labels.status}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <DateFilterDropdown
            open={dateDropdownOpen}
            onOpenChange={setDateDropdownOpen}
            presets={datePresets}
            modes={dateModes}
            value={draftFilters.date}
            onChange={value => updateFilter({ date: value })}
            onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
            onReset={() => resetAndClose('date', () => setDateDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.date)}>
                {draftFilters.date?.preset
                  ? datePresets.find(option => option.value === draftFilters.date?.preset)?.label
                  : draftFilters.date?.mode
                    ? dateModes.find(option => option.value === draftFilters.date?.mode)?.label
                    : labels.date}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <FromFilterDropdown
            open={fromDropdownOpen}
            onOpenChange={setFromDropdownOpen}
            options={fromOptions}
            values={draftFilters.from}
            onChange={values => updateFilter({ from: values })}
            onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
            onReset={() => resetAndClose('from', () => setFromDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.from.length > 0}>
                {draftFilters.from.length > 0
                  ? `${labels.from} (${draftFilters.from.length})`
                  : labels.from}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <button
            type="button"
            className={filterLinkClassName}
            onClick={() => {
              setDraftFilters(appliedFilters);
              setDraftGroupBy(groupBy);
              setDraftViewType(viewType);
              setFiltersDrawerScreen('root');
              setFiltersDrawerOpen(true);
            }}
          >
            <SlidersHorizontal size={14} />
            {labels.filters}
            {activeFilterCount > 0 ? (
              <span className="lumio-view-page__filter-badge">{activeFilterCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="lumio-view-page__body">
        {loading ? (
          <div className="lumio-view-page__loading">
            <Spinner style={{ height: 80, width: 80, color: 'var(--primary)' }} />
          </div>
        ) : flowFilteredRecords.length === 0 ? (
          <div className="lumio-view-page__empty">
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{labels.emptyStateTitle}</p>
            <p style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{labels.emptyStateDescription}</p>
            <div className="lumio-view-page__empty-actions">
              <button
                type="button"
                className="lumio-view-page__empty-cta-primary"
                onClick={() => router.push('/statements/submit')}
              >
                {labels.emptyStateUploadCta}
              </button>
              <button
                type="button"
                className="lumio-view-page__empty-cta-secondary"
                onClick={resetAllFilters}
              >
                {labels.emptyStateResetCta}
              </button>
            </div>
          </div>
        ) : (
          <div className="lumio-view-page__content">
            <div className="lumio-view-page__stat-grid">
              <div className="lumio-view-page__stat-card">
                <div className="lumio-view-page__stat-header">
                  <span className="lumio-view-page__stat-label">
                    {activeFlowType === 'income' ? labels.totalIncome : labels.totalSpend}
                  </span>
                  {activeFlowType === 'income' ? (
                    <ArrowUp size={16} color="#10b981" />
                  ) : (
                    <ArrowDown size={16} color="#ef4444" />
                  )}
                </div>
                <div
                  className="lumio-view-page__stat-value"
                  style={{ color: activeFlowType === 'income' ? '#059669' : '#dc2626' }}
                >
                  {formatMoney(
                    activeFlowType === 'income' ? report.totals.income : report.totals.expense,
                    workspaceCurrency,
                  )}
                </div>
                {renderComparisonLine(comparison?.total || null)}
              </div>

              <div className="lumio-view-page__stat-card">
                <div className="lumio-view-page__stat-header">
                  <span className="lumio-view-page__stat-label">{labels.statementsAmount}</span>
                  <ChartPie size={16} color="var(--primary)" />
                </div>
                <div className="lumio-view-page__stat-value" style={{ color: 'var(--primary)' }}>
                  {formatMoney(report.totals.statementAmount, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.statementsAmount || null)}
              </div>

              <div className="lumio-view-page__stat-card">
                <div className="lumio-view-page__stat-header">
                  <span className="lumio-view-page__stat-label">{labels.receiptsAmount}</span>
                  <Mail size={16} color="#10b981" />
                </div>
                <div className="lumio-view-page__stat-value" style={{ color: '#059669' }}>
                  {formatMoney(report.totals.gmailAmount, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.receiptsAmount || null)}
              </div>

              <div className="lumio-view-page__stat-card">
                <div className="lumio-view-page__stat-header">
                  <span className="lumio-view-page__stat-label">{labels.totalOperations}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>#</span>
                </div>
                <div className="lumio-view-page__stat-value" style={{ color: '#111827' }}>
                  {report.totals.count}
                </div>
                {renderComparisonLine(comparison?.operations || null, false)}
              </div>

              <div className="lumio-view-page__stat-card">
                <div className="lumio-view-page__stat-header">
                  <span className="lumio-view-page__stat-label">{labels.avgPerPeriod}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>AVG</span>
                </div>
                <div className="lumio-view-page__stat-value" style={{ color: '#111827' }}>
                  {formatMoney(report.totals.avgPerPeriod, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.avgPerPeriod || null)}
              </div>
            </div>

            <div className="lumio-view-page__chart-grid">
              <div className="lumio-view-page__chart-card--wide">
                <div className="lumio-view-page__chart-header">
                  <h3 className="lumio-view-page__chart-title">{labels.trendTitle}</h3>
                </div>
                <ReactECharts style={{ height: 300 }} option={trendChart} theme={chartTheme} />
              </div>
              <div className="lumio-view-page__chart-card">
                <div className="lumio-view-page__chart-header">
                  <h3 className="lumio-view-page__chart-title">{labels.sourceSplit}</h3>
                </div>
                <ReactECharts style={{ height: 300 }} option={sourceChart} theme={chartTheme} />
              </div>
            </div>

            <div className="lumio-view-page__chart-card">
              <div className="lumio-view-page__chart-header">
                <h3 className="lumio-view-page__chart-title">{labels.periodChart}</h3>
              </div>
              <ReactECharts style={{ height: 320 }} option={periodsChart} theme={chartTheme} />
            </div>

            <div className="lumio-view-page__leaderboard-card">
              <div className="lumio-view-page__leaderboard-header">
                <div className="lumio-view-page__leaderboard-title-row">
                  <h3 className="lumio-view-page__leaderboard-title">{labels.leaderboard}</h3>
                  <span className="lumio-view-page__leaderboard-count">{rows.length}</span>
                </div>
                <div className="lumio-view-page__sort-tabs">
                  <button
                    type="button"
                    className={`lumio-view-page__sort-btn${sortKey === 'amount' ? ' lumio-view-page__sort-btn--active' : ''}`}
                    onClick={() => setSortKey('amount')}
                  >
                    {labels.sortByAmount}
                  </button>
                  <button
                    type="button"
                    className={`lumio-view-page__sort-btn${sortKey === 'average' ? ' lumio-view-page__sort-btn--active' : ''}`}
                    onClick={() => setSortKey('average')}
                  >
                    {labels.sortByAverage}
                  </button>
                  <button
                    type="button"
                    className={`lumio-view-page__sort-btn${sortKey === 'operations' ? ' lumio-view-page__sort-btn--active' : ''}`}
                    onClick={() => setSortKey('operations')}
                  >
                    {labels.sortByOperations}
                  </button>
                </div>
              </div>

              <div className="lumio-view-page__table-wrap">
                <table className="lumio-view-page__table">
                  <thead>
                    <tr>
                      <th>{labels.period}</th>
                      <th style={{ textAlign: 'right' }}>{labels.operations}</th>
                      <th style={{ textAlign: 'right' }}>{labels.average}</th>
                      <th style={{ textAlign: 'right' }}>{labels.amount}</th>
                      <th style={{ textAlign: 'right' }}>{labels.lastOperation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 60).map(row => {
                      const total = activeFlowType === 'income' ? row.income : row.expense;
                      const average = row.count > 0 ? total / row.count : 0;
                      return (
                        <tr key={row.period}>
                          <td style={{ fontWeight: 500, color: '#111827' }}>
                            <button
                              type="button"
                              className="lumio-view-page__table-link"
                              onClick={() => setSelectedPeriod(row.period)}
                            >
                              {row.label}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>{row.count}</td>
                          <td style={{ textAlign: 'right' }}>
                            {formatMoney(average, workspaceCurrency)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                            {formatMoney(total, workspaceCurrency)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#6b7280' }}>{row.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => {
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={screen => setFiltersDrawerScreen(screen)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={fromOptions}
        groupByOptions={groupByOptions}
        hasOptions={hasOptions}
        currencyOptions={currencyOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          resetFilters: filterOptionLabels.resetFilters,
          general: filterOptionLabels.drawerGeneral,
          expenses: filterOptionLabels.drawerExpenses,
          reports: filterOptionLabels.drawerReports,
          type: labels.type,
          from: labels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: labels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: labels.date,
          exported: 'Exported',
          paid: 'Paid',
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      {selectedPoint ? (
        <div className="lumio-view-page__drill-backdrop">
          <div className="lumio-view-page__drill-modal">
            <div className="lumio-view-page__drill-header">
              <div>
                <h4 className="lumio-view-page__drill-title">
                  {selectedPoint.label} - {labels.drillDown}
                </h4>
                <p className="lumio-view-page__drill-subtitle">{groupBy}</p>
              </div>
              <button
                type="button"
                className="lumio-view-page__drill-close"
                onClick={() => setSelectedPeriod(null)}
                aria-label={labels.close}
              >
                <X size={16} />
              </button>
            </div>

            <div className="lumio-view-page__drill-body">
              {drillDownRecords.length === 0 ? (
                <div className="lumio-view-page__drill-empty">
                  {labels.noOperations}
                </div>
              ) : (
                <table className="lumio-view-page__table">
                  <thead>
                    <tr>
                      <th>{labels.lastOperation}</th>
                      <th>{labels.source}</th>
                      <th>{labels.workspace}</th>
                      <th>Merchant</th>
                      <th style={{ textAlign: 'right' }}>{labels.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownRecords.slice(0, 120).map(record => (
                      <tr key={record.id}>
                        <td style={{ color: '#4b5563' }}>
                          {record.dateValue && !Number.isNaN(new Date(record.dateValue).getTime())
                            ? new Date(record.dateValue).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>{renderSourceBadge(record.sourceChannel)}</td>
                        <td style={{ color: '#4b5563' }}>{record.workspaceName || '-'}</td>
                        <td style={{ color: '#4b5563' }}>
                          {record.merchant || record.sender || record.subject || '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                          {formatMoney(record.amount, workspaceCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
