'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { Box, Typography } from '@mui/material';
import { enUS, kk, ru } from 'date-fns/locale';
import { ArrowLeft as ArrowBackIcon, CheckCircle, Printer, Search, Trash2, X, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomTableTanStack } from './CustomTableTanStack';
import { AddColumnModal } from './components/AddColumnModal';
import { ColumnsVisibilityPanel } from './components/ColumnsVisibilityPanel';
import { PastePreviewModal } from './components/PastePreviewModal';
import { RowDrawer } from './components/RowDrawer';
import { useBulkRowActions } from './hooks/useBulkRowActions';
import { useColumnConfig } from './hooks/useColumnConfig';
import { useColumnManagement } from './hooks/useColumnManagement';
import { useDeleteModals } from './hooks/useDeleteModals';
import { usePasteImport } from './hooks/usePasteImport';
import { useRowActions } from './hooks/useRowActions';
import { useRowDrawer } from './hooks/useRowDrawer';
import { useTabStats } from './hooks/useTabStats';
import { useTableData } from './hooks/useTableData';
import { useTableFilters } from './hooks/useTableFilters';
import { useTableGrid } from './hooks/useTableGrid';
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
  const { table, setTable, loading, loadTable } = useTableData({
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
    hiddenColumnKeys,
    columnFilters,
    columnWidths,
    getColumnWidth,
    persistColumnWidth,
    toggleColumnHidden,
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

  const stickyLeftColumnIds = useMemo(() => [], []);

  const stickyRightColumnIds = useMemo(() => [], []);

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
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid #e5e7eb', bgcolor: 'background.paper', px: 2, py: 1.5, boxShadow: 3, opacity: toastProps.visible ? 1 : 0 }}
          >
            <Typography style={{ fontSize: 14, color: '#1f2937' }}>
              {tx(t, ['paste', 'addedPrefix'], 'Added ')}
              {createdCount}
              {tx(t, ['paste', 'addedSuffix'], ' rows')}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => {
                if (undoExpired) return;
                undoExpired = true;
                window.clearTimeout(timeoutId);
                toast.dismiss(toastId);
                onUndo();
              }}
              sx={{ fontSize: 14, fontWeight: 600, color: 'primary.main', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: 'primary.dark' } }}
            >
              {tx(t, ['paste', 'undo'], 'Undo')}
            </Box>
          </Box>
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
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        {t.auth.loading}
      </Box>
    );
  }
  if (!user || !table) {
    return (
      <Box className="container-shared" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box sx={{ border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 3, fontSize: 14, color: '#4b5563' }}>
          {!user ? t.auth.loginRequired : t.errors.notFound}
        </Box>
      </Box>
    );
  }
  if (!mounted)
    return (
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        {t.auth.loading}
      </Box>
    );

  return (
    <Box
      sx={isFullscreen
        ? { height: '100vh', width: '100vw', bgcolor: 'background.paper', overflow: isPrintMode ? 'visible' : 'hidden' }
        : {}}
      className={isFullscreen ? undefined : 'container-shared'}
      style={isFullscreen ? { paddingTop: isPrintMode ? '0' : '150px' } : { padding: '32px 16px' }}
    >
      <Box
        sx={isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              bgcolor: 'background.paper',
              px: { xs: 2, sm: 3 },
              pt: 2.5,
              borderLeft: '1px solid #e5e7eb',
              borderRight: '1px solid #e5e7eb',
              borderTop: '1px solid #e5e7eb',
              ...(normalizedActiveTabId === columnsTabId ? { bottom: 0, overflowY: 'auto', pb: 3 } : { pb: 0 }),
            }
          : { mb: 0, display: 'flex', flexDirection: 'column', gap: 0 }}
        className={isPrintMode ? 'custom-table-print-controls' : undefined}
      >
        {/* Row 1: Tabs */}
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid #f3f4f6', px: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={handleBackNavigation}
            sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 0.75, pb: 1.5, fontSize: 14, fontWeight: 500, color: '#4b5563', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: '#111827' } }}
          >
            <ArrowBackIcon size={16} />
            <span>{t.nav.back.value}</span>
          </Box>

          <Box sx={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2.5, overflowX: 'auto' }}>
            {quickTabs.map(tab => {
              const isActive = normalizedActiveTabId === tab.id;
              return (
                <Box
                  key={tab.id}
                  component="button"
                  onClick={() => {
                    if (normalizedActiveTabId === tab.id) return;
                    setActiveTabId(tab.id);
                  }}
                  sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: isActive ? 'primary.main' : '#6b7280', '&:hover': { color: isActive ? 'primary.main' : '#111827' } }}
                >
                  {tab.label}
                  {typeof tab.count === 'number' && (
                    <Box
                      component="span"
                      sx={{ ml: 0.75, fontSize: 12, py: 0.25, px: 1, bgcolor: isActive ? 'rgba(22,129,24,0.1)' : '#f3f4f6', color: isActive ? 'primary.main' : '#6b7280' }}
                    >
                      {tab.count}
                    </Box>
                  )}
                  {isActive && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />
                  )}
                </Box>
              );
            })}
            <Box
              component="button"
              type="button"
              onClick={() => {
                if (normalizedActiveTabId === columnsTabId) return;
                setActiveTabId(columnsTabId);
              }}
              sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: normalizedActiveTabId === columnsTabId ? 'primary.main' : '#6b7280', '&:hover': { color: normalizedActiveTabId === columnsTabId ? 'primary.main' : '#111827' } }}
            >
              {tx(t, ['actions', 'columns'], 'Columns')}
              {normalizedActiveTabId === columnsTabId && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />
              )}
            </Box>
          </Box>
        </Box>

        {normalizedActiveTabId !== columnsTabId && (
          <Box sx={{ mt: 1.5, width: '100%', px: 1, pb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, overflowX: 'auto' }}>
              <Box sx={{ display: 'flex', minWidth: 0, flexWrap: 'nowrap', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => markSelectedRowsPaid(true)}
                  disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                  sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid #e5e7eb', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: (selectedRowIds.length > 0 && bulkMarking === null) ? '#4b5563' : '#9ca3af', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                >
                  <CheckCircle
                    style={{ width: 14, height: 14, color: (selectedRowIds.length > 0 && bulkMarking === null) ? '#22c55e' : 'rgba(34,197,94,0.5)' }}
                  />
                  <span>
                    {bulkMarking === 'paid'
                      ? tx(t, ['actions', 'markingPaid'], 'Marking paid')
                      : tx(t, ['actions', 'markPaid'], 'Mark paid')}
                  </span>
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => markSelectedRowsPaid(false)}
                  disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                  sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid #e5e7eb', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: (selectedRowIds.length > 0 && bulkMarking === null) ? '#4b5563' : '#9ca3af', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                >
                  <XCircle
                    style={{ width: 14, height: 14, color: (selectedRowIds.length > 0 && bulkMarking === null) ? '#ef4444' : 'rgba(239,68,68,0.5)' }}
                  />
                  <span>
                    {bulkMarking === 'unpaid'
                      ? tx(t, ['actions', 'markingUnpaid'], 'Marking unpaid')
                      : tx(t, ['actions', 'markUnpaid'], 'Mark unpaid')}
                  </span>
                </Box>
                <Box
                  component="button"
                  onClick={handlePrintTable}
                  sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid #e5e7eb', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: '#4b5563', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb', color: '#111827' } }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{tx(t, ['actions', 'print'], 'Print')}</span>
                </Box>
                <Box
                  component="button"
                  onClick={() => openBulkDeleteModal(selectedRowIds)}
                  disabled={selectedRowIds.length === 0}
                  sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid #e5e7eb', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: '#4b5563', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { borderColor: '#fecaca', bgcolor: '#fef2f2', color: '#dc2626' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{tx(t, ['actions', 'delete'], 'Delete')}</span>
                </Box>
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                  <input
                    placeholder={tx(t, ['actions', 'searchPlaceholder'], 'Search')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, fontSize: 14, width: 192, border: '1px solid #e5e7eb', background: 'var(--card-bg)', outline: 'none' }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {normalizedActiveTabId === columnsTabId && (
          <ColumnsVisibilityPanel
            t={t}
            columnOrder={columnOrder}
            orderedColumns={orderedColumns}
            hiddenColumnKeys={hiddenColumnKeys}
            isColumnsDefault={isColumnsDefault}
            toggleColumnHidden={toggleColumnHidden}
            resetColumns={resetColumns}
          />
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
      </Box>

      <Box
        sx={isFullscreen ? { height: '100%', width: '100%', pt: 0 } : { mt: 0 }}
        className={isFullscreen ? 'custom-table-print-target' : undefined}
      >
        <Box
          sx={isFullscreen
            ? { height: '100%', width: '100%', bgcolor: 'background.paper', maxWidth: 1920, mx: 'auto' }
            : { border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}
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
        </Box>
      </Box>

      {normalizedActiveTabId !== columnsTabId && (
        <Box
          sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className={isPrintMode ? 'custom-table-print-controls' : undefined}
        >
          <Box
            component="button"
            onClick={() => loadRows({ filtersParam: combinedFiltersParam })}
            disabled={!hasMore || loadingRows}
            sx={{ border: '1px solid #e5e7eb', bgcolor: 'background.paper', px: 2, py: 1, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
          >
            {loadingRows ? t.grid.loadingMore : hasMore ? t.grid.loadMore : t.grid.noMore}
          </Box>
        </Box>
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
    </Box>
  );
}
