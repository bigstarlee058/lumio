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
  buildTopSpendersBarChart,
  buildTopSpendersSourceChart,
  buildTopSpendersTrendChart,
} from '@/app/(main)/statements/components/top-spenders.chart';
import {
  type AggregateSortKey,
  type TopSpenderAggregateRow,
  type TopSpenderFlowType,
  type TopSpenderSourceChannel,
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveSourceChannel,
  resolveSpenderFlow,
  sortAggregateRows,
} from '@/app/(main)/statements/components/top-spenders.utils';
import {
  buildAnalyticsFilterLabels,
  buildAnalyticsFilterOptions,
  filterLinkClassName,
} from '@/app/(main)/statements/helpers/analytics-filter-labels';
import { useAnalyticsData } from '@/app/(main)/statements/hooks/useAnalyticsData';
import { useStatementFilters } from '@/app/(main)/statements/hooks/useStatementFilters';
import type { GmailReceipt } from '@/app/(main)/statements/types/statement-types';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import {
  formatMoney,
  getNestedValue,
  getRecordDate,
  getSourceLabel,
  resolveCurrencyCode,
  resolveLabel,
} from '@/app/lib/analytics-common';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { resolveBankLogo } from '@bank-logos';
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

type TopSpenderRecord = StatementFilterItem & {
  sourceType: 'statement' | 'gmail';
  sourceChannel: TopSpenderSourceChannel;
  flowType: TopSpenderFlowType;
  company: string;
  amount: number;
  currencyValue: string;
  dateValue: string;
  workspaceId?: string;
  workspaceName?: string;
};

const getStatementDate = (statement: StatementFilterItem) => {
  if (statement.source === 'gmail') {
    return statement.parsedData?.date || statement.receivedAt || statement.createdAt || '';
  }
  return statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
};

const getStatementCurrency = (statement: StatementFilterItem, fallbackCurrency: string) => {
  return (
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    fallbackCurrency
  );
};

const getBankDisplayName = (bankName?: string | null) => {
  const raw = (bankName || '').trim();
  if (!raw) return 'Unknown';
  if (raw.toLowerCase() === 'gmail') return 'Gmail';
  const resolved = resolveBankLogo(raw);
  if (!resolved) return raw;
  return resolved.key !== 'other' ? resolved.displayName : raw;
};

const mapGmailReceiptToStatement = (
  receipt: GmailReceipt,
  fallbackCurrency: string,
): StatementFilterItem & { workspaceId?: string; workspaceName?: string } => ({
  id: receipt.id,
  source: 'gmail',
  fileName: resolveGmailMerchantLabel({
    vendor: receipt.parsedData?.vendor,
    sender: receipt.sender,
    subject: receipt.subject,
    fallback: 'Gmail receipt',
  }),
  subject: receipt.subject,
  sender: receipt.sender,
  status: receipt.status,
  totalDebit: receipt.parsedData?.amount ?? null,
  totalCredit: null,
  exported: null,
  paid: null,
  createdAt: receipt.receivedAt,
  statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
  statementDateTo: null,
  bankName: 'gmail',
  fileType: 'gmail',
  currency: resolveCurrencyCode(receipt.parsedData?.currency, fallbackCurrency),
  user: null,
  receivedAt: receipt.receivedAt,
  parsedData: {
    vendor: receipt.parsedData?.vendor,
    date: receipt.parsedData?.date,
  },
  workspaceId: receipt.workspaceId,
  workspaceName: receipt.workspaceName,
});

