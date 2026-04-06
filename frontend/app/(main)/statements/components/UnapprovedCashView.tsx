'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { DatePicker } from '@heroui/date-picker';
import { type DateValue, parseDate } from '@internationalized/date';
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

const REASON_BADGE_CLASSNAME: Record<UnapprovedReasonId, string> = {
  'missing-category': 'border-amber-200 bg-amber-50 text-amber-700',
  'duplicate-detected': 'border-red-200 bg-red-50 text-red-700',
  'unknown-merchant': 'border-slate-200 bg-slate-100 text-slate-700',
  'missing-type': 'border-blue-200 bg-blue-50 text-blue-700',
  'missing-currency': 'border-cyan-200 bg-cyan-50 text-cyan-700',
  'ocr-issues': 'border-rose-200 bg-rose-50 text-rose-700',
  'requires-confirmation': 'border-gray-200 bg-gray-100 text-gray-700',
};

const SOURCE_BADGE_CLASSNAME: Record<UnapprovedSource, string> = {
  gmail: 'border-orange-200 bg-orange-50 text-orange-700',
  pdf: 'border-sky-200 bg-sky-50 text-sky-700',
  bank: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  manual: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  unknown: 'border-gray-200 bg-gray-100 text-gray-700',
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

const toCalendarDate = (value?: string | null) => {
  const normalized = normalizeToDateString(value);
  if (!normalized) return null;

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

const toFilterDateValue = (date: DateValue | null) => (date ? date.toString() : '');

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

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 shrink-0 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{labels.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{labels.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadQueueData(true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={refreshing || loading}
          >
            {refreshing || loading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {labels.actions.refresh}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{labels.summary.total}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{queueWithoutIgnored.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {labels.summary.missingCategory}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {reasonCounts['missing-category']}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {labels.summary.duplicates}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {reasonCounts['duplicate-detected']}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {labels.summary.confirmation}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {reasonCounts['requires-confirmation']}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid gap-2 md:grid-cols-7">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                placeholder={labels.searchPlaceholder}
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <select
              value={filters.reasons[0] || 'all'}
              onChange={event => setReasonFilter(event.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
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
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
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
              aria-label={labels.filters.dateFrom}
              value={toCalendarDate(filters.dateFrom)}
              onChange={value =>
                setFilters(prev => ({ ...prev, dateFrom: toFilterDateValue(value) }))
              }
              granularity="day"
              showMonthAndYearPickers
              className="w-full"
              classNames={{
                inputWrapper:
                  'min-h-[44px] rounded-md border border-gray-200 bg-white px-3 py-2 shadow-none transition-colors hover:border-gray-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-primary/10',
                input: 'text-sm text-gray-900',
                segment: 'text-sm text-gray-900',
                selectorButton: 'text-gray-700',
              }}
            />
            <DatePicker
              aria-label={labels.filters.dateTo}
              value={toCalendarDate(filters.dateTo)}
              onChange={value =>
                setFilters(prev => ({ ...prev, dateTo: toFilterDateValue(value) }))
              }
              granularity="day"
              showMonthAndYearPickers
              className="w-full"
              classNames={{
                inputWrapper:
                  'min-h-[44px] rounded-md border border-gray-200 bg-white px-3 py-2 shadow-none transition-colors hover:border-gray-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-primary/10',
                input: 'text-sm text-gray-900',
                segment: 'text-sm text-gray-900',
                selectorButton: 'text-gray-700',
              }}
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
