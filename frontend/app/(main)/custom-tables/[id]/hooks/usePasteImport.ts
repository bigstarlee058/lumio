'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  type PasteMappingSelection,
  type PastePreviewData,
  buildPastePreview,
  isEditableTarget,
  parseClipboardRows,
} from '../utils/pasteUtils';
import type { CustomTableGridRow, CustomTableRowPatch } from '../utils/stylingUtils';
import { getResponseItems } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface PasteDefaults {
  date: string;
  type: string;
  amount: string;
  currency: string;
  comment: string;
  paid: string;
  columnPrefix: string;
}

interface PasteMessages {
  noRows: string;
  missingColumnTitle: string;
  insertFailed: string;
  undoFailed: string;
}

export interface UsePasteImportReturn {
  pastePreviewOpen: boolean;
  pasteParsing: boolean;
  pasteApplying: boolean;
  pasteRawRows: string[][];
  pasteUseHeaders: boolean;
  pastePreview: PastePreviewData | null;
  pasteMapping: Record<number, PasteMappingSelection>;
  pasteEdits: Record<string, string>;
  hasMissingPasteColumnTitles: boolean;
  startPastePreview: (text: string) => void;
  resetPastePreview: () => void;
  handlePasteHeadersToggle: (checked: boolean) => void;
  handlePasteCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
  handlePasteAdd: () => Promise<void>;
}

interface UsePasteImportParams {
  tableId: string | null;
  orderedColumns: CustomTablePageColumn[];
  pasteDefaults: PasteDefaults;
  loadTable: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  /** Called after successful paste — component renders the undo toast */
  onInsertSuccess: (createdCount: number, onUndo: () => void) => void;
  messages: PasteMessages;
}

