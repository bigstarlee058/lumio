'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { enUS, kk, ru } from 'date-fns/locale';
import { CheckCircle, Plus, Printer, Search, Trash2, X, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomTableTanStack } from './CustomTableTanStack';
import { AddColumnModal } from './components/AddColumnModal';
import { PastePreviewModal } from './components/PastePreviewModal';
import { RowDrawer } from './components/RowDrawer';
import { useBulkRowActions } from './hooks/useBulkRowActions';
import {
  type ColumnFilterState,
  DEFAULT_COLUMN_WIDTH,
  useColumnConfig,
} from './hooks/useColumnConfig';
import { useColumnManagement } from './hooks/useColumnManagement';
import { useDeleteModals } from './hooks/useDeleteModals';
import { usePasteImport } from './hooks/usePasteImport';
import { useRowActions } from './hooks/useRowActions';
import { useRowDrawer } from './hooks/useRowDrawer';
import { useTabStats } from './hooks/useTabStats';
import { useTableData } from './hooks/useTableData';
import { useTableFilters } from './hooks/useTableFilters';
import { useTableGrid } from './hooks/useTableGrid';
import { useTableMeta } from './hooks/useTableMeta';
import { handleFullscreenEscapeNavigation } from './utils/fullscreenEscapeNavigation';
import {
  type QuickTab,
  buildQuickTabs,
  findPaidColumnKey,
  getActiveTabFilter,
  normalizeActiveTabId,
} from './utils/quickTabs';
import { isContentEditableTarget, tx } from './utils/tableHelpers';
import type { CustomTablePageColumn } from './utils/tableTypes';

type EditingScope = 'name' | 'description' | 'both';

