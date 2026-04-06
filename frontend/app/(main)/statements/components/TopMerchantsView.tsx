'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import {
  type StatementFilterItem,
  type StatementFilters,
  applyStatementsFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import {
  buildAnalyticsFilterLabels,
  buildAnalyticsFilterOptions,
  filterLinkClassName,
} from '@/app/(main)/statements/helpers/analytics-filter-labels';
import {
  type AggregateSortKey,
  type TopMerchantAggregateRow,
  type TopMerchantFlowType,
  type TopMerchantSourceChannel,
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveMerchantFlow,
  resolveSourceChannel,
  sortAggregateRows,
} from '@/app/(main)/statements/components/top-merchants.utils';
import { useAnalyticsData } from '@/app/(main)/statements/hooks/useAnalyticsData';
import { useStatementFilters } from '@/app/(main)/statements/hooks/useStatementFilters';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import {
  formatMoney,
  getNestedValue,
  getRecordDate,
  getSourceLabel,
  getTransactionCurrency,
  getTransactionDate,
  mapGmailReceiptToStatement,
  resolveCurrencyCode,
  resolveLabel,
} from '@/app/lib/analytics-common';
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
import { useEffect, useMemo, useState } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type MerchantRecord = StatementFilterItem & {
  sourceType: 'statement' | 'gmail';
  sourceChannel: TopMerchantSourceChannel;
  flowType: TopMerchantFlowType;
  merchant: string;
  amount: number;
  currencyValue: string;
  dateValue: string;
  paymentPurpose?: string | null;
  workspaceId?: string;
  workspaceName?: string;
};

const getMerchantDisplayName = (counterpartyName?: string | null) => {
  const raw = (counterpartyName || '').trim();
  if (!raw) return 'Unknown';
  return raw;
};

