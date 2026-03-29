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

const UI_ONLY_BANK_FILTER_IDS = new Set(['bank:receipt', 'bank:gmail']);

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
  source?: 'statement' | 'gmail' | 'scan';
  status: string;
};

type StatementViewAction =
  | { type: 'route'; href: string };

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