export default function CustomTableDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTableDetailPage');
  const { locale } = useLocale();
  const tableId = params?.id;

  const dateFnsLocale = useMemo(() => {
    if (locale === 'ru') return ru;
    if (locale === 'kk') return kk;
    return enUS;
  }, [locale]);

  const [isFullscreen] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const handleBackNavigation = useCallback(() => {
    router.push('/custom-tables');
  }, [router]);
  const handlePrintTable = useCallback(() => {
    setIsPrintMode(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);
  const {
    table,
    setTable,
    categories,
    categoryId,
    setCategoryId,
    loading,
    loadTable,
    loadCategories,
  } = useTableData({
    tableId,
    isAuthenticated: Boolean(user),
    authLoading,
    loadTableFailedMessage: t.grid.loadTableFailed.value,
  });
  const [gridFiltersParam, setGridFiltersParam] = useState<string | undefined>(undefined);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const columnsTabId = '__columns__';

  const columnTypes = useMemo(
    () => [
      { value: 'text' as const, label: t.columnTypes.text.value },
      { value: 'number' as const, label: t.columnTypes.number.value },
      { value: 'date' as const, label: t.columnTypes.date.value },
      { value: 'boolean' as const, label: t.columnTypes.boolean.value },
      { value: 'select' as const, label: t.columnTypes.select.value },
      {
        value: 'multi_select' as const,
        label: t.columnTypes.multiSelect.value,
      },
    ],
    [t.columnTypes],
  );

  const pasteDefaults = useMemo(
    () => ({
      date: tx(t, ['paste', 'defaults', 'date'], 'Date'),
      type: tx(t, ['paste', 'defaults', 'type'], 'Type'),
      amount: tx(t, ['paste', 'defaults', 'amount'], 'Amount'),
      currency: tx(t, ['paste', 'defaults', 'currency'], 'Currency'),
      comment: tx(t, ['paste', 'defaults', 'comment'], 'Comment'),
      paid: tx(t, ['paste', 'defaults', 'paid'], 'Paid'),
      columnPrefix: tx(t, ['paste', 'defaults', 'columnPrefix'], 'Column'),
    }),
    [t],
  );

  const {
    deleteRowModalOpen,
    deleteRowTarget,
    requestDeleteRow,
    closeDeleteRowModal,
    bulkDeleteModalOpen,
    bulkDeleteRowIds,
    openBulkDeleteModal,
    closeBulkDeleteModal,
    deleteColumnModalOpen,
    deleteColumnTarget,
    openDeleteColumnModal,
    closeDeleteColumnModal,
  } = useDeleteModals();
  const [mounted, setMounted] = useState(false);

  /* original orderedColumns */
  const orderedColumns = useMemo(() => {
    const cols = table?.columns || [];
    return [...cols].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [table?.columns]);

  const {
    columnOrder,
    setColumnOrder,
    hiddenColumnKeys,
    setHiddenColumnKeys,
    columnFilters,
    setColumnFilters,
    columnWidths,
    getColumnWidth,
    persistColumnWidth,
    toggleColumnHidden,
    moveColumn,
    resetColumns,
  } = useColumnConfig({
    tableId,
    orderedColumns,
    viewSettings: table?.viewSettings,
    isAuthenticated: Boolean(user),
    columnWidthSaveFailedMessage: t.grid.columnWidthSaveFailed.value,
  });

  const paidColKey = useMemo(() => findPaidColumnKey(orderedColumns), [orderedColumns]);

  const { tabCounts, refreshStats } = useTabStats({
    tableId,
    isAuthenticated: Boolean(user),
    paidColKey,
  });

  const orderedVisibleColumns = useMemo(() => {
    const columnsByKey = new Map(orderedColumns.map(c => [c.key, c]));
    const orderedKeys = columnOrder.length ? columnOrder : orderedColumns.map(c => c.key);
    const hiddenSet = new Set(hiddenColumnKeys);
    const ordered = orderedKeys
      .map(key => columnsByKey.get(key))
      .filter(Boolean) as CustomTablePageColumn[];
    return ordered.filter(col => !hiddenSet.has(col.key));
  }, [orderedColumns, columnOrder, hiddenColumnKeys]);

  const isColumnsDefault = useMemo(() => {
    const defaultKeys = orderedColumns.map(c => c.key);
    const currentOrder = columnOrder.length ? columnOrder : defaultKeys;
    if (currentOrder.length !== defaultKeys.length) return false;
    for (let i = 0; i < defaultKeys.length; i += 1) {
      if (currentOrder[i] !== defaultKeys[i]) return false;
    }
    return hiddenColumnKeys.length === 0;
  }, [orderedColumns, columnOrder, hiddenColumnKeys]);

  const displayColumns = useMemo(() => {
    return orderedVisibleColumns.map(c => {
      if (c.key === paidColKey) {
        return { ...c, title: tx(t, ['paidColumn'], c.title) };
      }
      return c;
    });
  }, [orderedVisibleColumns, paidColKey, t]);

  const dateColKey = useMemo(() => {
    const col = orderedColumns.find(c => c.type === 'date');
    return col?.key || null;
  }, [orderedColumns]);

  const counterpartyColKey = useMemo(() => {
    const re = /(контрагент|counterparty|counter party|client|customer|payer|payee|partner)/i;
    const col = orderedColumns.find(c => re.test(`${c.title ?? ''} ${c.key ?? ''}`));
    return col?.key || null;
  }, [orderedColumns]);

  const stickyLeftColumnIds = useMemo(
    () =>
      ['__select', dateColKey || undefined, counterpartyColKey || undefined].filter(
        Boolean,
      ) as string[],
    [dateColKey, counterpartyColKey],
  );

  const stickyRightColumnIds = useMemo(() => ['__actions'], []);

  const quickTabs = useMemo<QuickTab[]>(() => {
    return buildQuickTabs({
      labels: {
        all: tx(t, ['tabs', 'all'], 'All'),
        paid: tx(t, ['tabs', 'paid'], 'Paid'),
        unpaid: tx(t, ['tabs', 'unpaid'], 'Unpaid'),
      },
      paidColKey,
      tabCounts: {
        paid: tabCounts.paid,
        unpaid: tabCounts.unpaid,
      },
    });
  }, [paidColKey, t, tabCounts.paid, tabCounts.unpaid]);

  const normalizedActiveTabId = useMemo(
    () => normalizeActiveTabId(activeTabId, quickTabs, columnsTabId),
    [activeTabId, quickTabs, columnsTabId],
  );

  useEffect(() => {
    if (normalizedActiveTabId !== activeTabId) {
      setActiveTabId(normalizedActiveTabId);
    }
  }, [activeTabId, normalizedActiveTabId]);

  const activeTabFilter = useMemo(
    () => getActiveTabFilter(normalizedActiveTabId, quickTabs, columnsTabId),
    [normalizedActiveTabId, quickTabs, columnsTabId],
  );

  useEffect(() => {
    setSelectedRowIds([]);
  }, [normalizedActiveTabId]);

  useEffect(() => {
    const allowed = new Set(orderedColumns.map(c => c.key));
    setSelectedColumnKeys(prev => prev.filter(k => allowed.has(k)));
  }, [orderedColumns]);

  const gridColumnWidths = useMemo(() => {
    const next: Record<string, number> = {};
    for (const col of orderedColumns) {
      next[col.key] = getColumnWidth(col.key);
    }
    return next;
  }, [orderedColumns, columnWidths]);

  const {
    editingMeta,
    metaDraft,
    savingMeta,
    editingScope,
    setEditingMeta,
    setMetaDraft,
    setEditingScope,
    cancelEditMeta,
    saveMeta,
  } = useTableMeta({
    tableId,
    table,
    loadTable,
    messages: {
      nameRequired: t.meta.nameRequired.value,
      saved: t.meta.saved.value,
      saveFailed: t.meta.saveFailed.value,
    },
  });

  const onGridFiltersParamChange = (next: string | undefined) => {
    if (next === gridFiltersParam) return;
    setGridFiltersParam(next);
  };

  const { combinedFiltersParam } = useTableFilters({
    orderedColumns,
    columnFilters,
    gridFiltersParam,
    activeTabFilter,
    searchQuery,
    dateFnsLocale,
  });

  const { rows, setRows, loadingRows, hasMore, loadRows } = useTableGrid({
    tableId,
    isAuthenticated: Boolean(user),
    combinedFiltersParam,
    loadRowsFailedMessage: t.grid.loadRowsFailed.value,
  });

  const {
    rowDrawerOpen,
    rowDrawerMode,
    rowDrawerRowId,
    drawerRow,
    setRowDrawerMode,
    openRowDrawer,
    closeRowDrawer,
  } = useRowDrawer(rows);

  const handleInsertSuccess = useCallback(
    (createdCount: number, onUndo: () => void) => {
      const undoWindowMs = 8000;
      let undoExpired = false;
      const timeoutId = window.setTimeout(() => {
        undoExpired = true;
      }, undoWindowMs);
      const toastId = toast.custom(
        toastProps => (
          <div
            className={`${
              toastProps.visible ? 'animate-enter' : 'animate-leave'
            } flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg`}
          >
            <span className="text-sm text-gray-800">
              {tx(t, ['paste', 'addedPrefix'], 'Added ')}
              {createdCount}
              {tx(t, ['paste', 'addedSuffix'], ' rows')}
            </span>
            <button
              type="button"
              onClick={() => {
                if (undoExpired) return;
                undoExpired = true;
                window.clearTimeout(timeoutId);
                toast.dismiss(toastId);
                onUndo();
              }}
              className="text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {tx(t, ['paste', 'undo'], 'Undo')}
            </button>
          </div>
        ),
        { duration: undoWindowMs },
      );
    },
    [t],
  );

  const {
    pastePreviewOpen,
    pasteParsing,
    pasteApplying,
    pasteUseHeaders,
    pastePreview,
    hasMissingPasteColumnTitles,
    resetPastePreview,
    handlePasteHeadersToggle,
    handlePasteCellChange,
    handlePasteAdd,
  } = usePasteImport({
    tableId,
    orderedColumns,
    pasteDefaults,
    loadTable,
    refreshStats,
    setRows,
    onInsertSuccess: handleInsertSuccess,
    messages: {
      noRows: tx(t, ['paste', 'noRows'], 'No rows found'),
      missingColumnTitle: tx(t, ['paste', 'missingColumnTitle'], 'Missing column title'),
      insertFailed: tx(t, ['paste', 'insertFailed'], 'Failed to insert rows'),
      undoFailed: tx(t, ['paste', 'undoFailed'], 'Failed to undo insert'),
    },
  });

  const displayRows = useMemo(() => rows, [rows]);

  // Reset row selection when filters change
  useEffect(() => {
    setSelectedRowIds([]);
  }, [combinedFiltersParam]);

  useEffect(() => {
    if (!selectedRowIds.length) return;
    const visibleIds = new Set(displayRows.map(r => r.id));
    setSelectedRowIds(prev => prev.filter(id => visibleIds.has(id)));
  }, [displayRows, selectedRowIds.length]);

  useEffect(() => {
    if (!user) return;
    if (isFullscreen) {
      document.body.classList.add('ff-table-fullscreen');
    } else {
      document.body.classList.remove('ff-table-fullscreen');
    }
    if (isFullscreen && normalizedActiveTabId === columnsTabId) {
      document.body.classList.add('ff-table-columns-scroll');
    } else {
      document.body.classList.remove('ff-table-columns-scroll');
    }
    return () => {
      document.body.classList.remove('ff-table-fullscreen');
      document.body.classList.remove('ff-table-columns-scroll');
    };
  }, [isFullscreen, user, normalizedActiveTabId, columnsTabId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag && ['input', 'textarea', 'select'].includes(tag)) return;
      if (target && isContentEditableTarget(target) && target.isContentEditable) return;
      handleFullscreenEscapeNavigation(event.key, handleBackNavigation);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackNavigation, isFullscreen]);

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrintMode(true);
    };
    const handleAfterPrint = () => {
      setIsPrintMode(false);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const {
    createRow,
    updateCellFromGrid,
    updateRowFromDrawer,
    updateRowStyle,
    saveRowFromDrawer,
    saveRowAndCloseDrawer,
    saveRowAndNext,
  } = useRowActions({
    tableId,
    paidColKey,
    rows,
    displayRows,
    setRows,
    refreshStats,
    openRowDrawer,
    closeRowDrawer,
    messages: {
      addRowLoading: t.addRow.loading.value,
      addRowSuccess: t.addRow.success.value,
      addRowFailed: t.addRow.failed.value,
      saveValueFailed: t.grid.saveValueFailed.value,
      noMoreRows: tx(t, ['toasts', 'noMoreRows'], 'No more rows'),
    },
  });

  const { bulkMarking, deleteRow, deleteSelectedRows, markSelectedRowsPaid } = useBulkRowActions({
    tableId,
    paidColKey,
    selectedRowIds,
    setSelectedRowIds,
    deleteRowTarget,
    bulkDeleteRowIds,
    closeDeleteRowModal,
    closeBulkDeleteModal,
    rows,
    setRows,
    setTable,
    refreshStats,
    messages: {
      deleteRowLoading: t.deleteRow.loading.value,
      deleteRowSuccess: t.deleteRow.success.value,
      deleteRowFailed: t.deleteRow.failed.value,
      bulkDeleteLoading: t.bulkDeleteRows.loading.value,
      bulkDeleteSuccess: t.bulkDeleteRows.success.value,
      bulkDeleteFailed: t.bulkDeleteRows.failed.value,
      creatingPaidColumn: tx(t, ['toasts', 'creatingPaidColumn'], 'Creating Paid column'),
      paidColumnCreated: tx(t, ['toasts', 'paidColumnCreated'], 'Paid column created'),
      paidColumnCreateFailed: tx(
        t,
        ['toasts', 'paidColumnCreateFailed'],
        'Failed to create Paid column',
      ),
      markingPaid: tx(t, ['actions', 'markingPaid'], 'Marking paid'),
      markingUnpaid: tx(t, ['actions', 'markingUnpaid'], 'Marking unpaid'),
      markedPaid: tx(t, ['toasts', 'markedPaid'], 'Marked paid'),
      markedUnpaid: tx(t, ['toasts', 'markedUnpaid'], 'Marked unpaid'),
      updateSomeRowsFailed: tx(t, ['toasts', 'updateSomeRowsFailed'], 'Failed to update some rows'),
      updateRowsFailed: tx(t, ['toasts', 'updateRowsFailed'], 'Failed to update rows'),
      paidColumnTitle: tx(t, ['paidColumn'], 'Paid'),
    },
  });

  const {
    newColumnOpen,
    setNewColumnOpen,
    newColumn,
    setNewColumn,
    createColumn,
    deleteColumn,
    renameColumnTitleFromGrid,
  } = useColumnManagement({
    tableId,
    orderedColumns,
    loadTable,
    deleteColumnTarget,
    closeDeleteColumnModal,
    messages: {
      addColumnLoading: t.addColumn.loading.value,
      addColumnSuccess: t.addColumn.success.value,
      addColumnFailed: t.addColumn.failed.value,
      deleteColumnLoading: t.deleteColumn.loading.value,
      deleteColumnSuccess: t.deleteColumn.success.value,
      deleteColumnFailed: t.deleteColumn.failed.value,
      renameColumnSuccess: t.renameColumn.success.value,
      renameColumnFailed: t.renameColumn.failed.value,
    },
  });

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.auth.loading}
      </div>
    );
  }
  if (!user || !table) {
    return (
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {!user ? t.auth.loginRequired : t.errors.notFound}
        </div>
      </div>
    );
  }
  if (!mounted)
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.auth.loading}
      </div>
    );

  return (
    <div
      className={
        isFullscreen
          ? `h-screen w-screen bg-white ${isPrintMode ? 'overflow-visible' : 'overflow-hidden'}`
          : 'container-shared px-4 sm:px-6 lg:px-8 py-8'
      }
      style={isFullscreen ? { paddingTop: isPrintMode ? '0' : '80px' } : undefined}
    >
      <div
        className={
          isFullscreen
            ? `fixed top-0 left-0 right-0 z-50 bg-white px-4 sm:px-6 pt-5 border-x border-t border-gray-200 rounded-t-xl ${
                normalizedActiveTabId === columnsTabId ? 'bottom-0 overflow-y-auto pb-6' : 'pb-0'
              } ${isPrintMode ? 'custom-table-print-controls' : ''}`
            : `mb-0 flex flex-col gap-0 ${isPrintMode ? 'custom-table-print-controls' : ''}`
        }
      >
        {/* Row 1: Tabs */}
        <div className="flex w-full items-end justify-between gap-3 border-b border-gray-100 px-2">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex shrink-0 items-center gap-1.5 pb-3 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            <span>{t.nav.back.value}</span>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-5 overflow-x-auto">
            {quickTabs.map(tab => {
              const isActive = normalizedActiveTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (normalizedActiveTabId === tab.id) return;
                    setActiveTabId(tab.id);
                  }}
                  className={`relative shrink-0 whitespace-nowrap pb-3 text-sm font-medium transition-all ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {tab.label}
                  {typeof tab.count === 'number' && (
                    <span
                      className={`ml-2 text-xs py-0.5 px-2 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                if (normalizedActiveTabId === columnsTabId) return;
                setActiveTabId(columnsTabId);
              }}
              className={`relative shrink-0 whitespace-nowrap pb-3 text-sm font-medium transition-all ${
                normalizedActiveTabId === columnsTabId
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tx(t, ['actions', 'columns'], 'Columns')}
              {normalizedActiveTabId === columnsTabId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {normalizedActiveTabId !== columnsTabId && (
          <div className="mt-3 w-full px-2 pb-3">
            <div className="flex items-center justify-between gap-2 overflow-x-auto sm:overflow-visible">
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => markSelectedRowsPaid(true)}
                  disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium transition-colors sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-gray-600 hover:bg-gray-50 hover:text-green-600' : 'text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <CheckCircle
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-green-500' : 'text-green-500/50'}`}
                  />
                  <span>
                    {bulkMarking === 'paid'
                      ? tx(t, ['actions', 'markingPaid'], 'Marking paid')
                      : tx(t, ['actions', 'markPaid'], 'Mark paid')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => markSelectedRowsPaid(false)}
                  disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium transition-colors sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-gray-600 hover:bg-gray-50 hover:text-red-500' : 'text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <XCircle
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-red-500' : 'text-red-500/50'}`}
                  />
                  <span>
                    {bulkMarking === 'unpaid'
                      ? tx(t, ['actions', 'markingUnpaid'], 'Marking unpaid')
                      : tx(t, ['actions', 'markUnpaid'], 'Mark unpaid')}
                  </span>
                </button>
                <button
                  onClick={handlePrintTable}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs"
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{tx(t, ['actions', 'print'], 'Print')}</span>
                </button>
                <button
                  onClick={() => openBulkDeleteModal(selectedRowIds)}
                  disabled={selectedRowIds.length === 0}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{tx(t, ['actions', 'delete'], 'Delete')}</span>
                </button>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    placeholder={tx(t, ['actions', 'searchPlaceholder'], 'Search')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm w-48 lg:w-80 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {normalizedActiveTabId === columnsTabId && (
          <div className="w-full px-2 pb-4 pt-4 sm:px-4">
            <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <ul className="divide-y divide-gray-200">
                  {(columnOrder.length ? columnOrder : orderedColumns.map(c => c.key)).map(key => {
                    const col = orderedColumns.find(c => c.key === key);
                    if (!col) return null;
                    const isHidden = hiddenColumnKeys.includes(col.key);
                    return (
                      <li key={col.key} className="list-none">
                        <div
                          className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors sm:px-5 sm:py-3.5 sm:text-base ${
                            isHidden ? 'text-gray-400' : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate font-medium">{col.title || col.key}</span>
                          <Checkbox
                            checked={!isHidden}
                            onCheckedChange={() => toggleColumnHidden(col.key)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 sm:h-5 sm:w-5"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button
                type="button"
                onClick={resetColumns}
                disabled={isColumnsDefault}
                className="w-full rounded-xl border border-primary bg-primary/10 px-5 py-3.5 text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10"
              >
                {tx(t, ['actions', 'columnsReset'], 'Reset columns')}
              </button>
            </div>
          </div>
        )}

        <AddColumnModal
          t={t}
          isOpen={newColumnOpen}
          onClose={() => setNewColumnOpen(false)}
          newColumn={newColumn}
          setNewColumn={setNewColumn}
          createColumn={createColumn}
          columnTypes={columnTypes}
        />
      </div>

      <div className={isFullscreen ? 'h-full w-full pt-0 custom-table-print-target' : 'mt-0'}>
        <div
          className={
            isFullscreen
              ? 'h-full w-full bg-white transition-all duration-300 max-w-[1920px] mx-auto'
              : 'rounded-xl border border-gray-200 bg-white'
          }
        >
          {normalizedActiveTabId !== columnsTabId && (
            <CustomTableTanStack
              tableId={tableId as string}
              columns={displayColumns}
              rows={displayRows}
              selectedRowIds={selectedRowIds}
              columnWidths={gridColumnWidths}
              isFullscreen={isFullscreen}
              loadingRows={loadingRows}
              hasMore={hasMore}
              stickyLeftColumnIds={stickyLeftColumnIds}
              stickyRightColumnIds={stickyRightColumnIds}
              showAddRow={normalizedActiveTabId === 'all'}
              onLoadMore={loadRows}
              onFiltersParamChange={onGridFiltersParamChange}
              onUpdateCell={updateCellFromGrid}
              onUpdateRowStyle={updateRowStyle}
              onCreateRow={createRow}
              onViewRow={rowId => openRowDrawer(rowId, 'view')}
              onEditRow={rowId => openRowDrawer(rowId, 'edit')}
              onDeleteRow={rowId => requestDeleteRow(rows, rowId)}
              onPersistColumnWidth={persistColumnWidth}
              selectedColumnKeys={selectedColumnKeys}
              onSelectedColumnKeysChange={setSelectedColumnKeys}
              onRenameColumnTitle={renameColumnTitleFromGrid}
              onDeleteColumn={colKey => {
                const targetColumn = orderedColumns.find(c => c.key === colKey);
                if (targetColumn) openDeleteColumnModal(targetColumn);
              }}
              onSelectedRowIdsChange={setSelectedRowIds}
              onAddColumnClick={() => setNewColumnOpen(true)}
              isPrintMode={isPrintMode}
            />
          )}
        </div>
      </div>

      {normalizedActiveTabId !== columnsTabId && (
        <div
          className={`mt-4 flex items-center justify-center ${isPrintMode ? 'custom-table-print-controls' : ''}`}
        >
          <button
            onClick={() => loadRows({ filtersParam: combinedFiltersParam })}
            disabled={!hasMore || loadingRows}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingRows ? t.grid.loadingMore : hasMore ? t.grid.loadMore : t.grid.noMore}
          </button>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .custom-table-print-controls {
            display: none !important;
          }

          .custom-table-print-target {
            width: 100% !important;
            height: auto !important;
            padding-top: 0 !important;
            margin: 0 !important;
          }

          .custom-table-container {
            width: 100% !important;
          }

          .custom-table-container > div {
            height: auto !important;
            overflow: visible !important;
            border: 0 !important;
            padding-top: 0 !important;
          }

          .custom-table-container table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: auto !important;
          }

          .custom-table-container thead {
            position: static !important;
          }

          .custom-table-container th,
          .custom-table-container td {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            white-space: normal !important;
            word-break: break-word !important;
          }

          .custom-table-container [class*='sticky'] {
            position: static !important;
          }

          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <PastePreviewModal
        t={t}
        isOpen={pastePreviewOpen}
        onClose={resetPastePreview}
        pasteApplying={pasteApplying}
        pasteParsing={pasteParsing}
        pastePreview={pastePreview}
        pasteUseHeaders={pasteUseHeaders}
        hasMissingPasteColumnTitles={hasMissingPasteColumnTitles}
        onHeadersToggle={handlePasteHeadersToggle}
        onCellChange={handlePasteCellChange}
        onConfirm={handlePasteAdd}
      />

      <RowDrawer
        open={rowDrawerOpen}
        mode={rowDrawerMode}
        row={drawerRow}
        columns={orderedColumns}
        onClose={closeRowDrawer}
        onModeChange={setRowDrawerMode}
        onSave={saveRowFromDrawer}
        onSaveAndClose={saveRowAndCloseDrawer}
        onSaveAndNext={saveRowAndNext}
      />

      <ConfirmModal
        isOpen={deleteColumnModalOpen}
        onClose={closeDeleteColumnModal}
        onConfirm={deleteColumn}
        title={t.deleteColumn.confirmTitle.value}
        message={
          deleteColumnTarget
            ? `${t.deleteColumn.confirmWithNamePrefix.value}${deleteColumnTarget.title}${t.deleteColumn.confirmWithNameSuffix.value}`
            : t.deleteColumn.confirmNoName.value
        }
        confirmText={t.deleteColumn.confirm.value}
        cancelText={tx(t, ['deleteColumn', 'cancel'], 'Cancel')}
        isDestructive
      />

      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={closeBulkDeleteModal}
        onConfirm={deleteSelectedRows}
        title={tx(t, ['bulkDeleteRows', 'confirmTitle'], 'Delete selected rows')}
        message={`${tx(t, ['bulkDeleteRows', 'confirmMessagePrefix'], '')}${(
          bulkDeleteRowIds.length || selectedRowIds.length
        ).toString()}${tx(t, ['bulkDeleteRows', 'confirmMessageSuffix'], '')}`}
        confirmText={tx(t, ['bulkDeleteRows', 'confirm'], 'Delete')}
        cancelText={tx(t, ['bulkDeleteRows', 'cancel'], 'Cancel')}
        isDestructive
      />

      <ConfirmModal
        isOpen={deleteRowModalOpen}
        onClose={closeDeleteRowModal}
        onConfirm={deleteRow}
        title={tx(t, ['deleteRow', 'confirmTitle'], 'Delete row')}
        message={
          deleteRowTarget
            ? `${tx(t, ['deleteRow', 'confirmWithNumberPrefix'], '')}${deleteRowTarget?.rowNumber ?? ''}${tx(t, ['deleteRow', 'confirmWithNumberSuffix'], '')}`
            : tx(t, ['deleteRow', 'confirmNoNumber'], 'Delete this row?')
        }
        confirmText={tx(t, ['deleteRow', 'confirm'], 'Delete')}
        cancelText={tx(t, ['deleteRow', 'cancel'], 'Cancel')}
        isLoading={false}
        isDestructive
      />
    </div>
  );
}