export function usePasteImport({
  tableId,
  orderedColumns,
  pasteDefaults,
  loadTable,
  refreshStats,
  setRows,
  onInsertSuccess,
  messages,
}: UsePasteImportParams): UsePasteImportReturn {
  const [pastePreviewOpen, setPastePreviewOpen] = useState(false);
  const [pasteParsing, setPasteParsing] = useState(false);
  const [pasteApplying, setPasteApplying] = useState(false);
  const [pasteRawRows, setPasteRawRows] = useState<string[][]>([]);
  const [pasteUseHeaders, setPasteUseHeaders] = useState(false);
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);
  const [pasteMapping, setPasteMapping] = useState<Record<number, PasteMappingSelection>>({});
  const [pasteEdits, setPasteEdits] = useState<Record<string, string>>({});
  const pastePreviewTimerRef = useRef<number | null>(null);

  const hasMissingPasteColumnTitles = useMemo(
    () => Boolean(pastePreview?.columns.some(col => col.mode === 'new' && !col.newTitle?.trim())),
    [pastePreview],
  );

  const resetPastePreview = useCallback(() => {
    setPastePreviewOpen(false);
    setPastePreview(null);
    setPasteRawRows([]);
    setPasteUseHeaders(false);
    setPasteParsing(false);
    setPasteApplying(false);
    setPasteMapping({});
    setPasteEdits({});
    if (pastePreviewTimerRef.current) {
      window.clearTimeout(pastePreviewTimerRef.current);
      pastePreviewTimerRef.current = null;
    }
  }, []);

  const buildPreviewAsync = useCallback(
    (
      rows: string[][],
      useHeaders: boolean,
      mappingSelection: Record<number, PasteMappingSelection> | null,
      edits: Record<string, string>,
    ) => {
      setPasteParsing(true);
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
      pastePreviewTimerRef.current = window.setTimeout(() => {
        const result = buildPastePreview(
          rows,
          useHeaders,
          orderedColumns,
          mappingSelection,
          edits,
          pasteDefaults,
        );
        setPastePreview(result.preview);
        setPasteMapping(result.mapping);
        setPasteParsing(false);
        pastePreviewTimerRef.current = null;
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  const startPastePreview = useCallback(
    (text: string) => {
      if (!orderedColumns.length) return;
      const { rows } = parseClipboardRows(text);
      if (!rows.length) return;
      setPasteRawRows(rows);
      setPastePreviewOpen(true);
      setPasteParsing(true);
      setPasteEdits({});
      window.setTimeout(() => {
        const initial = buildPastePreview(rows, false, orderedColumns, null, {}, pasteDefaults);
        const shouldUseHeaders = initial.preview.headersDetected;
        if (shouldUseHeaders) {
          const withHeaders = buildPastePreview(
            rows,
            true,
            orderedColumns,
            null,
            {},
            pasteDefaults,
          );
          setPasteUseHeaders(true);
          setPastePreview(withHeaders.preview);
          setPasteMapping(withHeaders.mapping);
        } else {
          setPasteUseHeaders(false);
          setPastePreview(initial.preview);
          setPasteMapping(initial.mapping);
        }
        setPasteParsing(false);
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  const handlePasteHeadersToggle = useCallback(
    (checked: boolean) => {
      setPasteUseHeaders(checked);
      if (!pasteRawRows.length) return;
      setPasteEdits({});
      buildPreviewAsync(pasteRawRows, checked, null, {});
    },
    [pasteRawRows, buildPreviewAsync],
  );

  const rebuildPasteWithState = useCallback(
    (nextMapping: Record<number, PasteMappingSelection>, nextEdits: Record<string, string>) => {
      if (!pasteRawRows.length) return;
      buildPreviewAsync(pasteRawRows, pasteUseHeaders, nextMapping, nextEdits);
    },
    [pasteRawRows, pasteUseHeaders, buildPreviewAsync],
  );

  const handlePasteCellChange = useCallback(
    (rowIndex: number, sourceIndex: number, value: string) => {
      setPasteEdits(prev => {
        const next = { ...prev, [`${rowIndex}:${sourceIndex}`]: value };
        rebuildPasteWithState(pasteMapping, next);
        return next;
      });
    },
    [pasteMapping, rebuildPasteWithState],
  );

  const appendRows = useCallback(
    (createdRows: CustomTableGridRow[]) => {
      setRows(prev => {
        const merged = [...prev, ...createdRows];
        const seen = new Set<string>();
        const deduped: CustomTableGridRow[] = [];
        for (const row of merged) {
          const id = row.id || String(row.rowNumber);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          deduped.push(row);
        }
        deduped.sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
        return deduped;
      });
    },
    [setRows],
  );

  const rollbackRows = useCallback(
    async (rowIds: string[]) => {
      if (!tableId || !rowIds.length) return;
      try {
        await Promise.all(
          rowIds.map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
        );
        setRows(prev => prev.filter(row => !rowIds.includes(row.id)));
        await refreshStats();
      } catch (error) {
        console.error('Failed to rollback rows:', error);
        toast.error(messages.undoFailed);
      }
    },
    [tableId, refreshStats, setRows, messages.undoFailed],
  );

  const handlePasteAdd = useCallback(async () => {
    if (!tableId || !pastePreview || pasteApplying) return;
    if (!pastePreview.dataRows.length) {
      toast.error(messages.noRows);
      return;
    }
    if (pastePreview.hasErrors) return;
    setPasteApplying(true);
    try {
      const newColumns = pastePreview.columns.filter(col => col.mode === 'new');
      const missingTitles = newColumns.some(col => !col.newTitle || !col.newTitle.trim());
      if (missingTitles) {
        toast.error(messages.missingColumnTitle);
        setPasteApplying(false);
        return;
      }
      const placeholderToKey = new Map<string, string>();
      if (newColumns.length) {
        const created = await Promise.all(
          newColumns.map(col =>
            apiClient.post(`/custom-tables/${tableId}/columns`, {
              title: col.newTitle?.trim(),
              type: col.newType ?? 'text',
            }),
          ),
        );
        created.forEach((response, index) => {
          const payload = response.data?.data || response.data;
          const key = payload?.key;
          const placeholderKey = newColumns[index]?.columnKey || '';
          if (key && placeholderKey) {
            placeholderToKey.set(placeholderKey, key);
          }
        });
        await loadTable();
      }

      const payloadRows = pastePreview.dataRows.map(row => {
        const data: CustomTableRowPatch = {};
        for (const [key, value] of Object.entries(row)) {
          const actualKey = placeholderToKey.get(key) || key;
          data[actualKey] = value;
        }
        return { data };
      });

      const response = await apiClient.post(`/custom-tables/${tableId}/rows/batch`, {
        rows: payloadRows,
      });
      const responsePayload = response.data || {};
      const createdRows =
        responsePayload.rows ||
        responsePayload.data?.rows ||
        responsePayload.items ||
        responsePayload.data?.items ||
        [];
      const normalizedRows = getResponseItems(createdRows);
      const createdCount =
        responsePayload.created ??
        responsePayload.data?.created ??
        normalizedRows.length ??
        pastePreview.dataRows.length;
      if (normalizedRows.length) {
        appendRows(normalizedRows);
      }
      resetPastePreview();
      await refreshStats();

      onInsertSuccess(createdCount, () =>
        rollbackRows(normalizedRows.map(r => r.id).filter(Boolean)),
      );
    } catch (error) {
      console.error('Failed to batch insert rows:', error);
      toast.error(messages.insertFailed);
    } finally {
      setPasteApplying(false);
    }
  }, [
    tableId,
    pastePreview,
    pasteApplying,
    appendRows,
    resetPastePreview,
    loadTable,
    refreshStats,
    rollbackRows,
    onInsertSuccess,
    messages.noRows,
    messages.missingColumnTitle,
    messages.insertFailed,
  ]);

  // Global paste event listener
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (pastePreviewOpen || pasteApplying) return;
      if (!orderedColumns.length) return;
      if (isEditableTarget(event.target)) return;
      const clipboardText = event.clipboardData?.getData('text/plain') || '';
      if (!clipboardText) return;
      const normalized = clipboardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const hasMultipleLines = normalized.split('\n').length > 1;
      if (!normalized.includes('\t') && !hasMultipleLines) return;
      event.preventDefault();
      startPastePreview(clipboardText);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pastePreviewOpen, pasteApplying, orderedColumns.length, startPastePreview]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
    };
  }, []);

  return {
    pastePreviewOpen,
    pasteParsing,
    pasteApplying,
    pasteRawRows,
    pasteUseHeaders,
    pastePreview,
    pasteMapping,
    pasteEdits,
    hasMissingPasteColumnTitles,
    startPastePreview,
    resetPastePreview,
    handlePasteHeadersToggle,
    handlePasteCellChange,
    handlePasteAdd,
  };
}
