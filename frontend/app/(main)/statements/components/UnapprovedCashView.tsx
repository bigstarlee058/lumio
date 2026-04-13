'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseISO, isValid as isValidDate, format as formatDate } from 'date-fns';
import { Check, RefreshCcw, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DEFAULT_UNAPPROVED_QUEUE_FILTERS,
  type UnapprovedQueueFilterTarget,
  type UnapprovedQueueFilters,
  type UnapprovedQueueTransaction,
  type UnapprovedReasonId,
  type UnapprovedSource,
  type UnapprovedStatementMeta,
  type UnapprovedStatementQueueItem,
  buildUnapprovedStatementQueue,
  matchesUnapprovedFilters,
} from './unapproved-cash-utils';

type StatementApiItem = {
  id: string;
  fileName?: string | null;
  bankName?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  fileType?: string | null;
  currency?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  createdAt?: string | null;
  parsingDetails?: {
    importPreview?: {
      source?: string | null;
    } | null;
  } | null;
};

const IGNORED_STORAGE_KEY = 'lumio-unapproved-cash-ignored';

type BadgeStyle = { borderColor: string; background: string; color: string };

const REASON_BADGE_STYLE: Record<UnapprovedReasonId, BadgeStyle> = {
  'missing-category': { borderColor: '#fcd34d', background: '#fffbeb', color: '#b45309' },
  'duplicate-detected': { borderColor: '#fca5a5', background: '#fff1f2', color: '#b91c1c' },
  'unknown-merchant': { borderColor: '#e2e8f0', background: '#f1f5f9', color: '#334155' },
  'missing-type': { borderColor: '#93c5fd', background: '#eff6ff', color: '#1d4ed8' },
  'missing-currency': { borderColor: '#67e8f9', background: '#ecfeff', color: '#0e7490' },
  'ocr-issues': { borderColor: '#fda4af', background: '#fff1f2', color: '#be123c' },
  'requires-confirmation': { borderColor: '#e5e7eb', background: '#f3f4f6', color: '#374151' },
};

const SOURCE_BADGE_STYLE: Record<UnapprovedSource, BadgeStyle> = {
  gmail: { borderColor: '#fdba74', background: '#fff7ed', color: '#c2410c' },
  pdf: { borderColor: '#7dd3fc', background: '#f0f9ff', color: '#0369a1' },
  bank: { borderColor: '#6ee7b7', background: '#ecfdf5', color: '#065f46' },
  manual: { borderColor: '#a5b4fc', background: '#eef2ff', color: '#3730a3' },
  unknown: { borderColor: '#e5e7eb', background: '#f3f4f6', color: '#374151' },
};

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );

const extractErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;

  const payload = error as {
    response?: {
      data?: {
        message?: string | string[];
        error?: string;
      };
    };
    message?: string;
  };

  const dataMessage = payload.response?.data?.message;
  if (Array.isArray(dataMessage)) {
    return dataMessage.filter(Boolean).join(', ');
  }

  if (typeof dataMessage === 'string' && dataMessage.trim()) {
    return dataMessage;
  }

  if (typeof payload.response?.data?.error === 'string' && payload.response.data.error.trim()) {
    return payload.response.data.error;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return null;
};

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeToDateString = (value?: string | null) => {
  if (!value) return null;
  if (DATE_VALUE_REGEX.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toCalendarDate = (value?: string | null): Date | null => {
  const normalized = normalizeToDateString(value);
  if (!normalized) return null;

  try {
    const parsed = parseISO(normalized);
    return isValidDate(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const toFilterDateValue = (date: Date | null) => (date && isValidDate(date) ? formatDate(date, 'yyyy-MM-dd') : '');

const fetchAllTransactions = async (): Promise<UnapprovedQueueTransaction[]> => {
  const allTransactions: UnapprovedQueueTransaction[] = [];
  const pageSize = 500;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (allTransactions.length < total) {
    const response = await apiClient.get('/transactions', {
      params: {
        page,
        limit: pageSize,
      },
    });

    const payload = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];

    allTransactions.push(...payload);
    total = Number(response.data?.total ?? allTransactions.length);

    if (payload.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allTransactions;
};

const fetchAllStatements = async (): Promise<StatementApiItem[]> => {
  const allStatements: StatementApiItem[] = [];
  const pageSize = 500;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (allStatements.length < total) {
    const response = await apiClient.get('/statements', {
      params: {
        page,
        limit: pageSize,
      },
    });

    const payload = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];

    allStatements.push(...payload);
    total = Number(response.data?.total ?? allStatements.length);

    if (payload.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allStatements;
};

const toStatementMeta = (statement: StatementApiItem): UnapprovedStatementMeta => ({
  id: statement.id,
  fileName: statement.fileName,
  bankName: statement.bankName,
  status: statement.status,
  errorMessage: statement.errorMessage,
  fileType: statement.fileType,
  currency: statement.currency,
  totalDebit: statement.totalDebit,
  totalCredit: statement.totalCredit,
  statementDateFrom: statement.statementDateFrom,
  statementDateTo: statement.statementDateTo,
  createdAt: statement.createdAt,
  sourceHint: statement.parsingDetails?.importPreview?.source ?? null,
});

const sortByNewestDate = (
  left: UnapprovedQueueFilterTarget,
  right: UnapprovedQueueFilterTarget,
) => {
  const leftTime = left.date?.getTime() ?? 0;
  const rightTime = right.date?.getTime() ?? 0;
  return rightTime - leftTime;
};

export default function UnapprovedCashView() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const t = useIntlayer('statementsPage');
  const workspaceCurrency = (currentWorkspace?.currency || 'KZT').toUpperCase();
  const tx = useCallback(
    (path: string[], fallback: string) =>
      resolveLabel(getNestedValue(t, ['unapprovedCash', ...path]), fallback),
    [t],
  );

  const labels = {
    title: tx(['title'], 'Unapproved cash'),
    subtitle: tx(
      ['subtitle'],
      'Review uploaded statements before they appear in reports and exports.',
    ),
    searchPlaceholder: tx(['searchPlaceholder'], 'Search file, bank, or transaction'),
    filters: {
      reason: tx(['filters', 'reason'], 'Reason'),
      source: tx(['filters', 'source'], 'Source'),
      amountFrom: tx(['filters', 'amountFrom'], 'Amount from'),
      amountTo: tx(['filters', 'amountTo'], 'Amount to'),
      dateFrom: tx(['filters', 'dateFrom'], 'Date from'),
      dateTo: tx(['filters', 'dateTo'], 'Date to'),
      allReasons: tx(['filters', 'allReasons'], 'All reasons'),
      allSources: tx(['filters', 'allSources'], 'All sources'),
      reset: tx(['filters', 'reset'], 'Reset filters'),
    },
    reasons: {
      missingCategory: tx(['reasons', 'missingCategory'], 'Missing category'),
      duplicateDetected: tx(['reasons', 'duplicateDetected'], 'Duplicate detected'),
      unknownMerchant: tx(['reasons', 'unknownMerchant'], 'Unknown merchant'),
      missingType: tx(['reasons', 'missingType'], 'Missing type'),
      missingCurrency: tx(['reasons', 'missingCurrency'], 'Missing currency'),
      ocrIssues: tx(['reasons', 'ocrIssues'], 'OCR issues'),
      requiresConfirmation: tx(['reasons', 'requiresConfirmation'], 'Requires confirmation'),
    },
    sources: {
      gmail: tx(['sources', 'gmail'], 'Gmail'),
      pdf: tx(['sources', 'pdf'], 'PDF'),
      bank: tx(['sources', 'bank'], 'Bank'),
      manual: tx(['sources', 'manual'], 'Manual'),
      unknown: tx(['sources', 'unknown'], 'Unknown'),
    },
    summary: {
      total: tx(['summary', 'total'], 'Total unapproved'),
      missingCategory: tx(['summary', 'missingCategory'], 'Missing category'),
      duplicates: tx(['summary', 'duplicates'], 'Duplicates'),
      confirmation: tx(['summary', 'confirmation'], 'Needs confirmation'),
    },
    table: {
      merchant: tx(['table', 'merchant'], 'Statement'),
      date: tx(['table', 'date'], 'Date'),
      amount: tx(['table', 'amount'], 'Amount'),
      reason: tx(['table', 'reason'], 'Reason'),
      source: tx(['table', 'source'], 'Source'),
      actions: tx(['table', 'actions'], 'Actions'),
    },
    actions: {
      selected: tx(['actions', 'selected'], 'Selected: {count}'),
      selectAllVisible: tx(['actions', 'selectAllVisible'], 'Select all visible'),
      clearSelection: tx(['actions', 'clearSelection'], 'Clear selection'),
      assignCategory: tx(['actions', 'assignCategory'], 'Assign category'),
      approveSelected: tx(['actions', 'approveSelected'], 'Approve selected'),
      mergeDuplicates: tx(['actions', 'mergeDuplicates'], 'Merge duplicates'),
      ignore: tx(['actions', 'ignore'], 'Ignore'),
      reviewFix: tx(['actions', 'reviewFix'], 'Review / Fix'),
      approve: tx(['actions', 'approve'], 'Approve'),
      refresh: tx(['actions', 'refresh'], 'Refresh'),
      applying: tx(['actions', 'applying'], 'Applying...'),
    },
    empty: {
      title: tx(['empty', 'title'], 'All clear'),
      description: tx(
        ['empty', 'description'],
        'No statement files need manual review for the selected filters.',
      ),
    },
    toasts: {
      loadFailed: tx(['toasts', 'loadFailed'], 'Failed to load unapproved cash queue'),
      assignSuccess: tx(['toasts', 'assignSuccess'], 'Category assigned'),
      assignFailed: tx(['toasts', 'assignFailed'], 'Failed to assign category'),
      approveSuccess: tx(['toasts', 'approveSuccess'], 'Transactions approved'),
      approveFailed: tx(['toasts', 'approveFailed'], 'Failed to approve transactions'),
      mergeSuccess: tx(['toasts', 'mergeSuccess'], 'Duplicates merged'),
      mergeFailed: tx(['toasts', 'mergeFailed'], 'Failed to merge duplicates'),
      mergeNeedDuplicates: tx(
        ['toasts', 'mergeNeedDuplicates'],
        'Select at least 2 duplicate transactions',
      ),
      ignoreSuccess: tx(['toasts', 'ignoreSuccess'], 'Ignored {count} transaction(s)'),
      reviewUnavailable: tx(
        ['toasts', 'reviewUnavailable'],
        'Review is unavailable for this transaction',
      ),
    },
  };

  const reasonOptions = useMemo(
    () => [
      {
        id: 'missing-category' as UnapprovedReasonId,
        label: labels.reasons.missingCategory,
      },
      {
        id: 'duplicate-detected' as UnapprovedReasonId,
        label: labels.reasons.duplicateDetected,
      },
      {
        id: 'unknown-merchant' as UnapprovedReasonId,
        label: labels.reasons.unknownMerchant,
      },
      {
        id: 'missing-type' as UnapprovedReasonId,
        label: labels.reasons.missingType,
      },
      {
        id: 'missing-currency' as UnapprovedReasonId,
        label: labels.reasons.missingCurrency,
      },
      {
        id: 'ocr-issues' as UnapprovedReasonId,
        label: labels.reasons.ocrIssues,
      },
      {
        id: 'requires-confirmation' as UnapprovedReasonId,
        label: labels.reasons.requiresConfirmation,
      },
    ],
    [labels.reasons],
  );

  const sourceOptions = useMemo(
    () => [
      { id: 'gmail' as UnapprovedSource, label: labels.sources.gmail },
      { id: 'pdf' as UnapprovedSource, label: labels.sources.pdf },
      { id: 'bank' as UnapprovedSource, label: labels.sources.bank },
      { id: 'manual' as UnapprovedSource, label: labels.sources.manual },
      { id: 'unknown' as UnapprovedSource, label: labels.sources.unknown },
    ],
    [labels.sources],
  );

  const reasonLabelById = useMemo(
    () =>
      reasonOptions.reduce<Record<UnapprovedReasonId, string>>(
        (acc, option) => {
          acc[option.id] = option.label;
          return acc;
        },
        {
          'missing-category': labels.reasons.missingCategory,
          'duplicate-detected': labels.reasons.duplicateDetected,
          'unknown-merchant': labels.reasons.unknownMerchant,
          'missing-type': labels.reasons.missingType,
          'missing-currency': labels.reasons.missingCurrency,
          'ocr-issues': labels.reasons.ocrIssues,
          'requires-confirmation': labels.reasons.requiresConfirmation,
        },
      ),
    [labels.reasons, reasonOptions],
  );

  const sourceLabelById = useMemo(
    () =>
      sourceOptions.reduce<Record<UnapprovedSource, string>>(
        (acc, option) => {
          acc[option.id] = option.label;
          return acc;
        },
        {
          gmail: labels.sources.gmail,
          pdf: labels.sources.pdf,
          bank: labels.sources.bank,
          manual: labels.sources.manual,
          unknown: labels.sources.unknown,
        },
      ),
    [labels.sources, sourceOptions],
  );

  const [queueItems, setQueueItems] = useState<UnapprovedStatementQueueItem[]>([]);
  const [filters, setFilters] = useState<UnapprovedQueueFilters>(DEFAULT_UNAPPROVED_QUEUE_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(IGNORED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setIgnoredIds(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      setIgnoredIds([]);
    }
  }, []);

  const persistIgnoredIds = useCallback((ids: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const loadQueueData = useCallback(
    async (silent = false) => {
      if (!user) {
        setQueueItems([]);
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [transactions, statements] = await Promise.all([
          fetchAllTransactions(),
          fetchAllStatements(),
        ]);

        const nextQueue = buildUnapprovedStatementQueue({
          statements: statements.map(toStatementMeta),
          transactions,
        }).sort(sortByNewestDate);

        setQueueItems(nextQueue);
      } catch (error) {
        toast.error(extractErrorMessage(error) || labels.toasts.loadFailed);
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [labels.toasts.loadFailed, user],
  );

  useEffect(() => {
    void loadQueueData(false);
  }, [loadQueueData]);

  const ignoredSet = useMemo(() => new Set(ignoredIds), [ignoredIds]);

  const queueWithoutIgnored = useMemo(
    () => queueItems.filter(item => !ignoredSet.has(item.id)),
    [ignoredSet, queueItems],
  );

  const filteredQueue = useMemo(
    () => queueWithoutIgnored.filter(item => matchesUnapprovedFilters(item, filters)),
    [filters, queueWithoutIgnored],
  );

  useEffect(() => {
    const availableIds = new Set(queueWithoutIgnored.map(item => item.id));
    setSelectedIds(prev => prev.filter(id => availableIds.has(id)));
  }, [queueWithoutIgnored]);

  const visibleIds = useMemo(() => filteredQueue.map(item => item.id), [filteredQueue]);

  const selectedCount = selectedIds.length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const reasonCounts = useMemo(() => {
    const counts: Record<UnapprovedReasonId, number> = {
      'missing-category': 0,
      'duplicate-detected': 0,
      'unknown-merchant': 0,
      'missing-type': 0,
      'missing-currency': 0,
      'ocr-issues': 0,
      'requires-confirmation': 0,
    };

    queueWithoutIgnored.forEach(item => {
      item.reasons.forEach(reason => {
        counts[reason] += 1;
      });
    });

    return counts;
  }, [queueWithoutIgnored]);

  const setReasonFilter = (reasonValue: string) => {
    setFilters(prev => ({
      ...prev,
      reasons: reasonValue === 'all' ? [] : [reasonValue as UnapprovedReasonId],
    }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_UNAPPROVED_QUEUE_FILTERS);
  };

  const toggleSelect = (transactionId: string) => {
    setSelectedIds(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId],
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        return prev.filter(id => !visibleIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleIgnoreSelected = () => {
    if (selectedIds.length === 0) return;

    const nextIgnoredIds = Array.from(new Set([...ignoredIds, ...selectedIds]));
    setIgnoredIds(nextIgnoredIds);
    persistIgnoredIds(nextIgnoredIds);

    toast.success(formatTemplate(labels.toasts.ignoreSuccess, { count: selectedIds.length }));
    setSelectedIds([]);
  };

  const handleReview = (item: UnapprovedStatementQueueItem) => {
    const statementId = item.statement.id;
    if (!statementId) {
      toast.error(labels.toasts.reviewUnavailable);
      return;
    }

    router.push(`/statements/${statementId}/edit`);
  };

  const formatAmount = (item: UnapprovedStatementQueueItem) => {
    if (item.amount === null) return '—';

    const currency = (item.statement.currency || workspaceCurrency).toUpperCase();
    const value = new Intl.NumberFormat('ru', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount);

    return `${value} ${currency}`.trim();
  };

  const formatDate = (item: UnapprovedStatementQueueItem) => {
    if (!item.date) return '—';
    return item.date.toLocaleDateString();
  };

  const inputStyle: React.CSSProperties = { border: '1px solid #e5e7eb', background: '#fff', padding: '8px 12px', fontSize: 14, color: '#111827', outline: 'none', borderRadius: 0 };
  const summaryCardStyle: React.CSSProperties = { border: '1px solid #e5e7eb', background: '#fff', padding: 12, borderRadius: 0 };

  return (
    <div
      className="container-shared"
      style={{ display: 'flex', height: 'calc(100vh - var(--global-nav-height,0px))', minHeight: 0, flexDirection: 'column', overflow: 'hidden', padding: '24px 16px' }}
    >
      <div style={{ marginBottom: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{labels.title}</h1>
            <p style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{labels.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadQueueData(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', background: '#fff', padding: '8px 12px', fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer', borderRadius: 0, transition: 'background 0.15s' }}
            disabled={refreshing || loading}
          >
            {refreshing || loading ? (
              <Spinner size={16} />
            ) : (
              <RefreshCcw style={{ width: 16, height: 16 }} />
            )}
            {labels.actions.refresh}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={summaryCardStyle}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>{labels.summary.total}</p>
            <p style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#111827' }}>{queueWithoutIgnored.length}</p>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
              {labels.summary.missingCategory}
            </p>
            <p style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#111827' }}>
              {reasonCounts['missing-category']}
            </p>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
              {labels.summary.duplicates}
            </p>
            <p style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#111827' }}>
              {reasonCounts['duplicate-detected']}
            </p>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
              {labels.summary.confirmation}
            </p>
            <p style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#111827' }}>
              {reasonCounts['requires-confirmation']}
            </p>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', background: '#fff', padding: 12, borderRadius: 0 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(7, 1fr)' }}>
            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
              <Search style={{ pointerEvents: 'none', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
              <input
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                placeholder={labels.searchPlaceholder}
                style={{ ...inputStyle, width: '100%', paddingLeft: 36, paddingRight: 12 }}
              />
            </div>

            <select
              value={filters.reasons[0] || 'all'}
              onChange={event => setReasonFilter(event.target.value)}
              style={inputStyle}
              aria-label={labels.filters.reason}
            >
              <option value="all">{`${labels.filters.reason}: ${labels.filters.allReasons}`}</option>
              {reasonOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.source}
              onChange={event =>
                setFilters(prev => ({
                  ...prev,
                  source: event.target.value as UnapprovedQueueFilters['source'],
                }))
              }
              style={inputStyle}
              aria-label={labels.filters.source}
            >
              <option value="all">{`${labels.filters.source}: ${labels.filters.allSources}`}</option>
              {sourceOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={filters.amountMin ?? ''}
              onChange={event =>
                setFilters(prev => ({
                  ...prev,
                  amountMin:
                    event.target.value.trim() === '' ? null : Number(event.target.value.trim()),
                }))
              }
              placeholder={labels.filters.amountFrom}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />

            <input
              type="number"
              value={filters.amountMax ?? ''}
              onChange={event =>
                setFilters(prev => ({
                  ...prev,
                  amountMax:
                    event.target.value.trim() === '' ? null : Number(event.target.value.trim()),
                }))
              }
              placeholder={labels.filters.amountTo}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              {labels.filters.reset}
            </button>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <DatePicker
              label={labels.filters.dateFrom}
              value={toCalendarDate(filters.dateFrom)}
              onChange={(value: Date | null) =>
                setFilters(prev => ({ ...prev, dateFrom: toFilterDateValue(value) }))
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <DatePicker
              label={labels.filters.dateTo}
              value={toCalendarDate(filters.dateTo)}
              onChange={(value: Date | null) =>
                setFilters(prev => ({ ...prev, dateTo: toFilterDateValue(value) }))
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                {formatTemplate(labels.actions.selected, { count: selectedCount })}
              </span>

              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="inline-flex items-center rounded-md border border-primary/30 bg-white px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/5"
              >
                {labels.actions.selectAllVisible}
              </button>

              <button
                type="button"
                onClick={handleIgnoreSelected}
                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {labels.actions.ignore}
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="ml-auto inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {labels.actions.clearSelection}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <Spinner className="h-20 w-20 text-primary" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <Check className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-gray-900">{labels.empty.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{labels.empty.description}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="min-w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAllVisible}
                      />
                    </th>
                    <th className="px-2 py-3">{labels.table.merchant}</th>
                    <th className="w-32 px-2 py-3">{labels.table.date}</th>
                    <th className="w-44 px-2 py-3">{labels.table.amount}</th>
                    <th className="w-72 px-2 py-3">{labels.table.reason}</th>
                    <th className="w-24 px-2 py-3">{labels.table.source}</th>
                    <th className="w-48 px-2 py-3">{labels.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map(item => {
                    const statementId = item.id;
                    const selected = selectedIds.includes(statementId);
                    const reasonPreview = item.reasons.slice(0, 2);
                    const hiddenReasonCount = Math.max(
                      0,
                      item.reasons.length - reasonPreview.length,
                    );

                    return (
                      <tr key={statementId} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-4 py-3 align-top">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleSelect(statementId)}
                          />
                        </td>
                        <td className="px-2 py-3 align-top">
                          <p className="font-medium text-gray-900">
                            {item.statement.fileName?.trim() ||
                              item.statement.bankName?.trim() ||
                              '—'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.statement.bankName?.trim() || `#${statementId.slice(0, 8)}`}
                          </p>
                        </td>
                        <td className="px-2 py-3 align-top text-gray-700">{formatDate(item)}</td>
                        <td className="px-2 py-3 align-top font-medium text-gray-900">
                          {formatAmount(item)}
                        </td>
                        <td className="px-2 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {reasonPreview.map(reason => (
                              <span
                                key={reason}
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${REASON_BADGE_CLASSNAME[reason]}`}
                              >
                                {reasonLabelById[reason]}
                              </span>
                            ))}
                            {hiddenReasonCount > 0 ? (
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                +{hiddenReasonCount}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SOURCE_BADGE_CLASSNAME[item.source]}`}
                          >
                            {sourceLabelById[item.source]}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleReview(item)}
                              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              {labels.actions.reviewFix}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {filteredQueue.map(item => {
                const statementId = item.id;
                const selected = selectedIds.includes(statementId);

                return (
                  <article key={statementId} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelect(statementId)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.statement.fileName?.trim() ||
                              item.statement.bankName?.trim() ||
                              '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.statement.bankName?.trim() || formatDate(item)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatAmount(item)}</p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.reasons.map(reason => (
                        <span
                          key={reason}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${REASON_BADGE_CLASSNAME[reason]}`}
                        >
                          {reasonLabelById[reason]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SOURCE_BADGE_CLASSNAME[item.source]}`}
                      >
                        {sourceLabelById[item.source]}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReview(item)}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
                        >
                          {labels.actions.reviewFix}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
