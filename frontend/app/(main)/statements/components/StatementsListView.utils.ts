import {
  type StatementColumn,
  type StatementColumnId,
  getAllowedStatementFilterKeys,
  resetDisallowedStatementFilters,
} from './columns/statement-columns';
import {
  getVisibleFilterScreens,
  resetHiddenStatementFilters,
  serializeStatementFiltersToQuery,
} from './filters/server-statement-filters';
import type { StatementFilters } from './filters/statement-filters';
import type { StatementCategoryNode } from '@/app/lib/statement-categories';
import { resolveBankLogo } from '@bank-logos';

const UI_ONLY_BANK_FILTER_IDS = new Set(['bank:receipt', 'bank:gmail']);

// ---------------------------------------------------------------------------
// Structural types used by helper functions below.
// These mirror fields from the component's Statement interface without
// creating a circular import.
// ---------------------------------------------------------------------------

type StatementSource = 'statement' | 'gmail' | 'scan';

/** Minimal shape required by formatting & status helpers. */
export type StatementLike = {
  id: string;
  source?: StatementSource;
  receiptSource?: string;
  status: string;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  currency?: string | null;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  receivedAt?: string;
  createdAt: string;
  parsingDetails?: {
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: { currencyDisplay?: string };
    };
  };
};

export type DuplicateGroupTone = 'sky' | 'blue' | 'indigo' | 'slate' | 'zinc' | 'stone';

export type StatementCategoryWithEnabled = StatementCategoryNode & {
  isEnabled?: boolean;
  children?: StatementCategoryWithEnabled[];
};

type ReceiptDerivedStatementCandidate = {
  parsingDetails?: {
    detectedBy?: string;
    importPreview?: {
      source?: string;
    };
  };
};

type StatementViewCandidate = {
  id: string;
  statementId?: string | null;
  source?: StatementSource;
  status: string;
};

type StatementViewAction = { type: 'route'; href: string };

// ---------------------------------------------------------------------------
// Statement status helpers
// ---------------------------------------------------------------------------

export const isStatementParsingInProgress = (statement: Pick<StatementLike, 'status'>): boolean => {
  const status = (statement.status || '').toLowerCase();
  return status === 'uploaded' || status === 'processing';
};

export const isReceiptProcessing = (
  statement: Pick<StatementLike, 'source' | 'status'>,
): boolean => {
  if (statement.source !== 'gmail' && statement.source !== 'scan') return false;
  const status = (statement.status || '').toLowerCase();
  return status === 'new' || status === 'processing';
};

export const isGmailStatement = (statement: Pick<StatementLike, 'source'>): boolean =>
  statement.source === 'gmail';

export const isScanReceiptStatement = (statement: Pick<StatementLike, 'source'>): boolean =>
  statement.source === 'scan';

export const isStoreReceiptStatement = (
  statement: Pick<StatementLike, 'source' | 'receiptSource'>,
): boolean => statement.source === 'scan' && statement.receiptSource !== 'gmail';

// ---------------------------------------------------------------------------
// Statement formatting helpers
// ---------------------------------------------------------------------------

export const resolveStatementCurrency = (statement: StatementLike): string =>
  (
    statement.parsedData?.currency ||
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    ''
  ).toString();