export default function TopSpendersView() {
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<'current' | 'all' | string>('current');
  const [activeFlowType, setActiveFlowType] = useState<TopSpenderFlowType>('spend');
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
  } = useStatementFilters('lumio-top-spenders-filters');

  const tx = (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback);

  const {
    statements: rawStatements,
    gmailReceipts,
    loading,
    workspaceTargets,
  } = useAnalyticsData({
    user,
    currentWorkspace,
    workspaces,
    workspaceFilter,
    currentWorkspaceLabel: tx(['topSpenders', 'currentWorkspace'], 'Current workspace'),
    includeTransactions: false,
    errorToastMessage: tx(['loadListError'], 'Failed to load spending data'),
  });
  // TopSpendersView works with the richer StatementFilterItem shape; the API
  // response contains all required fields even though the hook types it as the
  // minimal StatementMeta. Workspace annotations are also present at runtime.
  const statements = rawStatements as unknown as (StatementFilterItem & {
    workspaceId?: string;
    workspaceName?: string;
  })[];

  const labels = {
    title: tx(['topSpenders', 'title'], 'Top spenders'),
    subtitle: tx(
      ['topSpenders', 'subtitle'],
      'See where money goes by receipts, statements and dates.',
    ),
    searchPlaceholder: tx(['topSpenders', 'searchPlaceholder'], 'Search company, bank or sender'),
    totalSpend: tx(['topSpenders', 'totalSpend'], 'Total spend'),
    statementsSpend: tx(['topSpenders', 'statementsSpend'], 'Statements'),
    receiptsSpend: tx(['topSpenders', 'receiptsSpend'], 'Receipts'),
    totalOperations: tx(['topSpenders', 'totalOperations'], 'Operations'),
    topCompanies: tx(['topSpenders', 'topCompanies'], 'Top companies'),
    topIncomeSenders: tx(['topSpenders', 'topIncomeSenders'], 'Top income senders'),
    sourceSplit: tx(['topSpenders', 'sourceSplit'], 'Source split'),
    spendTrend: tx(['topSpenders', 'spendTrend'], 'Spending trend'),
    incomeTrend: tx(['topSpenders', 'incomeTrend'], 'Income trend'),
    leaderboard: tx(['topSpenders', 'leaderboard'], 'Top spenders list'),
    incomeLeaderboard: tx(['topSpenders', 'incomeLeaderboard'], 'Top income senders list'),
    totalIncome: tx(['topSpenders', 'totalIncome'], 'Total income'),
    tabSpenders: tx(['topSpenders', 'tabSpenders'], 'Top spenders'),
    tabIncomeSenders: tx(['topSpenders', 'tabIncomeSenders'], 'Top income senders'),
    noData: tx(['topSpenders', 'noData'], 'No data for selected filters'),
    source: tx(['topSpenders', 'source'], 'Source'),
    company: tx(['topSpenders', 'company'], 'Company'),
    amount: tx(['topSpenders', 'amount'], 'Amount'),
    operations: tx(['topSpenders', 'operations'], 'Operations'),
    average: tx(['topSpenders', 'average'], 'Average'),
    lastOperation: tx(['topSpenders', 'lastOperation'], 'Last operation'),
    sourceStatement: tx(['topSpenders', 'sourceStatement'], 'Statement'),
    sourceGmail: tx(['topSpenders', 'sourceGmail'], 'Receipt'),
    sourceBank: tx(['topSpenders', 'sourceBank'], 'Bank'),
    sourceReceipt: tx(['topSpenders', 'sourceReceipt'], 'Receipt'),
    sourceGmailInbox: tx(['topSpenders', 'sourceGmailInbox'], 'Gmail'),
    workspace: tx(['topSpenders', 'workspace'], 'Workspace'),
    allWorkspaces: tx(['topSpenders', 'allWorkspaces'], 'All workspaces'),
    currentWorkspace: tx(['topSpenders', 'currentWorkspace'], 'Current workspace'),
    sortByAmount: tx(['topSpenders', 'sortByAmount'], 'Sort by amount'),
    sortByAverage: tx(['topSpenders', 'sortByAverage'], 'Sort by average'),
    sortByOperations: tx(['topSpenders', 'sortByOperations'], 'Sort by operations'),
    vsPreviousPeriod: tx(['topSpenders', 'vsPreviousPeriod'], 'vs previous period'),
    comparisonNoData: tx(['topSpenders', 'comparisonNoData'], 'No previous period data'),
    drillDown: tx(['topSpenders', 'drillDown'], 'Operations'),
    close: tx(['common', 'close'], 'Close'),
    noOperations: tx(['topSpenders', 'noOperations'], 'No operations found'),
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

  const allRecords = useMemo<TopSpenderRecord[]>(() => {
    const mappedStatements: TopSpenderRecord[] = statements.map(item => {
      const sourceType: 'statement' | 'gmail' = item.source === 'gmail' ? 'gmail' : 'statement';
      const company =
        sourceType === 'gmail'
          ? resolveGmailMerchantLabel({
              vendor: item.parsedData?.vendor || undefined,
              sender: item.sender || undefined,
              subject: item.subject || undefined,
              fallback: item.fileName,
            })
          : getBankDisplayName(item.bankName);

      const dateValue = getStatementDate(item);
      const flow = resolveSpenderFlow({
        sourceType,
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
      });
      const amount = flow.amount;
      const currency = getStatementCurrency(item, workspaceCurrency);
      const fileType = (item.fileType || '').toLowerCase() || null;

      return {
        id: item.id,
        source: sourceType,
        fileName: company,
        subject: item.subject || null,
        sender: item.sender || null,
        status: item.status || null,
        fileType,
        createdAt: item.createdAt || null,
        statementDateFrom: item.statementDateFrom || null,
        statementDateTo: item.statementDateTo || null,
        bankName: item.bankName || null,
        totalDebit: amount,
        totalCredit: null,
        currency,
        exported: item.exported ?? null,
        paid: item.paid ?? null,
        parsingDetails: item.parsingDetails || null,
        user: item.user || null,
        receivedAt: item.receivedAt || null,
        parsedData: {
          vendor: item.parsedData?.vendor || (sourceType === 'gmail' ? company : null),
          date: item.parsedData?.date || dateValue,
        },
        company,
        amount,
        currencyValue: currency,
        dateValue,
        sourceType,
        sourceChannel: resolveSourceChannel({ sourceType, fileType }),
        flowType: flow.flowType,
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
      };
    });

    const mappedReceipts: TopSpenderRecord[] = gmailReceipts.map(receipt => {
      const mapped = mapGmailReceiptToStatement(receipt, workspaceCurrency);
      const company = resolveGmailMerchantLabel({
        vendor: receipt.parsedData?.vendor,
        sender: receipt.sender,
        subject: receipt.subject,
        fallback: mapped.fileName,
      });
      const flow = resolveSpenderFlow({
        sourceType: 'gmail',
        totalDebit: mapped.totalDebit,
        totalCredit: mapped.totalCredit,
      });
      const amount = flow.amount;
      const dateValue = getStatementDate(mapped);
      const currency = getStatementCurrency(mapped, workspaceCurrency);

      return {
        id: mapped.id,
        source: 'gmail',
        fileName: company,
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
          vendor: receipt.parsedData?.vendor || company,
          date: receipt.parsedData?.date || mapped.receivedAt || mapped.createdAt || null,
        },
        company,
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

    const existingReceiptIds = new Set(
      mappedStatements.filter(r => r.sourceType === 'gmail').map(r => r.id),
    );
    const uniqueMappedReceipts = mappedReceipts.filter(
      receipt => !existingReceiptIds.has(receipt.id),
    );

    return [...mappedStatements, ...uniqueMappedReceipts];
  }, [statements, gmailReceipts, workspaceCurrency]);

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
          label: record.bankName === 'gmail' ? 'Gmail' : getBankDisplayName(record.bankName),
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
    const filtered = applyStatementsFilters<TopSpenderRecord>(allRecords, appliedFilters);
    const query = searchInput.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter(record => {
      return (
        record.company.toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
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
    const filtered = applyStatementsFilters<TopSpenderRecord>(allRecords, filtersWithoutDate);
    const query = searchInput.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter(record => {
      return (
        record.company.toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
  }, [allRecords, appliedFilters, searchInput]);

  const flowRecordsWithoutDateFilter = useMemo(
    () => recordsWithoutDateFilter.filter(record => record.flowType === activeFlowType),
    [recordsWithoutDateFilter, activeFlowType],
  );

  const aggregatedRows = useMemo<TopSpenderAggregateRow[]>(() => {
    const aggregate = new Map<string, TopSpenderAggregateRow>();

    flowFilteredRecords.forEach(record => {
      const normalizedCompany = (record.company || '').trim() || 'Unknown';
      const key = `${record.flowType}:${record.sourceChannel}:${normalizedCompany.toLowerCase()}`;
      const existing = aggregate.get(key);
      const date = record.dateValue || record.createdAt || '';

      if (!existing) {
        aggregate.set(key, {
          id: key,
          company: normalizedCompany,
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
    const normalizedCompany = selectedRow.company.trim().toLowerCase();
    return flowFilteredRecords
      .filter(record => {
        return (
          record.flowType === selectedRow.flowType &&
          record.sourceChannel === selectedRow.sourceChannel &&
          record.company.trim().toLowerCase() === normalizedCompany
        );
      })
      .sort((a, b) => {
        const aTime = getRecordDate(a)?.getTime() ?? 0;
        const bTime = getRecordDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [selectedRow, flowFilteredRecords]);

  const topCompaniesChart = useMemo(
    () => buildTopSpendersBarChart(sortedAggregatedRows, resolvedTheme),
    [sortedAggregatedRows, resolvedTheme],
  );

  const sourceChart = useMemo(
    () =>
      buildTopSpendersSourceChart(totals, {
        sourceStatement: labels.sourceStatement,
        sourceGmail: labels.sourceGmail,
      }),
    [totals, labels.sourceStatement, labels.sourceGmail],
  );

  const trendChart = useMemo(
    () =>
      buildTopSpendersTrendChart(
        flowFilteredRecords,
        activeFlowType,
        { totalIncome: labels.totalIncome, totalSpend: labels.totalSpend },
        resolvedTheme,
      ),
    [flowFilteredRecords, activeFlowType, labels.totalIncome, labels.totalSpend, resolvedTheme],
  );

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const isIncomeView = activeFlowType === 'income';
  const primaryMetricLabel = isIncomeView ? labels.totalIncome : labels.totalSpend;
  const trendTitle = isIncomeView ? labels.incomeTrend : labels.spendTrend;
  const companiesTitle = isIncomeView ? labels.topIncomeSenders : labels.topCompanies;
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

  const renderSourceBadge = (sourceChannel: TopSpenderSourceChannel) => {
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
      <div style={{ marginBottom: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{labels.title}</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{labels.subtitle}</p>
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', background: '#fff', padding: 4, borderRadius: 0 }}>
            <button
              type="button"
              style={{
                borderRadius: 0,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                background: activeFlowType === 'spend' ? 'var(--primary)' : 'transparent',
                color: activeFlowType === 'spend' ? '#fff' : '#4b5563',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => setActiveFlowType('spend')}
            >
              {labels.tabSpenders}
            </button>
            <button
              type="button"
              style={{
                borderRadius: 0,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                background: activeFlowType === 'income' ? 'var(--primary)' : 'transparent',
                color: activeFlowType === 'income' ? '#fff' : '#4b5563',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => setActiveFlowType('income')}
            >
              {labels.tabIncomeSenders}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="lumio-view-page__search-input"
            />
          </div>
          <div style={{ width: 240 }}>
            <label htmlFor="top-spenders-workspace-filter" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
              {labels.workspace}
            </label>
            <select
              id="top-spenders-workspace-filter"
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
              setFiltersDrawerScreen('root');
              setFiltersDrawerOpen(true);
            }}
          >
            <SlidersHorizontal size={14} />
            {labels.filters}
            {activeFilterCount > 0 ? (
              <span className="lumio-view-page__filter-badge">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="lumio-view-page__body">
        {loading ? (
          <div className="lumio-view-page__loading">
            <Spinner style={{ height: 80, width: 80, color: "var(--primary)" }} />
          </div>
        ) : flowFilteredRecords.length === 0 ? (
          <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 48, textAlign: 'center', fontSize: 14, color: '#6b7280', borderRadius: 0 }}>
            {labels.noData}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div className="lumio-view-page__stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    {primaryMetricLabel}
                  </span>
                  {isIncomeView ? (
                    <ArrowUp size={16} color="#10b981" />
                  ) : (
                    <ArrowDown size={16} color="#ef4444" />
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: isIncomeView ? '#059669' : '#dc2626' }}>
                  {formatMoney(totals.total, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.total || null)}
              </div>
              <div className="lumio-view-page__stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    {labels.statementsSpend}
                  </span>
                  <ChartPie size={16} color="var(--primary)" />
                </div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: 'var(--primary)' }}>
                  {formatMoney(totals.statementTotal, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.statementTotal || null)}
              </div>
              <div className="lumio-view-page__stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    {labels.receiptsSpend}
                  </span>
                  <ArrowUp size={16} color="#10b981" />
                </div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: '#059669' }}>
                  {formatMoney(totals.receiptTotal, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.receiptTotal || null)}
              </div>
              <div className="lumio-view-page__stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    {labels.totalOperations}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>#</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: '#111827' }}>{totals.operations}</div>
                {renderComparisonLine(comparison?.operations || null, false)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div style={{ border: '1px solid #e5e7eb', background: '#fff', padding: 20, borderRadius: 0, gridColumn: 'span 2' }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{trendTitle}</h3>
                </div>
                <ReactECharts
                  style={{ height: 300 }}
                  option={trendChart}
                  notMerge
                  lazyUpdate
                  theme={chartTheme}
                />
              </div>
              <div style={{ border: '1px solid #e5e7eb', background: '#fff', padding: 20, borderRadius: 0 }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{labels.sourceSplit}</h3>
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

            <div style={{ border: '1px solid #e5e7eb', background: '#fff', padding: 20, borderRadius: 0 }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{companiesTitle}</h3>
              </div>
              <ReactECharts
                style={{ height: 320 }}
                option={topCompaniesChart}
                notMerge
                lazyUpdate
                theme={chartTheme}
              />
            </div>

            <div style={{ border: '1px solid #e5e7eb', background: '#fff', padding: 20, borderRadius: 0 }}>
              <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{leaderboardTitle}</h3>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{sortedAggregatedRows.length}</span>
                </div>
                <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', background: '#f9fafb', padding: 4, borderRadius: 0 }}>
                  <button
                    type="button"
                    style={{ borderRadius: 0, padding: '4px 10px', fontSize: 12, fontWeight: 500, background: sortKey === 'amount' ? '#fff' : 'transparent', color: sortKey === 'amount' ? '#111827' : '#4b5563', border: 'none', cursor: 'pointer', boxShadow: sortKey === 'amount' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                    onClick={() => setSortKey('amount')}
                  >
                    {labels.sortByAmount}
                  </button>
                  <button
                    type="button"
                    style={{ borderRadius: 0, padding: '4px 10px', fontSize: 12, fontWeight: 500, background: sortKey === 'average' ? '#fff' : 'transparent', color: sortKey === 'average' ? '#111827' : '#4b5563', border: 'none', cursor: 'pointer', boxShadow: sortKey === 'average' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                    onClick={() => setSortKey('average')}
                  >
                    {labels.sortByAverage}
                  </button>
                  <button
                    type="button"
                    style={{ borderRadius: 0, padding: '4px 10px', fontSize: 12, fontWeight: 500, background: sortKey === 'operations' ? '#fff' : 'transparent', color: sortKey === 'operations' ? '#111827' : '#4b5563', border: 'none', cursor: 'pointer', boxShadow: sortKey === 'operations' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                    onClick={() => setSortKey('operations')}
                  >
                    {labels.sortByOperations}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                      <th style={{ padding: '8px 16px 8px 0' }}>{labels.company}</th>
                      <th style={{ padding: '8px 16px 8px 0' }}>{labels.source}</th>
                      <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{labels.operations}</th>
                      <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{labels.average}</th>
                      <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{labels.amount}</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>{labels.lastOperation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAggregatedRows.slice(0, 60).map(row => (
                      <tr key={row.id} style={{ color: '#374151', borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 16px 8px 0', fontWeight: 500, color: '#111827' }}>
                          <button
                            type="button"
                            style={{ textAlign: 'left', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}
                            onClick={() => setSelectedRowId(row.id)}
                          >
                            {row.company}
                          </button>
                        </td>
                        <td style={{ padding: '8px 16px 8px 0' }}>{renderSourceBadge(row.sourceChannel)}</td>
                        <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{row.count}</td>
                        <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>
                          {formatMoney(row.average, workspaceCurrency)}
                        </td>
                        <td style={{ padding: '8px 16px 8px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                          {formatMoney(row.total, workspaceCurrency)}
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#6b7280' }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', padding: 16 }}>
          <div style={{ maxHeight: '85vh', width: '100%', maxWidth: 896, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 20px' }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {selectedRow.company} - {labels.drillDown}
                </h4>
                <p style={{ fontSize: 12, color: '#6b7280' }}>
                  {renderSourceBadge(selectedRow.sourceChannel)}
                </p>
              </div>
              <button
                type="button"
                style={{ borderRadius: 0, padding: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setSelectedRowId(null)}
                aria-label={labels.close}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}>
              {drillDownRecords.length === 0 ? (
                <div style={{ border: '1px dashed #d1d5db', padding: 32, textAlign: 'center', fontSize: 14, color: '#6b7280', borderRadius: 0 }}>
                  {labels.noOperations}
                </div>
              ) : (
                <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                      <th style={{ padding: '8px 16px 8px 0' }}>{labels.lastOperation}</th>
                      <th style={{ padding: '8px 16px 8px 0' }}>{labels.source}</th>
                      <th style={{ padding: '8px 16px 8px 0' }}>{labels.workspace}</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>{labels.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownRecords.slice(0, 120).map(record => (
                      <tr key={record.id} style={{ color: '#374151', borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 16px 8px 0', color: '#4b5563' }}>
                          {record.dateValue && !Number.isNaN(new Date(record.dateValue).getTime())
                            ? new Date(record.dateValue).toLocaleDateString()
                            : '-'}
                        </td>
                        <td style={{ padding: '8px 16px 8px 0' }}>{renderSourceBadge(record.sourceChannel)}</td>
                        <td style={{ padding: '8px 16px 8px 0', color: '#4b5563' }}>{record.workspaceName || '-'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
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