export default function TopMerchantsView() {
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<'current' | 'all' | string>('current');
  const [activeFlowType, setActiveFlowType] = useState<TopMerchantFlowType>('spend');
  const [sortKey, setSortKey] = useState<AggregateSortKey>('amount');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const {
    draftFilters,
    appliedFilters,
    filtersDrawerScreen,
    typeDropdownOpen,
    statusDropdownOpen,
    dateDropdownOpen,
    fromDropdownOpen,
    filtersDrawerOpen,
    activeFilterCount,
    setFiltersDrawerScreen,
    setTypeDropdownOpen,
    setStatusDropdownOpen,
    setDateDropdownOpen,
    setFromDropdownOpen,
    setFiltersDrawerOpen,
    setDraftFilters,
    updateFilter,
    applyFilterChanges,
    applyAndClose,
    resetAndClose,
    resetAllFilters,
  } = useStatementFilters('lumio-top-merchants-filters');
  const tx = (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback);

  const { statements, transactions, gmailReceipts, loading, workspaceTargets } = useAnalyticsData({
    user,
    currentWorkspace,
    workspaces,
    workspaceFilter,
    currentWorkspaceLabel: tx(['topMerchants', 'currentWorkspace'], 'Current workspace'),
    includeTransactions: true,
    errorToastMessage: tx(['loadListError'], 'Failed to load spending data'),
  });

  const labels = {
    title: tx(['topMerchants', 'title'], 'Top merchants'),
    subtitle: tx(
      ['topMerchants', 'subtitle'],
      'Spending analytics by merchants and counterparties with Submit filters.',
    ),
    searchPlaceholder: tx(
      ['topMerchants', 'searchPlaceholder'],
      'Search by merchant, sender or subject',
    ),
    totalSpend: tx(['topMerchants', 'totalSpend'], 'Total spend'),
    statementsSpend: tx(['topMerchants', 'statementsSpend'], 'Statements'),
    receiptsSpend: tx(['topMerchants', 'receiptsSpend'], 'Receipts'),
    totalOperations: tx(['topMerchants', 'totalOperations'], 'Operations'),
    topMerchants: tx(['topMerchants', 'topMerchants'], 'Top merchants'),
    topIncomeSenders: tx(['topMerchants', 'topIncomeSenders'], 'Top income senders'),
    sourceSplit: tx(['topMerchants', 'sourceSplit'], 'Source split'),
    spendTrend: tx(['topMerchants', 'spendTrend'], 'Spending trend'),
    incomeTrend: tx(['topMerchants', 'incomeTrend'], 'Income trend'),
    leaderboard: tx(['topMerchants', 'leaderboard'], 'Top merchants list'),
    incomeLeaderboard: tx(['topMerchants', 'incomeLeaderboard'], 'Top income senders list'),
    totalIncome: tx(['topMerchants', 'totalIncome'], 'Total income'),
    tabSpenders: tx(['topMerchants', 'tabSpenders'], 'Top merchants'),
    tabIncomeSenders: tx(['topMerchants', 'tabIncomeSenders'], 'Top income senders'),
    noData: tx(['topMerchants', 'noData'], 'No data for selected filters'),
    source: tx(['topMerchants', 'source'], 'Source'),
    merchant: tx(['topMerchants', 'merchant'], 'Merchant'),
    amount: tx(['topMerchants', 'amount'], 'Amount'),
    operations: tx(['topMerchants', 'operations'], 'Operations'),
    average: tx(['topMerchants', 'average'], 'Average'),
    lastOperation: tx(['topMerchants', 'lastOperation'], 'Last operation'),
    sourceStatement: tx(['topMerchants', 'sourceStatement'], 'Statement'),
    sourceGmail: tx(['topMerchants', 'sourceGmail'], 'Receipt'),
    sourceBank: tx(['topMerchants', 'sourceBank'], 'Bank'),
    sourceReceipt: tx(['topMerchants', 'sourceReceipt'], 'Receipt'),
    sourceGmailInbox: tx(['topMerchants', 'sourceGmailInbox'], 'Gmail'),
    workspace: tx(['topMerchants', 'workspace'], 'Workspace'),
    allWorkspaces: tx(['topMerchants', 'allWorkspaces'], 'All workspaces'),
    currentWorkspace: tx(['topMerchants', 'currentWorkspace'], 'Current workspace'),
    sortByAmount: tx(['topMerchants', 'sortByAmount'], 'Sort by amount'),
    sortByAverage: tx(['topMerchants', 'sortByAverage'], 'Sort by average'),
    sortByOperations: tx(['topMerchants', 'sortByOperations'], 'Sort by operations'),
    vsPreviousPeriod: tx(['topMerchants', 'vsPreviousPeriod'], 'vs previous period'),
    comparisonNoData: tx(['topMerchants', 'comparisonNoData'], 'No previous period data'),
    drillDown: tx(['topMerchants', 'drillDown'], 'Drill-down'),
    close: tx(['common', 'close'], 'Close'),
    noOperations: tx(['topMerchants', 'noOperations'], 'No operations found'),
    filters: tx(['filters', 'filters'], 'Filters'),
    type: tx(['filters', 'type'], 'Type'),
    status: tx(['filters', 'status'], 'Status'),
    date: tx(['filters', 'date'], 'Date'),
    from: tx(['filters', 'from'], 'From'),
    apply: tx(['filters', 'apply'], 'Apply'),
    reset: tx(['filters', 'reset'], 'Reset'),
  };

  const filterOptionLabels = buildAnalyticsFilterLabels(tx);
  const { typeOptions, statusOptions, datePresets, dateModes, groupByOptions, hasOptions } =
    buildAnalyticsFilterOptions(filterOptionLabels);

  const allRecords = useMemo<MerchantRecord[]>(() => {
    const statementById = new Map(statements.map(statement => [statement.id, statement]));

    const mappedTransactions: MerchantRecord[] = transactions.map(item => {
      const statementMeta = item.statementId ? statementById.get(item.statementId) : undefined;
      const merchant = getMerchantDisplayName(item.counterpartyName);
      const flow = resolveMerchantFlow({
        sourceType: 'statement',
        debit: item.debit,
        credit: item.credit,
        amount: item.amount,
        transactionType: item.transactionType,
      });
      const amount = flow.amount;
      const dateValue = getTransactionDate(item, statementMeta);
      const currency = getTransactionCurrency(item, statementMeta, workspaceCurrency);
      const fileType = (statementMeta?.fileType || item.transactionType || 'expense')
        .toString()
        .toLowerCase();

      return {
        id: item.id,
        source: 'statement',
        fileName: merchant,
        subject: null,
        sender: null,
        status: statementMeta?.status || null,
        fileType,
        createdAt: statementMeta?.createdAt || item.createdAt || null,
        statementDateFrom: statementMeta?.statementDateFrom || item.transactionDate || null,
        statementDateTo: statementMeta?.statementDateTo || null,
        bankName: statementMeta?.bankName || null,
        totalDebit: amount,
        totalCredit: null,
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
        merchant,
        amount,
        currencyValue: currency,
        dateValue,
        paymentPurpose: item.paymentPurpose,
        sourceType: 'statement',
        sourceChannel: resolveSourceChannel({ sourceType: 'statement', fileType }),
        flowType: flow.flowType,
        workspaceId: statementMeta?.workspaceId || item.workspaceId,
        workspaceName: statementMeta?.workspaceName || item.workspaceName,
      };
    });

    const mappedReceipts: MerchantRecord[] = gmailReceipts.map(receipt => {
      const mapped = mapGmailReceiptToStatement(receipt, workspaceCurrency);
      const merchant = resolveGmailMerchantLabel({
        vendor: receipt.parsedData?.vendor,
        sender: receipt.sender,
        subject: receipt.subject,
        fallback: mapped.fileName,
      });
      const flow = resolveMerchantFlow({
        sourceType: 'gmail',
        amount: receipt.parsedData?.amount ?? 0,
      });
      const amount = flow.amount;
      const dateValue = receipt.parsedData?.date || receipt.receivedAt || '';
      const currency = resolveCurrencyCode(receipt.parsedData?.currency, workspaceCurrency);

      return {
        id: mapped.id,
        source: 'gmail',
        fileName: merchant,
        subject: mapped.subject || null,
        sender: mapped.sender || null,
        status: mapped.status || null,
        fileType: 'gmail',
        createdAt: mapped.createdAt || null,
        statementDateFrom: mapped.statementDateFrom || null,
        statementDateTo: mapped.statementDateTo || null,
        bankName: 'gmail',
        totalDebit: amount,
        totalCredit: null,
        currency,
        exported: null,
        paid: null,
        parsingDetails: null,
        user: null,
        receivedAt: mapped.receivedAt || null,
        parsedData: {
          vendor: receipt.parsedData?.vendor || merchant,
          date: receipt.parsedData?.date || mapped.receivedAt || mapped.createdAt || null,
        },
        merchant,
        amount,
        currencyValue: currency,
        dateValue,
        sourceType: 'gmail',
        sourceChannel: resolveSourceChannel({ sourceType: 'gmail', fileType: 'gmail' }),
        flowType: flow.flowType,
        workspaceId: receipt.workspaceId,
        workspaceName: receipt.workspaceName,
      };
    });

    const existingStatementIds = new Set(
      transactions
        .map(transaction => transaction.statementId)
        .filter((statementId): statementId is string => Boolean(statementId)),
    );

    const uniqueMappedReceipts = mappedReceipts.filter(
      receipt => !existingStatementIds.has(receipt.id),
    );

    return [...mappedTransactions, ...uniqueMappedReceipts];
  }, [transactions, gmailReceipts, statements, workspaceCurrency]);

  useEffect(() => {
    setSelectedRowId(null);
  }, [activeFlowType, workspaceFilter]);

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

    const addOption = (
      id: string,
      option: {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        bankName?: string | null;
      },
    ) => {
      if (!seen.has(id)) {
        seen.set(id, option);
      }
    };

    allRecords.forEach(record => {
      if (record.user?.id) {
        addOption(`user:${record.user.id}`, {
          id: `user:${record.user.id}`,
          label: record.user.name || record.user.email || 'User',
          description: record.user.email ? `@${record.user.email.split('@')[0]}` : null,
        });
      }

      if (record.bankName) {
        addOption(`bank:${record.bankName}`, {
          id: `bank:${record.bankName}`,
          label: record.bankName === 'gmail' ? 'Gmail' : record.bankName,
          description: null,
          bankName: record.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [allRecords]);

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    allRecords.forEach(record => {
      if (record.currencyValue) {
        unique.add(record.currencyValue);
      }
    });
    return Array.from(unique.values());
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    const filtered = applyStatementsFilters<MerchantRecord>(allRecords, appliedFilters);
    const query = searchInput.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter(record => {
      return (
        record.merchant.toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.paymentPurpose || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
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
    const filtered = applyStatementsFilters<MerchantRecord>(allRecords, filtersWithoutDate);
    const query = searchInput.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter(record => {
      return (
        record.merchant.toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.paymentPurpose || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
  }, [allRecords, appliedFilters, searchInput]);

  const flowRecordsWithoutDateFilter = useMemo(
    () => recordsWithoutDateFilter.filter(record => record.flowType === activeFlowType),
    [recordsWithoutDateFilter, activeFlowType],
  );

  const aggregatedRows = useMemo<TopMerchantAggregateRow[]>(() => {
    const aggregate = new Map<string, TopMerchantAggregateRow>();

    flowFilteredRecords.forEach(record => {
      const normalizedMerchant = (record.merchant || '').trim() || 'Unknown';
      const key = `${record.flowType}:${record.sourceChannel}:${normalizedMerchant.toLowerCase()}`;
      const existing = aggregate.get(key);
      const date = record.dateValue || record.createdAt || '';

      if (!existing) {
        aggregate.set(key, {
          id: key,
          merchant: normalizedMerchant,
          sourceType: record.sourceType,
          sourceChannel: record.sourceChannel,
          flowType: record.flowType,
          count: 1,
          total: record.amount,
          average: record.amount,
          lastDate: date,
          currency: resolveCurrencyCode(record.currencyValue, workspaceCurrency),
        });
        return;
      }

      existing.count += 1;
      existing.total += record.amount;
      existing.average = existing.total / existing.count;
      existing.lastDate =
        new Date(date).getTime() > new Date(existing.lastDate || 0).getTime()
          ? date
          : existing.lastDate;
    });

    return Array.from(aggregate.values());
  }, [flowFilteredRecords, workspaceCurrency]);

  const sortedAggregatedRows = useMemo(
    () => sortAggregateRows(aggregatedRows, sortKey),
    [aggregatedRows, sortKey],
  );

  const totals = useMemo(() => {
    const statementTotal = flowFilteredRecords
      .filter(record => record.sourceType === 'statement')
      .reduce((sum, record) => sum + record.amount, 0);
    const receiptTotal = flowFilteredRecords
      .filter(record => record.sourceType === 'gmail')
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      total: statementTotal + receiptTotal,
      statementTotal,
      receiptTotal,
      operations: flowFilteredRecords.length,
    };
  }, [flowFilteredRecords]);

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

    const statementTotal = previousRecords
      .filter(record => record.sourceType === 'statement')
      .reduce((sum, record) => sum + record.amount, 0);
    const receiptTotal = previousRecords
      .filter(record => record.sourceType === 'gmail')
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      total: statementTotal + receiptTotal,
      statementTotal,
      receiptTotal,
      operations: previousRecords.length,
    };
  }, [currentPeriodRange, flowRecordsWithoutDateFilter]);

  const comparison = useMemo(() => {
    if (!previousPeriodTotals) return null;

    return {
      total: getComparisonDelta(totals.total, previousPeriodTotals.total),
      statementTotal: getComparisonDelta(
        totals.statementTotal,
        previousPeriodTotals.statementTotal,
      ),
      receiptTotal: getComparisonDelta(totals.receiptTotal, previousPeriodTotals.receiptTotal),
      operations: getComparisonDelta(totals.operations, previousPeriodTotals.operations),
    };
  }, [totals, previousPeriodTotals]);

  const selectedRow = useMemo(
    () => sortedAggregatedRows.find(row => row.id === selectedRowId) || null,
    [sortedAggregatedRows, selectedRowId],
  );

  const drillDownRecords = useMemo(() => {
    if (!selectedRow) return [];
    const normalizedMerchant = selectedRow.merchant.trim().toLowerCase();

    return flowFilteredRecords
      .filter(record => {
        return (
          record.flowType === selectedRow.flowType &&
          record.sourceChannel === selectedRow.sourceChannel &&
          record.merchant.trim().toLowerCase() === normalizedMerchant
        );
      })
      .sort((a, b) => {
        const aTime = getRecordDate(a)?.getTime() ?? 0;
        const bTime = getRecordDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [selectedRow, flowFilteredRecords]);

  const topMerchantsChart = useMemo(() => {
    const top = sortedAggregatedRows.slice(0, 12).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: top.map(item => item.merchant),
      },
      series: [
        {
          type: 'bar',
          data: top.map(item => Number(item.total.toFixed(2))),
          itemStyle: {
            color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9',
            borderRadius: [4, 4, 4, 4],
          },
        },
      ],
    };
  }, [sortedAggregatedRows, resolvedTheme]);

  const sourceChart = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          type: 'pie',
          radius: ['35%', '72%'],
          data: [
            { name: labels.sourceStatement, value: Number(totals.statementTotal.toFixed(2)) },
            { name: labels.sourceGmail, value: Number(totals.receiptTotal.toFixed(2)) },
          ],
        },
      ],
    };
  }, [labels.sourceGmail, labels.sourceStatement, totals.receiptTotal, totals.statementTotal]);

  const trendChart = useMemo(() => {
    const points = new Map<string, number>();
    flowFilteredRecords.forEach(record => {
      const rawDate = record.dateValue || record.createdAt || '';
      if (!rawDate) return;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return;
      const dateKey = parsed.toISOString().split('T')[0];
      points.set(dateKey, (points.get(dateKey) || 0) + record.amount);
    });

    const sorted = Array.from(points.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: sorted.map(point => point.date) },
      yAxis: { type: 'value' },
      series: [
        {
          name: activeFlowType === 'income' ? labels.totalIncome : labels.totalSpend,
          type: 'line',
          smooth: true,
          data: sorted.map(point => Number(point.amount.toFixed(2))),
          areaStyle: {
            color: resolvedTheme === 'dark' ? 'rgba(56,189,248,0.16)' : 'rgba(14,165,233,0.14)',
          },
          lineStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
          itemStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
        },
      ],
    };
  }, [flowFilteredRecords, activeFlowType, labels.totalIncome, labels.totalSpend, resolvedTheme]);

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const isIncomeView = activeFlowType === 'income';
  const primaryMetricLabel = isIncomeView ? labels.totalIncome : labels.totalSpend;
  const trendTitle = isIncomeView ? labels.incomeTrend : labels.spendTrend;
  const merchantsTitle = isIncomeView ? labels.topIncomeSenders : labels.topMerchants;
  const leaderboardTitle = isIncomeView ? labels.incomeLeaderboard : labels.leaderboard;

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
      return <p className="mt-1 text-xs text-gray-400">{labels.comparisonNoData}</p>;
    }

    const deltaColor =
      item.trend === 'up'
        ? 'text-emerald-600'
        : item.trend === 'down'
          ? 'text-red-600'
          : 'text-gray-500';
    const prefix = item.delta > 0 ? '+' : item.delta < 0 ? '-' : '';
    const deltaValue = isMoney
      ? formatMoney(Math.abs(item.delta), workspaceCurrency)
      : Math.abs(Math.round(item.delta)).toString();

    return (
      <p className={`mt-1 text-xs ${deltaColor}`}>
        {formatPercentage(item.percentage)} ({prefix}
        {deltaValue}) {labels.vsPreviousPeriod}
      </p>
    );
  };

  const renderSourceBadge = (sourceChannel: TopMerchantSourceChannel) => {
    const label = getSourceLabel(sourceChannel, {
      sourceBank: labels.sourceBank,
      sourceReceipt: labels.sourceReceipt,
      sourceGmailInbox: labels.sourceGmailInbox,
    });

    if (sourceChannel === 'gmail') {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Mail className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    }

    if (sourceChannel === 'receipt') {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Receipt className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-gray-600">
        <Landmark className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{labels.title}</h1>
            <p className="text-sm text-gray-500">{labels.subtitle}</p>
          </div>
          <div className="inline-flex rounded-md border border-gray-200 bg-white p-1">
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeFlowType === 'spend'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setActiveFlowType('spend')}
            >
              {labels.tabSpenders}
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeFlowType === 'income'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setActiveFlowType('income')}
            >
              {labels.tabIncomeSenders}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="sm:w-60">
            <label htmlFor="top-merchants-workspace-filter" className="sr-only">
              {labels.workspace}
            </label>
            <select
              id="top-merchants-workspace-filter"
              value={workspaceFilter}
              onChange={event => setWorkspaceFilter(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
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

        <div className="flex flex-wrap items-center gap-2">
          <TypeFilterDropdown
            open={typeDropdownOpen}
            onOpenChange={setTypeDropdownOpen}
            options={typeOptions}
            value={draftFilters.type}
            onChange={value => updateFilter({ type: value })}
            onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
            onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.type)}>
                {draftFilters.type
                  ? typeOptions.find(option => option.value === draftFilters.type)?.label ||
                    labels.type
                  : labels.type}
                <ChevronDown className="h-3.5 w-3.5" />
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
                <ChevronDown className="h-3.5 w-3.5" />
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
                <ChevronDown className="h-3.5 w-3.5" />
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
                <ChevronDown className="h-3.5 w-3.5" />
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
              setFiltersDrawerScreen('root');
              setFiltersDrawerOpen(true);
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {labels.filters}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-20 w-20 text-primary" />
          </div>
        ) : flowFilteredRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            {labels.noData}
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {primaryMetricLabel}
                  </span>
                  {isIncomeView ? (
                    <ArrowUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div
                  className={`mt-2 text-lg font-semibold ${
                    isIncomeView ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatMoney(totals.total, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.total || null)}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.statementsSpend}
                  </span>
                  <ChartPie className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-lg font-semibold text-primary">
                  {formatMoney(totals.statementTotal, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.statementTotal || null)}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.receiptsSpend}
                  </span>
                  <ArrowUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-600">
                  {formatMoney(totals.receiptTotal, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.receiptTotal || null)}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.totalOperations}
                  </span>
                  <span className="text-xs font-medium text-gray-500">#</span>
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">{totals.operations}</div>
                {renderComparisonLine(comparison?.operations || null, false)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{trendTitle}</h3>
                </div>
                <ReactECharts
                  style={{ height: 300 }}
                  option={trendChart}
                  notMerge
                  lazyUpdate
                  theme={chartTheme}
                />
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.sourceSplit}</h3>
                </div>
                <ReactECharts
                  style={{ height: 300 }}
                  option={sourceChart}
                  notMerge
                  lazyUpdate
                  theme={chartTheme}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{merchantsTitle}</h3>
              </div>
              <ReactECharts
                style={{ height: 320 }}
                option={topMerchantsChart}
                notMerge
                lazyUpdate
                theme={chartTheme}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{leaderboardTitle}</h3>
                  <span className="text-xs text-gray-500">{sortedAggregatedRows.length}</span>
                </div>
                <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'amount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('amount')}
                  >
                    {labels.sortByAmount}
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'average' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('average')}
                  >
                    {labels.sortByAverage}
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'operations'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('operations')}
                  >
                    {labels.sortByOperations}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-slate-700/60">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">{labels.merchant}</th>
                      <th className="py-2 pr-4">{labels.source}</th>
                      <th className="py-2 pr-4 text-right">{labels.operations}</th>
                      <th className="py-2 pr-4 text-right">{labels.average}</th>
                      <th className="py-2 pr-4 text-right">{labels.amount}</th>
                      <th className="py-2 text-right">{labels.lastOperation}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {sortedAggregatedRows.slice(0, 60).map(row => (
                      <tr key={row.id} className="text-gray-700">
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          <button
                            type="button"
                            className="text-left text-primary hover:underline"
                            onClick={() => setSelectedRowId(row.id)}
                          >
                            {row.merchant}
                          </button>
                        </td>
                        <td className="py-2 pr-4">{renderSourceBadge(row.sourceChannel)}</td>
                        <td className="py-2 pr-4 text-right">{row.count}</td>
                        <td className="py-2 pr-4 text-right">
                          {formatMoney(row.average, workspaceCurrency)}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900">
                          {formatMoney(row.total, workspaceCurrency)}
                        </td>
                        <td className="py-2 text-right text-gray-500">
                          {row.lastDate && !Number.isNaN(new Date(row.lastDate).getTime())
                            ? new Date(row.lastDate).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
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

      {selectedRow ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {selectedRow.merchant} - {labels.drillDown}
                </h4>
                <p className="text-xs text-gray-500">
                  {renderSourceBadge(selectedRow.sourceChannel)}
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setSelectedRowId(null)}
                aria-label={labels.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
              {drillDownRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  {labels.noOperations}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-slate-700/60">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">{labels.lastOperation}</th>
                      <th className="py-2 pr-4">{labels.source}</th>
                      <th className="py-2 pr-4">{labels.workspace}</th>
                      <th className="py-2 text-right">{labels.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {drillDownRecords.slice(0, 120).map(record => (
                      <tr key={record.id} className="text-gray-700">
                        <td className="py-2 pr-4 text-gray-600">
                          {record.dateValue && !Number.isNaN(new Date(record.dateValue).getTime())
                            ? new Date(record.dateValue).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="py-2 pr-4">{renderSourceBadge(record.sourceChannel)}</td>
                        <td className="py-2 pr-4 text-gray-600">{record.workspaceName || '-'}</td>
                        <td className="py-2 text-right font-medium text-gray-900">
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