export const parseAmountValue = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatStatementAmount = (statement: StatementLike): string => {
  if (statement.source === 'gmail' || statement.source === 'scan') {
    const amount = parseAmountValue(statement.parsedData?.amount ?? null);
    if (amount === null) return '-';
    const currency = resolveStatementCurrency(statement);
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted}${currency || ''}`;
  }

  if (isStatementParsingInProgress(statement)) {
    const debit = parseAmountValue(statement.totalDebit);
    const credit = parseAmountValue(statement.totalCredit);
    const hasResolvedAmount = (debit !== null && debit > 0) || (credit !== null && credit > 0);
    if (!hasResolvedAmount) return '-';
  }

  const debit = parseAmountValue(statement.totalDebit);
  const credit = parseAmountValue(statement.totalCredit);
  const rawAmount = (debit && debit > 0 ? debit : credit && credit > 0 ? credit : 0) || 0;
  const currency = resolveStatementCurrency(statement);
  const formatted =
    rawAmount === 0
      ? '0'
      : new Intl.NumberFormat(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(rawAmount);
  return `${formatted}${currency || ''}`;
};

export const formatStatementDate = (statement: StatementLike): string => {
  const dateValue =
    statement.source === 'gmail' || statement.source === 'scan'
      ? statement.parsedData?.date || statement.receivedAt || statement.createdAt
      : statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

export const resolveStatementSortDate = (statement: StatementLike): number => {
  const dateValue =
    statement.source === 'gmail' || statement.source === 'scan'
      ? statement.parsedData?.date || statement.receivedAt || statement.createdAt
      : statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  return date.getTime();
};

export const getBankDisplayName = (bankName: string): string => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

// ---------------------------------------------------------------------------
// Duplicate detection helpers
// ---------------------------------------------------------------------------

export const toDuplicateGroupLabel = (index: number): string => {
  let current = index + 1;
  let label = '';
  while (current > 0) {
    const code = (current - 1) % 26;
    label = String.fromCharCode(65 + code) + label;
    current = Math.floor((current - 1) / 26);
  }
  return `Group ${label}`;
};

export const DUPLICATE_GROUP_TONES: DuplicateGroupTone[] = [
  'sky',
  'blue',
  'indigo',
  'slate',
  'zinc',
  'stone',
];

// ---------------------------------------------------------------------------
// API endpoint helpers
// ---------------------------------------------------------------------------

export const getBulkActionErrorOptions = (id: string): { id: string } => ({ id });

export const getExportEndpoint = (statement: Pick<StatementLike, 'id' | 'source' | 'receiptSource'>): string =>
  isScanReceiptStatement(statement)
    ? `/receipts/${statement.id}/file`
    : `/statements/${statement.id}/file`;

export const getDeleteEndpoint = (statement: Pick<StatementLike, 'id' | 'source' | 'receiptSource'>): string =>
  isScanReceiptStatement(statement) ? `/receipts/${statement.id}` : `/statements/${statement.id}`;

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

export const filterEnabledCategories = (
  categories: StatementCategoryWithEnabled[],
): StatementCategoryNode[] =>
  categories
    .filter(category => category.isEnabled !== false)
    .map(category => ({
      id: category.id,
      name: category.name,
      children: category.children ? filterEnabledCategories(category.children) : undefined,
    }));

// ---------------------------------------------------------------------------
// Existing helpers (unchanged)
// ---------------------------------------------------------------------------

export const buildStatementRequestParams = ({
  appliedFilters,
  search,
}: {
  appliedFilters: StatementFilters;
  search?: string;
}) => {
  const serverSafeFilters: StatementFilters = {
    ...appliedFilters,
    type:
      appliedFilters.type === 'receipt' || appliedFilters.type === 'gmail'
        ? null
        : appliedFilters.type,
    from: appliedFilters.from.filter(value => !UI_ONLY_BANK_FILTER_IDS.has(value.toLowerCase())),
    to: appliedFilters.to.filter(value => !UI_ONLY_BANK_FILTER_IDS.has(value.toLowerCase())),
  };

  return {
    ...serializeStatementFiltersToQuery(serverSafeFilters),
    ...(search ? { search } : {}),
  };
};

export const isReceiptDerivedStatement = (statement: ReceiptDerivedStatementCandidate) => {
  return (
    statement.parsingDetails?.detectedBy === 'receipt-scan' ||
    statement.parsingDetails?.importPreview?.source === 'receipt-scan'
  );
};

export const resolveStatementViewAction = (
  statement: StatementViewCandidate,
): StatementViewAction => {
  if (statement.source === 'gmail') {
    return { type: 'route', href: `/storage/gmail-receipts/${statement.id}` };
  }

  if (statement.source === 'scan') {
    return { type: 'route', href: `/storage/receipts/${statement.id}` };
  }

  if (
    statement.status === 'completed' ||
    statement.status === 'parsed' ||
    statement.status === 'validated'
  ) {
    return { type: 'route', href: `/statements/${statement.id}/edit` };
  }

  return { type: 'route', href: `/storage/${statement.id}` };
};

export const paginateStatements = <T>(statements: T[], page: number, pageSize: number): T[] => {
  if (pageSize <= 0) return [];
  const currentPage = Math.max(1, page);
  const start = (currentPage - 1) * pageSize;
  return statements.slice(start, start + pageSize);
};

export const deriveVisibleFilterScreens = (
  columns: Array<Pick<StatementColumn, 'id' | 'visible'>>,
) => {
  const visibleColumnIds = columns.filter(column => column.visible).map(column => column.id);
  return getVisibleFilterScreens(visibleColumnIds);
};

export const reconcileFiltersWithColumns = ({
  columns,
  appliedFilters,
  draftFilters,
}: {
  columns: StatementColumn[];
  appliedFilters: StatementFilters;
  draftFilters: StatementFilters;
}) => {
  const visibleColumnIds = columns.filter(column => column.visible).map(column => column.id);
  const allowedFilterKeys = getAllowedStatementFilterKeys(visibleColumnIds as StatementColumnId[]);

  return {
    allowedFilterKeys,
    nextAppliedFilters: resetDisallowedStatementFilters(appliedFilters, allowedFilterKeys),
    nextDraftFilters: resetHiddenStatementFilters(draftFilters, allowedFilterKeys),
  };
};
