'use client';

import CreateExpenseDrawer from '@/app/(main)/statements/components/CreateExpenseDrawer';
import { ColumnsDrawer } from '@/app/(main)/statements/components/columns/ColumnsDrawer';
import {
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumn,
  type StatementColumnId,
  loadStatementColumns,
  reorderStatementColumns,
  saveStatementColumns,
} from '@/app/(main)/statements/components/columns/statement-columns';
import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilters,
  applyStatementsFilters,
  loadStatementFilters,
  resetSingleStatementFilter,
  saveStatementFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { Checkbox } from '@/app/components/ui/checkbox';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { AppPagination } from '@/app/components/ui/pagination';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer } from '@/app/i18n';
import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { type StatementCategoryNode } from '@/app/lib/statement-categories';
import {
  type ManualExpenseDraft,
  type OpenExpenseDrawerEventDetail,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  type StatementExpenseMode,
  type TaxRateOption,
  resolveExpenseDrawerMode,
} from '@/app/lib/statement-expense-drawer';
import {
  getStatementDisplayMerchant,
  getStatementMerchantLabel,
  isManualExpenseStatement,
} from '@/app/lib/statement-status';
import { STATEMENTS_GMAIL_SYNC_STORAGE_KEY } from '@/app/lib/statement-upload-actions';
import { type StatementStage, getStatementStage } from '@/app/lib/statement-workflow';
import Skeleton from '@mui/material/Skeleton';
import {
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Columns2,
  Copy,
  Download,
  File,
  GitMerge,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { StatementsListItem } from './StatementsListItem';
import {
  DUPLICATE_GROUP_TONES,
  type DuplicateGroupTone,
  type StatementCategoryWithEnabled,
  type StatementLike,
  buildStatementRequestParams,
  deriveVisibleFilterScreens,
  filterEnabledCategories,
  formatPaginationLabel,
  formatStatementAmount,
  formatStatementDate,
  getBankDisplayName,
  getBulkActionErrorOptions,
  getDeleteEndpoint,
  getExportEndpoint,
  isGmailStatement,
  isReceiptDerivedStatement,
  isReceiptProcessing,
  isScanReceiptStatement,
  isStatementParsingInProgress,
  isStoreReceiptStatement,
  paginateStatements,
  reconcileFiltersWithColumns,
  resolveStatementCurrency,
  resolveStatementSortDate,
  resolveStatementViewAction,
  toDuplicateGroupLabel,
} from './StatementsListView.utils';
import {
  type GmailReceipt,
  hasGmailReceiptAmount,
  mapGmailReceiptsToStatements,
} from './gmail-receipt-mapping';
import { useStatementPreview } from './hooks/useStatementPreview';
import {
  type DuplicateMeta,
  type DuplicateOverride,
  useStatementSelection,
} from './hooks/useStatementSelection';
import { useStatementsListData } from './hooks/useStatementsListData';
import {
  uploadReceiptScanFiles as runUploadReceiptScanFiles,
  uploadScanDrawerFiles as runUploadScanDrawerFiles,
  uploadStatementFiles as runUploadStatementFiles,
} from './statement-upload';

interface Statement {
  id: string;
  source?: 'statement' | 'gmail' | 'scan';
  receiptSource?: string;
  fileName: string;
  subject?: string;
  sender?: string;
  status: string;
  totalTransactions: number;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  createdAt: string;
  processedAt?: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  errorMessage?: string | null;
  parsingDetails?: {
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
    detectedBy?: string;
    parserUsed?: string;
    importPreview?: {
      source?: string;
      merchant?: string;
      attachments?: number;
    };
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  };
  gmailMessageId?: string;
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
}

type UnifiedStatement = Statement;

type Props = {
  stage: StatementStage;
};

export default function StatementsListView({ stage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const t = useIntlayer('statementsPage');
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<'desc' | 'asc'>('desc');

  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [expenseDrawerMode, setExpenseDrawerMode] = useState<StatementExpenseMode>('scan');
  const [manualExpenseCategories, setManualExpenseCategories] = useState<StatementCategoryNode[]>(
    [],
  );
  const [manualExpenseTaxRates, setManualExpenseTaxRates] = useState<TaxRateOption[]>([]);
  const tx = (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback);
  const searchPlaceholder = resolveLabel(t.searchPlaceholder, 'Search statements');
  const filterLabels = {
    type: resolveLabel(t.filters?.type, 'Type'),
    status: resolveLabel(t.filters?.status, 'Status'),
    date: resolveLabel(t.filters?.date, 'Date'),
    from: resolveLabel(t.filters?.from, 'From'),
    filters: resolveLabel(t.filters?.filters, 'Filters'),
    columns: resolveLabel(t.filters?.columns, 'Columns'),
  };
  const listHeaderLabels = {
    receipt: resolveLabel(t.listHeader?.receipt, 'Receipt'),
    type: resolveLabel(t.listHeader?.type, 'Type'),
    date: resolveLabel(t.listHeader?.date, 'Date'),
    merchant: resolveLabel(t.listHeader?.merchant, 'Merchant'),
    amount: resolveLabel(t.listHeader?.amount, 'Amount'),
    action: resolveLabel(t.listHeader?.action, 'Action'),
    scanning: resolveLabel(t.listHeader?.scanning, 'Scanning...'),
  };
  const viewLabel = resolveLabel(t.actions?.view, 'View');
  const reviewDuplicateLabel = tx(['actions', 'reviewDuplicate'], 'Review');
  const markDuplicateLabel = tx(['actions', 'markDuplicate'], 'Mark as duplicate');
  const markNotDuplicateLabel = tx(['actions', 'markNotDuplicate'], 'Mark as not duplicate');
  const dismissDuplicateLabel = tx(
    ['actions', 'dismissDuplicate'],
    markNotDuplicateLabel || 'Dismiss',
  );
  const mergeDuplicatesLabel = tx(['actions', 'mergeDuplicates'], 'Merge duplicates');
  const selectDuplicatesLabel = tx(['actions', 'selectDuplicates'], 'Select duplicates');
  const emptyLabels = {
    title: resolveLabel(t.empty?.title, 'No statements yet'),
    description: resolveLabel(t.empty?.description, 'Upload your first statement to get started'),
  };
  const paginationLabels = {
    shown: tx(['pagination', 'shown'], 'Showing {from}–{to} of {count}'),
    previous: tx(['pagination', 'previous'], 'Previous'),
    next: tx(['pagination', 'next'], 'Next'),
    pageOf: tx(['pagination', 'pageOf'], 'Page {page} of {count}'),
  };
  const filterLinkClassName =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';
  useLockBodyScroll(expenseDrawerOpen);

  const { preview, openPreview, closePreview } = useStatementPreview();
  const [duplicateOverrides, setDuplicateOverrides] = useState<Record<string, DuplicateOverride>>(
    {},
  );
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false);
  const [columns, setColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);
  const [draftColumns, setDraftColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);

  const {
    statements,
    gmailReceipts,
    loading,
    gmailLoading,
    gmailSyncSkeletonKeys,
    setGmailSyncSkeletonKeys,
    loadStatements,
    loadGmailReceipts,
    refreshActiveStatements,
  } = useStatementsListData<Statement>({
    appliedFilters,
    search,
    stage,
    user,
    page,
    pageSize,
    router,
    loadListErrorLabel: resolveLabel(t.loadListError, 'Failed to load statements'),
    refreshFailedLabel: resolveLabel(t.refreshFailed, 'Failed to refresh statements'),
  });

  const hasGmailReceipts = useMemo(() => gmailReceipts.length > 0, [gmailReceipts]);

  const filterOptionLabels = {
    apply: tx(['filters', 'apply'], 'Apply'),
    reset: tx(['filters', 'reset'], 'Reset'),
    resetFilters: tx(['filters', 'resetFilters'], 'Reset filters'),
    viewResults: tx(['filters', 'viewResults'], 'View results'),
    save: tx(['filters', 'save'], 'Save'),
    saveSearch: tx(['filters', 'saveSearch'], 'Save search'),
    any: tx(['filters', 'any'], 'Any'),
    yes: tx(['filters', 'yes'], 'Yes'),
    no: tx(['filters', 'no'], 'No'),
    typeExpense: tx(['filters', 'typeExpense'], 'Expense'),
    typeReport: tx(['filters', 'typeReport'], 'Expense Report'),
    typeChat: tx(['filters', 'typeChat'], 'Chat'),
    typeTrip: tx(['filters', 'typeTrip'], 'Trip'),
    typeTask: tx(['filters', 'typeTask'], 'Task'),
    statusUploaded: tx(['filters', 'statusUploaded'], 'Uploaded'),
    statusProcessing: tx(['filters', 'statusProcessing'], 'Processing'),
    statusParsed: tx(['filters', 'statusParsed'], 'Parsed'),
    statusValidated: tx(['filters', 'statusValidated'], 'Validated'),
    statusCompleted: tx(['filters', 'statusCompleted'], 'Completed'),
    statusError: tx(['filters', 'statusError'], 'Error'),
    dateThisMonth: tx(['filters', 'dateThisMonth'], 'This month'),
    dateLastMonth: tx(['filters', 'dateLastMonth'], 'Last month'),
    dateYearToDate: tx(['filters', 'dateYearToDate'], 'Year to date'),
    dateOn: tx(['filters', 'dateOn'], 'On'),
    dateAfter: tx(['filters', 'dateAfter'], 'After'),
    dateBefore: tx(['filters', 'dateBefore'], 'Before'),
    drawerTitle: tx(['filters', 'drawerTitle'], 'Filters'),
    drawerGeneral: tx(['filters', 'drawerGeneral'], 'General'),
    drawerExpenses: tx(['filters', 'drawerExpenses'], 'Expenses'),
    drawerReports: tx(['filters', 'drawerReports'], 'Reports'),
    drawerGroupBy: tx(['filters', 'drawerGroupBy'], 'Group by'),
    drawerHas: tx(['filters', 'drawerHas'], 'Has'),
    drawerKeywords: tx(['filters', 'drawerKeywords'], 'Keywords'),
    drawerLimit: tx(['filters', 'drawerLimit'], 'Limit'),
    drawerTo: tx(['filters', 'drawerTo'], 'To'),
    drawerAmount: tx(['filters', 'drawerAmount'], 'Amount'),
    drawerApproved: tx(['filters', 'drawerApproved'], 'Approved'),
    drawerBillable: tx(['filters', 'drawerBillable'], 'Billable'),
    groupByDate: tx(['filters', 'groupByDate'], 'Date'),
    groupByStatus: tx(['filters', 'groupByStatus'], 'Status'),
    groupByType: tx(['filters', 'groupByType'], 'Type'),
    groupByBank: tx(['filters', 'groupByBank'], 'Bank'),
    groupByUser: tx(['filters', 'groupByUser'], 'User'),
    groupByAmount: tx(['filters', 'groupByAmount'], 'Amount'),
    hasErrors: tx(['filters', 'hasErrors'], 'Errors'),
    hasLogs: tx(['filters', 'hasLogs'], 'Logs'),
    hasTransactions: tx(['filters', 'hasTransactions'], 'Transactions'),
    hasDateRange: tx(['filters', 'hasDateRange'], 'Date range'),
    hasCurrency: tx(['filters', 'hasCurrency'], 'Currency'),
    columnReceipt: tx(['filters', 'columnReceipt'], 'Receipt'),
    columnDate: tx(['filters', 'columnDate'], 'Date'),
    columnMerchant: tx(['filters', 'columnMerchant'], 'Merchant'),
    columnFrom: tx(['filters', 'columnFrom'], 'From'),
    columnTo: tx(['filters', 'columnTo'], 'To'),
    columnCategory: tx(['filters', 'columnCategory'], 'Category'),
    columnTag: tx(['filters', 'columnTag'], 'Tag'),
    columnAmount: tx(['filters', 'columnAmount'], 'Amount'),
    columnAction: tx(['filters', 'columnAction'], 'Action'),
    columnApproved: tx(['filters', 'columnApproved'], 'Approved'),
    columnBillable: tx(['filters', 'columnBillable'], 'Billable'),
    columnCard: tx(['filters', 'columnCard'], 'Card'),
    columnDescription: tx(['filters', 'columnDescription'], 'Description'),
    columnExchangeRate: tx(['filters', 'columnExchangeRate'], 'Exchange rate'),
    columnExported: tx(['filters', 'columnExported'], 'Exported'),
    columnExportedTo: tx(['filters', 'columnExportedTo'], 'Exported to'),
    columnsTitle: tx(['filters', 'columnsTitle'], 'Columns'),
  };

  const typeOptions = [
    { value: 'receipt', label: 'Receipt' },
    { value: 'expense', label: filterOptionLabels.typeExpense },
    { value: 'expense_report', label: filterOptionLabels.typeReport },
    { value: 'chat', label: filterOptionLabels.typeChat },
    { value: 'trip', label: filterOptionLabels.typeTrip },
    { value: 'task', label: filterOptionLabels.typeTask },
    { value: 'gmail', label: 'Gmail' },
    { value: 'pdf', label: 'PDF' },
    { value: 'xlsx', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
    { value: 'image', label: 'Image' },
  ];

  const statusOptions = [
    { value: 'uploaded', label: filterOptionLabels.statusUploaded },
    { value: 'processing', label: filterOptionLabels.statusProcessing },
    { value: 'parsed', label: filterOptionLabels.statusParsed },
    { value: 'validated', label: filterOptionLabels.statusValidated },
    { value: 'completed', label: filterOptionLabels.statusCompleted },
    { value: 'error', label: filterOptionLabels.statusError },
  ];

  const datePresets = [
    { value: 'thisMonth' as const, label: filterOptionLabels.dateThisMonth },
    { value: 'lastMonth' as const, label: filterOptionLabels.dateLastMonth },
    { value: 'yearToDate' as const, label: filterOptionLabels.dateYearToDate },
  ];

  const dateModes = [
    { value: 'on' as const, label: filterOptionLabels.dateOn },
    { value: 'after' as const, label: filterOptionLabels.dateAfter },
    { value: 'before' as const, label: filterOptionLabels.dateBefore },
  ];

  const groupByOptions = [
    { value: 'date', label: filterOptionLabels.groupByDate },
    { value: 'status', label: filterOptionLabels.groupByStatus },
    { value: 'type', label: filterOptionLabels.groupByType },
    { value: 'bank', label: filterOptionLabels.groupByBank },
    { value: 'user', label: filterOptionLabels.groupByUser },
    { value: 'amount', label: filterOptionLabels.groupByAmount },
  ];

  const hasOptions = [
    { value: 'errors', label: filterOptionLabels.hasErrors },
    { value: 'processingDetails', label: filterOptionLabels.hasLogs },
    { value: 'transactions', label: filterOptionLabels.hasTransactions },
    { value: 'dateRange', label: filterOptionLabels.hasDateRange },
    { value: 'currency', label: filterOptionLabels.hasCurrency },
  ];

  const columnLabels = {
    receipt: filterOptionLabels.columnReceipt,
    date: filterOptionLabels.columnDate,
    merchant: filterOptionLabels.columnMerchant,
    from: filterOptionLabels.columnFrom,
    to: filterOptionLabels.columnTo,
    category: filterOptionLabels.columnCategory,
    tag: filterOptionLabels.columnTag,
    amount: filterOptionLabels.columnAmount,
    action: filterOptionLabels.columnAction,
    approved: filterOptionLabels.columnApproved,
    billable: filterOptionLabels.columnBillable,
    card: filterOptionLabels.columnCard,
    description: filterOptionLabels.columnDescription,
    exchangeRate: filterOptionLabels.columnExchangeRate,
    exported: filterOptionLabels.columnExported,
    exportedTo: filterOptionLabels.columnExportedTo,
  };

  const columnsWithLabels = useMemo(() => {
    return draftColumns.map(column => ({
      ...column,
      label: columnLabels[column.id] ?? column.label,
    }));
  }, [draftColumns, columnLabels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!user) return;
    loadManualExpenseOptions();
  }, [user]);

  useEffect(() => {
    const storedFilters = loadStatementFilters();
    setDraftFilters(storedFilters);
    setAppliedFilters(storedFilters);
    const storedColumns = loadStatementColumns();
    setColumns(storedColumns);
    setDraftColumns(storedColumns);
  }, []);

  const receiptStatements = useMemo<UnifiedStatement[]>(() => {
    if (stage !== 'submit') return [];
    return mapGmailReceiptsToStatements(gmailReceipts);
  }, [gmailReceipts, stage]);

  const stagedStatements = useMemo(() => {
    const baseStatements = statements.filter(statement => {
      const currentStage = getStatementStage(statement.id);
      return currentStage === stage && !isReceiptDerivedStatement(statement);
    });

    if (stage !== 'submit') {
      return baseStatements;
    }

    const receiptFiltered = search.trim()
      ? receiptStatements.filter(statement => {
          const query = search.trim().toLowerCase();
          return (
            statement.fileName.toLowerCase().includes(query) ||
            (statement.subject || '').toLowerCase().includes(query) ||
            (statement.sender || '').toLowerCase().includes(query) ||
            (statement.parsedData?.vendor || '').toLowerCase().includes(query)
          );
        })
      : receiptStatements;

    return [...receiptFiltered, ...baseStatements].sort(
      (a, b) => resolveStatementSortDate(b) - resolveStatementSortDate(a),
    );
  }, [statements, stage, search, receiptStatements]);

  const displayStatements = useMemo(
    () => applyStatementsFilters(stagedStatements, appliedFilters),
    [stagedStatements, appliedFilters],
  );

  const sortedDisplayStatements = useMemo(() => {
    const directionFactor = dateSortDirection === 'asc' ? 1 : -1;
    return [...displayStatements].sort((left, right) => {
      const leftDate = resolveStatementSortDate(left);
      const rightDate = resolveStatementSortDate(right);
      const dateDiff = leftDate - rightDate;

      if (dateDiff !== 0) {
        return dateDiff * directionFactor;
      }

      return left.id.localeCompare(right.id) * directionFactor;
    });
  }, [displayStatements, dateSortDirection]);

  const paginatedDisplayStatements = useMemo(
    () => paginateStatements(sortedDisplayStatements, page, pageSize),
    [sortedDisplayStatements, page, pageSize],
  );

  const total = sortedDisplayStatements.length;
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  const duplicateMetaById = useMemo(() => {
    const duplicateGroups = new Map<
      string,
      Array<{
        statement: Statement;
        createdAtTimestamp: number;
      }>
    >();
    const duplicateReason = 'Same merchant · same date · same amount';
    const isKnownStatement = new Set(displayStatements.map(statement => statement.id));

    displayStatements.forEach(statement => {
      const isReceipt = statement.source === 'gmail' || statement.source === 'scan';
      const isProcessingReceipt = isReceiptProcessing(statement);
      const amountLabel = formatStatementAmount(statement);
      const override = duplicateOverrides[statement.id]?.state;

      if (override === 'not_duplicate') {
        return;
      }

      if (
        amountLabel === '-' ||
        amountLabel === '0' ||
        amountLabel === '0.00' ||
        isProcessingReceipt ||
        statement.status === 'processing'
      ) {
        return;
      }

      const resolvedName = isReceipt
        ? resolveGmailMerchantLabel({
            vendor: statement.parsedData?.vendor,
            sender: isGmailStatement(statement) ? statement.sender : undefined,
            subject: statement.subject,
            fallback: statement.fileName,
          })
        : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
      const merchantLabel = isReceipt
        ? resolvedName
        : getStatementMerchantLabel(statement.status, resolvedName, listHeaderLabels.scanning);
      const dateLabel = formatStatementDate(statement);
      const signature = `${merchantLabel}::${amountLabel}::${dateLabel}`;
      const existingGroup = duplicateGroups.get(signature);
      const createdAtTimestamp = Number.isFinite(new Date(statement.createdAt).getTime())
        ? new Date(statement.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (existingGroup) {
        existingGroup.push({ statement, createdAtTimestamp });
      } else {
        duplicateGroups.set(signature, [{ statement, createdAtTimestamp }]);
      }
    });

    const metaById = new Map<string, DuplicateMeta>();

    let duplicateGroupOrder = 0;

    duplicateGroups.forEach((group, groupKey) => {
      if (group.length < 2) {
        return;
      }

      const sortedGroup = [...group].sort((a, b) => {
        if (a.createdAtTimestamp === b.createdAtTimestamp) {
          return a.statement.id.localeCompare(b.statement.id);
        }
        return a.createdAtTimestamp - b.createdAtTimestamp;
      });

      const primaryId = sortedGroup[0]?.statement.id || '';
      const groupLabel = toDuplicateGroupLabel(duplicateGroupOrder);
      const groupTone = DUPLICATE_GROUP_TONES[duplicateGroupOrder % DUPLICATE_GROUP_TONES.length];
      duplicateGroupOrder += 1;

      sortedGroup.forEach(({ statement }, index) => {
        metaById.set(statement.id, {
          position: index + 1,
          total: sortedGroup.length,
          role: index === 0 ? 'primary' : 'suspected',
          reason: duplicateReason,
          groupKey,
          groupLabel,
          groupTone,
          primaryId,
        });
      });
    });

    Object.entries(duplicateOverrides).forEach(([statementId, override]) => {
      if (override?.state !== 'duplicate') {
        return;
      }

      if (!isKnownStatement.has(statementId) || metaById.has(statementId)) {
        return;
      }

      const manualGroupKey = override.groupKey || `manual:${statementId}`;
      const manualGroupLabel = override.groupLabel || 'Group Manual';
      const manualGroupTone = override.groupTone || 'stone';
      const manualPrimaryId = override.primaryId || statementId;

      metaById.set(statementId, {
        position: override.position || 1,
        total: override.total || 1,
        role: override.primaryId === statementId ? 'primary' : 'suspected',
        reason: 'Marked manually as duplicate',
        groupKey: manualGroupKey,
        groupLabel: manualGroupLabel,
        groupTone: manualGroupTone,
        primaryId: manualPrimaryId,
      });
    });

    return metaById;
  }, [displayStatements, duplicateOverrides, listHeaderLabels.scanning]);

  const selectableStatements = useMemo(() => displayStatements, [displayStatements]);
  const visibleStatements = useMemo(() => paginatedDisplayStatements, [paginatedDisplayStatements]);

  const visibleStatementIds = useMemo(
    () => visibleStatements.map(statement => statement.id),
    [visibleStatements],
  );

  const {
    selectedStatementIds,
    selectedActionsOpen,
    setSelectedActionsOpen,
    selectedActionsRef,
    allVisibleSelected,
    selectedCount,
    selectedDuplicateCount,
    hasSelectedDuplicates,
    duplicateStatementIds,
    handleToggleStatement,
    handleToggleSelectAll,
    handleExportSelected,
    handleDeleteSelected,
    handleMarkSelectedAsDuplicate,
    handleDismissSelectedDuplicates,
    handleSelectDetectedDuplicates,
    handleMergeSelectedDuplicates,
  } = useStatementSelection({
    displayStatements,
    visibleStatementIds,
    duplicateMetaById,
    setDuplicateOverrides,
    search,
    stage,
    onRefreshStatements: async opts => {
      await loadStatements({ ...opts });
    },
    onRefreshGmail: async opts => {
      await loadGmailReceipts({ ...opts });
    },
  });

  const loadManualExpenseOptions = async () => {
    try {
      const [categoriesResponse, taxRatesResponse] = await Promise.all([
        apiClient.get('/categories', { params: { type: 'expense' } }),
        apiClient.get('/tax-rates'),
      ]);

      const rawCategories = (categoriesResponse.data?.data ||
        categoriesResponse.data ||
        []) as StatementCategoryWithEnabled[];
      setManualExpenseCategories(filterEnabledCategories(rawCategories));

      const rawTaxRates = (taxRatesResponse.data?.data || taxRatesResponse.data || []) as Array<
        TaxRateOption & { rate: number | string }
      >;

      setManualExpenseTaxRates(
        rawTaxRates.map(taxRate => ({
          ...taxRate,
          rate: Number(taxRate.rate || 0),
          isEnabled: taxRate.isEnabled !== false,
        })),
      );
    } catch (error) {
      console.error('Failed to load manual expense options:', error);
      setManualExpenseCategories([]);
      setManualExpenseTaxRates([]);
    }
  };

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    isAtTop: () => {
      if (!listScrollRef.current) return true;
      return listScrollRef.current.scrollTop <= 0;
    },
    onRefresh: refreshActiveStatements,
  });

  useEffect(() => {
    const handleOpenExpenseDrawer = (event: Event) => {
      const customEvent = event as CustomEvent<OpenExpenseDrawerEventDetail>;
      setExpenseDrawerMode(resolveExpenseDrawerMode(customEvent.detail?.mode));
      setExpenseDrawerOpen(true);
    };

    window.addEventListener(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, handleOpenExpenseDrawer);

    return () => {
      window.removeEventListener(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, handleOpenExpenseDrawer);
    };
  }, []);

  useEffect(() => {
    if (stage !== 'submit') return;

    const requestedMode = searchParams.get('openExpenseDrawer');
    if (!requestedMode) return;

    setExpenseDrawerMode(resolveExpenseDrawerMode(requestedMode));
    setExpenseDrawerOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('openExpenseDrawer');

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/statements/submit?${nextQuery}` : '/statements/submit');
  }, [stage, searchParams, router]);

  const refreshStatementsAfterCreate = async () => {
    setPage(1);
    try {
      const didLoad = await loadStatements({
        search,
        notifyOnCompletion: false,
        showErrorToast: false,
      });
      if (!didLoad) {
        throw new Error('refresh-failed');
      }
    } catch (error) {
      console.error('Failed to refresh statements:', error);
      toast.error(resolveLabel(t.refreshFailed, 'Failed to refresh statements'));
    }
  };

  const refreshStatementsAfterAttach = () => {
    void loadStatements({
      silent: true,
      search,
      showErrorToast: false,
    });
  };

  const uploadLabels = {
    pickAtLeastOne: resolveLabel(t.uploadModal?.pickAtLeastOne, 'Select at least one file'),
    uploadedProcessing: resolveLabel(t.uploadModal?.uploadedProcessing, 'Files uploaded'),
    uploadFailed: resolveLabel(t.uploadModal?.uploadFailed, 'Failed to upload files'),
  };

  const handleUploadSuccess = (message: string) => {
    toast.success(message);
  };

  const uploadStatementFiles = async (
    files: File[],
    allowDuplicates: boolean,
    requireManualCategorySelection = false,
  ) =>
    runUploadStatementFiles({
      files,
      allowDuplicates,
      requireManualCategorySelection,
      labels: uploadLabels,
      onUploadSuccess: handleUploadSuccess,
      refreshAfterCreate: refreshStatementsAfterCreate,
    });

  const uploadReceiptScanFiles = async (files: File[]) =>
    runUploadReceiptScanFiles({
      files,
      labels: uploadLabels,
      onUploadSuccess: handleUploadSuccess,
      refreshAfterCreate: refreshStatementsAfterCreate,
    });

  const uploadScanDrawerFiles = async (payload: {
    files: File[];
    allowDuplicates: boolean;
    requireManualCategorySelection: boolean;
  }) =>
    runUploadScanDrawerFiles({
      payload,
      labels: uploadLabels,
      onUploadSuccess: handleUploadSuccess,
      refreshAfterCreate: refreshStatementsAfterCreate,
    });

  const handleCreateManualExpense = async (payload: {
    draft: ManualExpenseDraft;
    date: string;
    files: File[];
    allowDuplicates: boolean;
  }) => {
    const fallbackDefaultTaxRateId =
      manualExpenseTaxRates.find(taxRate => taxRate.isEnabled && taxRate.isDefault)?.id || '';
    const resolvedTaxRateId = payload.draft.taxRateId || fallbackDefaultTaxRateId;

    const buildPayload = () => {
      const formData = new FormData();
      formData.append('amount', payload.draft.amount.trim());
      formData.append('currency', payload.draft.currency.trim());
      formData.append('merchant', payload.draft.merchant.trim());
      formData.append('description', payload.draft.description.trim());
      formData.append('categoryId', payload.draft.categoryId);
      if (resolvedTaxRateId) {
        formData.append('taxRateId', resolvedTaxRateId);
      }
      formData.append('date', payload.date);
      formData.append('allowDuplicates', payload.allowDuplicates ? 'true' : 'false');
      payload.files.forEach(file => {
        formData.append('files', file);
      });
      return formData;
    };

    const candidateEndpoints = ['/statements/manual-expense', '/expenses/manual', '/expenses'];

    for (const endpoint of candidateEndpoints) {
      try {
        await apiClient.post(endpoint, buildPayload(), {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Manual expense created');
        await refreshStatementsAfterCreate();
        return;
      } catch (error: unknown) {
        const status = getApiErrorStatus(error);
        if (status === 404 || status === 405) {
          continue;
        }

        console.error('Failed to create manual expense:', error);
        throw new Error('Failed to create manual expense');
      }
    }

    throw new Error('Manual expense creation is not available yet');
  };

  const handleView = (statement: Statement) => {
    const action = resolveStatementViewAction(statement);

    router.push(action.href);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.statuses.length > 0) count += 1;
    if (appliedFilters.date?.preset || appliedFilters.date?.mode) count += 1;
    if (appliedFilters.from.length > 0) count += 1;
    if (appliedFilters.to.length > 0) count += 1;
    if (appliedFilters.keywords.trim()) count += 1;
    if (appliedFilters.amountMin !== null || appliedFilters.amountMax !== null) count += 1;
    if (appliedFilters.approved !== null) count += 1;
    if (appliedFilters.billable !== null) count += 1;
    if (appliedFilters.groupBy) count += 1;
    if (appliedFilters.has.length > 0) count += 1;
    if (appliedFilters.currencies.length > 0) count += 1;
    if (appliedFilters.exported !== null) count += 1;
    if (appliedFilters.paid !== null) count += 1;
    if (appliedFilters.limit !== null) count += 1;
    return count;
  }, [appliedFilters]);

  const visibleFilterScreens = useMemo(() => deriveVisibleFilterScreens(columns), [columns]);

  const updateFilter = (next: Partial<StatementFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...next }));
  };

  const applyFilterChanges = () => {
    setAppliedFilters(draftFilters);
    saveStatementFilters(draftFilters);
    setPage(1);
  };

  const applyAndClose = (close: () => void) => {
    applyFilterChanges();
    close();
  };

  const resetAndClose = (key: keyof StatementFilters, close: () => void) => {
    const next = resetSingleStatementFilter(draftFilters, key);
    setDraftFilters(next);
    setAppliedFilters(next);
    saveStatementFilters(next);
    close();
  };

  const resetAllFilters = () => {
    setDraftFilters(DEFAULT_STATEMENT_FILTERS);
    setAppliedFilters(DEFAULT_STATEMENT_FILTERS);
    saveStatementFilters(DEFAULT_STATEMENT_FILTERS);
    setPage(1);
  };

  const updateColumnsToggle = (id: StatementColumnId, visible: boolean) => {
    setDraftColumns(prev =>
      prev.map(column =>
        column.id === id
          ? {
              ...column,
              visible,
            }
          : column,
      ),
    );
  };

  const handleReorderColumns = (activeId: StatementColumnId, overId: StatementColumnId) => {
    setDraftColumns(prev => reorderStatementColumns(prev, activeId, overId));
  };

  const handleSaveColumns = () => {
    const next = draftColumns.map((column, index) => ({ ...column, order: index }));
    const { nextAppliedFilters, nextDraftFilters } = reconcileFiltersWithColumns({
      columns: next,
      appliedFilters,
      draftFilters,
    });

    setColumns(next);
    setDraftFilters(nextDraftFilters);
    setAppliedFilters(nextAppliedFilters);
    saveStatementColumns(next);
    saveStatementFilters(nextAppliedFilters);
    setColumnsDrawerOpen(false);
  };

  const handleColumnsOpen = () => {
    setDraftColumns(columns);
    setColumnsDrawerOpen(true);
  };

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        iconUrl?: string | null;
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
        iconUrl?: string | null;
        bankName?: string | null;
      },
    ) => {
      if (!seen.has(id)) {
        seen.set(id, option);
      }
    };

    stagedStatements.forEach(statement => {
      if (statement.user?.id) {
        addOption(`user:${statement.user.id}`, {
          id: `user:${statement.user.id}`,
          label: statement.user.name || statement.user.email || 'User',
          description: statement.user.email ? `@${statement.user.email.split('@')[0]}` : null,
          avatarUrl: statement.user.avatarUrl || null,
        });
      }
      if (statement.bankName) {
        addOption(`bank:${statement.bankName}`, {
          id: `bank:${statement.bankName}`,
          label: isGmailStatement(statement)
            ? 'Gmail'
            : isStoreReceiptStatement(statement)
              ? 'Receipt'
              : getBankDisplayName(statement.bankName),
          description: null,
          iconUrl: isGmailStatement(statement) ? '/icons/gmail.png' : null,
          bankName: statement.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [stagedStatements]);

  useEffect(() => {
    if (stage !== 'submit' || gmailSyncSkeletonKeys.length === 0) return;
    if (gmailReceipts.length === 0) return;
    setGmailSyncSkeletonKeys([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    }
  }, [stage, gmailReceipts.length, gmailSyncSkeletonKeys.length]);

  useEffect(() => {
    if (page > totalPagesCount) {
      setPage(totalPagesCount);
    }
  }, [page, totalPagesCount]);

  const toOptions = fromOptions;

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    stagedStatements.forEach(statement => {
      const currency = resolveStatementCurrency(statement);
      if (currency) {
        unique.add(currency);
      }
    });
    return Array.from(unique.values());
  }, [stagedStatements]);

  return (
    <div
      className="container-shared lumio-stmt-list-view"
      {...pullToRefreshHandlers}
    >
      {isMobile && (pullDistance > 0 || pullRefreshing) ? (
        <div className="lumio-stmt-list-view__pull-indicator">
          <div
            className={`lumio-stmt-list-view__pull-badge${isReadyToRefresh || pullRefreshing ? ' lumio-stmt-list-view__pull-badge--ready' : ''}`}
          >
            <RefreshCcw size={14} style={pullRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>
              {pullRefreshing
                ? 'Refreshing...'
                : isReadyToRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="lumio-stmt-list-view__header" style={{ marginBottom: 24, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="lumio-stmt-list-view__search" data-tour-id="search-bar">
            <Search className="lumio-stmt-list-view__search-icon" size={16} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="lumio-stmt-list-view__search-input"
            />
          </div>
        </div>
        {selectedCount > 0 ? (
          <>
            <div className="lumio-stmt-list-view__bulk-desktop" ref={selectedActionsRef}>
              <button
                type="button"
                onClick={() => setSelectedActionsOpen(prev => !prev)}
                className="lumio-stmt-list-view__bulk-trigger"
              >
                {selectedCount} selected
                <ChevronDown size={14} />
              </button>

              {selectedActionsOpen && (
                <div className="lumio-stmt-list-view__bulk-menu">
                  {hasSelectedDuplicates ? (
                    <>
                      <button
                        type="button"
                        onClick={handleMergeSelectedDuplicates}
                        className="lumio-stmt-list-view__bulk-menu-btn"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <GitMerge size={16} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: 'var(--primary)' }}>
                            {mergeDuplicatesLabel}
                          </span>
                        </span>
                        <ChevronRight size={16} style={{ color: '#c4cac4' }} />
                      </button>

                      <button
                        type="button"
                        onClick={handleDismissSelectedDuplicates}
                        className="lumio-stmt-list-view__bulk-menu-btn"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <X size={16} style={{ color: '#99a39d' }} />
                          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: '#0f3428' }}>
                            {dismissDuplicateLabel}
                          </span>
                        </span>
                        <ChevronRight size={16} style={{ color: '#c4cac4' }} />
                      </button>

                      <div className="lumio-stmt-list-view__bulk-menu-divider" />
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleMarkSelectedAsDuplicate}
                    className="lumio-stmt-list-view__bulk-menu-btn"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Copy size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: 'var(--primary)' }}>
                        {markDuplicateLabel}
                      </span>
                    </span>
                    <ChevronRight size={16} style={{ color: '#c4cac4' }} />
                  </button>

                  <>
                    <button
                      type="button"
                      onClick={handleExportSelected}
                      className="lumio-stmt-list-view__bulk-menu-btn"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Download size={16} style={{ color: '#99a39d' }} />
                        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: '#0f3428' }}>
                          Export
                        </span>
                      </span>
                      <ChevronRight size={16} style={{ color: '#c4cac4' }} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="lumio-stmt-list-view__bulk-menu-btn lumio-stmt-list-view__bulk-menu-btn--danger"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Trash2 size={16} style={{ color: '#dc2626' }} />
                        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: '#991b1b' }}>
                          Delete
                        </span>
                      </span>
                      <ChevronRight size={16} style={{ color: '#f0b5b5' }} />
                    </button>
                  </>
                </div>
              )}
            </div>

            <div className="lumio-stmt-list-view__mobile-bulk">
              <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{selectedCount} selected</span>
              <div className="lumio-stmt-list-view__mobile-bulk-actions">
                {hasSelectedDuplicates ? (
                  <>
                    <button
                      type="button"
                      onClick={handleMergeSelectedDuplicates}
                      className="lumio-stmt-list-view__mobile-action-btn lumio-stmt-list-view__mobile-action-btn--primary"
                    >
                      <GitMerge size={14} />
                      {mergeDuplicatesLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissSelectedDuplicates}
                      className="lumio-stmt-list-view__mobile-action-btn lumio-stmt-list-view__mobile-action-btn--secondary"
                    >
                      <X size={14} />
                      {dismissDuplicateLabel}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={handleMarkSelectedAsDuplicate}
                  className="lumio-stmt-list-view__mobile-action-btn lumio-stmt-list-view__mobile-action-btn--primary"
                >
                  <Copy size={14} />
                  {markDuplicateLabel}
                </button>
                <button
                  type="button"
                  onClick={handleExportSelected}
                  className="lumio-stmt-list-view__mobile-action-btn lumio-stmt-list-view__mobile-action-btn--secondary"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="lumio-stmt-list-view__mobile-action-btn lumio-stmt-list-view__mobile-action-btn--danger"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, overflowX: "auto" }}
            data-tour-id="statements-filters"
          >
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
                      filterLabels.type
                    : filterLabels.type}
                  <ChevronDown size={14} />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
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
                    ? `${filterLabels.status} (${draftFilters.statuses.length})`
                    : filterLabels.status}
                  <ChevronDown size={14} />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
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
                      : filterLabels.date}
                  <ChevronDown size={14} />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
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
                    ? `${filterLabels.from} (${draftFilters.from.length})`
                    : filterLabels.from}
                  <ChevronDown size={14} />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
            />

            {loading || duplicateStatementIds.length > 0 ? (
              <button
                type="button"
                className="lumio-stmt-list-view__duplicate-chip"
                onClick={handleSelectDetectedDuplicates}
                disabled={loading || duplicateStatementIds.length === 0}
              >
                <Copy size={14} />
                {selectDuplicatesLabel}
                <span className="lumio-stmt-list-view__duplicate-count">
                  {loading ? <Spinner size={12} /> : duplicateStatementIds.length}
                </span>
              </button>
            ) : null}

            <button
              type="button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", borderRadius: 0, padding: "6px 8px", fontSize: 13, fontWeight: 500, color: "var(--primary)", cursor: "pointer", background: "none", border: "none" }}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersDrawerScreen('root');
                setFiltersDrawerOpen(true);
              }}
            >
              <SlidersHorizontal size={14} />
              {filterLabels.filters}
              {activeFilterCount > 0 ? (
                <span style={{ marginLeft: 4, display: "inline-flex", height: 20, width: 20, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 10%, transparent)", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", borderRadius: 0, padding: "6px 8px", fontSize: 13, fontWeight: 500, color: "var(--primary)", cursor: "pointer", background: "none", border: "none" }} onClick={handleColumnsOpen}>
              <Columns2 size={14} />
              {filterLabels.columns}
            </button>
          </div>
        )}
      </div>

      <div
        ref={listScrollRef}
        data-tour-id="statements-table"
        className="lumio-stmt-list-view__body" style={{ paddingBottom: selectedCount > 0 ? 96 : 0 }}
      >
        {loading && gmailSyncSkeletonKeys.length === 0 ? (
          <div className="lumio-stmt-list-view__loading">
            <Spinner style={{ height: 80, width: 80, color: "var(--primary)" }} />
          </div>
        ) : displayStatements.length === 0 && gmailSyncSkeletonKeys.length === 0 ? (
          <div className="lumio-stmt-list-view__empty">
            <div style={{ margin: "0 auto 16px", display: "flex", height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#f9fafb", color: "#d1d5db" }}>
              <File size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>{emptyLabels.title}</h3>
            <p style={{ marginTop: 4, color: "#6b7280" }}>{emptyLabels.description}</p>
            {stage === 'submit' && hasGmailReceipts ? (
              <p style={{ marginTop: 8, fontSize: 14, color: "#6b7280" }}>Gmail receipts are loaded</p>
            ) : null}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={selectedCount > 0 && !allVisibleSelected}
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="Select all statements"
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#4b5563" }}>Select all</span>
              </div>
              <div className="lumio-stmt-list-view__desktop-header">
                <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginRight: 16 }}>
                    <div style={{ width: 16, display: "flex", justifyContent: "center", opacity: 0.7 }}>
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={selectedCount > 0 && !allVisibleSelected}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all statements"
                      />
                    </div>
                    <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                      <span className="sr-only">{listHeaderLabels.receipt}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                      {listHeaderLabels.merchant}
                      <span style={{ padding: "0 4px", color: "#d1d5db" }}>•</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          type="button"
                          data-testid="statements-date-sort"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", color: "inherit", padding: 0 }}
                          onClick={() =>
                            setDateSortDirection(current => (current === 'desc' ? 'asc' : 'desc'))
                          }
                          aria-label={`Sort by date ${
                            dateSortDirection === 'desc' ? 'ascending' : 'descending'
                          }`}
                        >
                          {listHeaderLabels.date}
                          <ArrowDown
                            size={12}
                            style={{ transition: "transform 0.2s", transform: dateSortDirection === 'asc' ? 'rotate(180deg)' : 'none' }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 24, flexShrink: 0, width: 420, paddingLeft: 16 }}>
                  <div style={{ width: 128, textAlign: "right", color: "#9ca3af", paddingRight: 4 }}>
                    {listHeaderLabels.amount}
                  </div>
                  <div style={{ width: 144, textAlign: "right", color: "#9ca3af" }}>{listHeaderLabels.action}</div>
                </div>
              </div>
              {gmailSyncSkeletonKeys.length > 0
                ? gmailSyncSkeletonKeys.map(key => (
                    <div
                      key={key}
                      data-testid="gmail-sync-skeleton-row"
                      className="lumio-stmt-list-view__skeleton-row"
                    >
                      <div className="lumio-stmt-list-view__skeleton-mobile">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ height: 16, width: 16, borderRadius: 0, border: "1px solid #e5e7eb", background: "#f3f4f6" }} />
                          <div style={{ width: 40 }}>
                            <Skeleton variant="rounded" width={34} height={34} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={16} />
                            <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Skeleton variant="text" width={80} height={14} />
                              <Skeleton variant="text" width={70} height={14} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lumio-stmt-list-view__skeleton-desktop">
                        <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginRight: 16 }}>
                            <div style={{ width: 16, display: "flex", justifyContent: "center" }}>
                              <div style={{ height: 16, width: 16, borderRadius: 0, border: "1px solid #e5e7eb", background: "#f3f4f6" }} />
                            </div>
                            <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Skeleton variant="rounded" width={28} height={28} />
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                            <Skeleton variant="text" width="45%" height={18} />
                            <Skeleton variant="text" width="25%" height={14} />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 24, flexShrink: 0, width: 420, paddingLeft: 16 }}>
                          <div style={{ width: 128, textAlign: "right" }}>
                            <Skeleton variant="text" width={90} height={20} />
                          </div>
                          <div style={{ width: 144, display: "flex", justifyContent: "flex-end" }}>
                            <Skeleton variant="rounded" width={72} height={30} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                : null}
              {paginatedDisplayStatements.map((statement, index) => {
                const isReceipt = statement.source === 'gmail' || statement.source === 'scan';
                const resolvedName = isReceipt
                  ? resolveGmailMerchantLabel({
                      vendor: statement.parsedData?.vendor,
                      sender: isGmailStatement(statement) ? statement.sender : undefined,
                      subject: statement.subject,
                      fallback: statement.fileName,
                    })
                  : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
                const merchantLabel = isReceipt
                  ? resolvedName
                  : getStatementMerchantLabel(
                      statement.status,
                      resolvedName,
                      listHeaderLabels.scanning,
                    );
                const isManualExpense = !isReceipt && isManualExpenseStatement(statement);
                const manualAttachmentCount = Number(
                  statement.parsingDetails?.importPreview?.attachments ?? 0,
                );
                const allowAttachFallback =
                  isManualExpense &&
                  !isReceipt &&
                  (manualAttachmentCount === 0 ||
                    statement.fileName.toLowerCase().startsWith('manual-expense-'));
                const isProcessingReceipt = isReceiptProcessing(statement);
                const isProcessingStatement = isStatementParsingInProgress(statement);
                const amountLabel = formatStatementAmount(statement);
                const dateLabel = formatStatementDate(statement);
                const duplicateMeta = duplicateMetaById.get(statement.id);
                const isPossibleDuplicate = Boolean(duplicateMeta);

                return (
                  <StatementsListItem
                    key={statement.id}
                    dataTourId={index === 0 ? 'statement-row-primary' : undefined}
                    statement={statement}
                    viewLabel={viewLabel}
                    isReceipt={isReceipt}
                    isProcessing={isProcessingReceipt}
                    merchantLabel={merchantLabel}
                    amountLabel={amountLabel}
                    dateLabel={dateLabel}
                    isPossibleDuplicate={isPossibleDuplicate}
                    duplicatePosition={duplicateMeta?.position}
                    duplicateGroupSize={duplicateMeta?.total}
                    duplicateRole={duplicateMeta?.role}
                    duplicateGroupLabel={duplicateMeta?.groupLabel}
                    duplicateGroupTone={duplicateMeta?.groupTone}
                    duplicateReason={duplicateMeta?.reason}
                    duplicateActionLabel={reviewDuplicateLabel}
                    typeLabel={isReceipt ? 'Receipt' : statement.fileType}
                    isManualExpense={isManualExpense}
                    viewDisabled={isProcessingStatement}
                    onView={() => handleView(statement)}
                    onIconClick={() => {
                      if (isReceipt) {
                        openPreview({
                          fileId: statement.id,
                          fileName: statement.fileName || 'receipt.pdf',
                          source: isGmailStatement(statement) ? 'gmail' : 'receipt',
                          allowAttachFile: false,
                        });
                        return;
                      }
                      openPreview({
                        fileId: statement.id,
                        fileName: statement.fileName,
                        source: 'statement',
                        allowAttachFile: allowAttachFallback,
                      });
                    }}
                    onToggleSelect={() => handleToggleStatement(statement.id)}
                    selected={selectedStatementIds.includes(statement.id)}
                  />
                );
              })}
            </div>
            <div className="lumio-stmt-list-view__pagination" style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                {formatPaginationLabel(paginationLabels.shown, {
                  from: rangeStart,
                  to: rangeEnd,
                  count: total,
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#4b5563", minWidth: 120, textAlign: "center" }}>
                  {formatPaginationLabel(paginationLabels.pageOf, {
                    page,
                    count: totalPagesCount,
                  })}
                </span>
                <AppPagination page={page} total={totalPagesCount} onChange={setPage} />
              </div>
            </div>
          </>
        )}
      </div>

      {preview.fileId && (
        <PDFPreviewModal
          isOpen={preview.isOpen}
          onClose={closePreview}
          fileId={preview.fileId}
          fileName={preview.fileName}
          source={preview.source}
          allowAttachFile={preview.allowAttachFile}
          onFileAttached={refreshStatementsAfterAttach}
          onParsingStarted={refreshStatementsAfterAttach}
        />
      )}
      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        visibleScreens={visibleFilterScreens}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={field => setFiltersDrawerScreen(field)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={toOptions}
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
          type: filterLabels.type,
          from: filterLabels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: filterLabels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: filterLabels.date,
          exported: filterOptionLabels.columnExported,
          paid: tx(['filters', 'paid'], 'Paid'),
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      <ColumnsDrawer
        open={columnsDrawerOpen}
        onClose={() => setColumnsDrawerOpen(false)}
        columns={columnsWithLabels}
        onToggle={updateColumnsToggle}
        onReorder={handleReorderColumns}
        onSave={handleSaveColumns}
        labels={{
          title: filterOptionLabels.columnsTitle,
          save: filterOptionLabels.save,
        }}
      />

      <CreateExpenseDrawer
        open={expenseDrawerOpen}
        initialMode={expenseDrawerMode}
        defaultCurrency={currentWorkspace?.currency ?? null}
        categories={manualExpenseCategories}
        taxRates={manualExpenseTaxRates}
        onClose={() => setExpenseDrawerOpen(false)}
        onSubmitScan={uploadScanDrawerFiles}
        onSubmitManual={handleCreateManualExpense}
      />
    </div>
  );
}
