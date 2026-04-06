'use client';

import apiClient from '@/app/lib/api';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export type RowFilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'search';

// Exported so page.tsx can import the type instead of re-defining it
export type ColumnFilterState = {
  min?: string;
  max?: string;
  from?: string;
  to?: string;
  op?: RowFilterOp;
  value?: string;
};

// Minimal column shape required by this hook
interface MinimalColumn {
  key: string;
  width?: number;
}

export interface UseColumnConfigReturn {
  columnOrder: string[];
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenColumnKeys: string[];
  setHiddenColumnKeys: React.Dispatch<React.SetStateAction<string[]>>;
  columnFilters: Record<string, ColumnFilterState>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, ColumnFilterState>>>;
  columnWidths: Record<string, number>;
  getColumnWidth: (colKey: string) => number;
  persistColumnWidth: (colKey: string, width: number) => Promise<void>;
  toggleColumnHidden: (key: string) => void;
  moveColumn: (key: string, direction: 'up' | 'down') => void;
  resetColumns: () => void;
}

interface UseColumnConfigParams {
  tableId: string | null;
  orderedColumns: MinimalColumn[];
  viewSettings: { columns?: Record<string, { width?: number }> } | null | undefined;
  isAuthenticated: boolean;
  columnWidthSaveFailedMessage: string;
}

const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 1200;

export function useColumnConfig({
  tableId,
  orderedColumns,
  viewSettings,
  isAuthenticated,
  columnWidthSaveFailedMessage,
}: UseColumnConfigParams): UseColumnConfigReturn {
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterState>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthTimersRef = useRef<Record<string, number>>({});

  // Load column order + visibility from localStorage on mount
  useEffect(() => {
    if (!tableId) return;
    const storageKey = `custom-table:${tableId}:columns`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: string[]; hidden?: string[] };
      if (Array.isArray(parsed.order)) setColumnOrder(parsed.order);
      if (Array.isArray(parsed.hidden)) setHiddenColumnKeys(parsed.hidden);
    } catch (error) {
      console.warn('Failed to load column settings:', error);
    }
  }, [tableId]);

  // Persist column order + visibility to localStorage
  useEffect(() => {
    if (!tableId) return;
    const storageKey = `custom-table:${tableId}:columns`;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ order: columnOrder, hidden: hiddenColumnKeys }),
      );
    } catch (error) {
      console.warn('Failed to persist column settings:', error);
    }
  }, [tableId, columnOrder, hiddenColumnKeys]);

  // Keep columnOrder in sync when orderedColumns changes (e.g. after a column is added/removed)
  useEffect(() => {
    const keys = orderedColumns.map(c => c.key);
    setColumnOrder(prev => {
      if (!prev.length) return keys;
      const next = prev.filter(k => keys.includes(k));
      keys.forEach(k => {
        if (!next.includes(k)) next.push(k);
      });
      return next;
    });
    setHiddenColumnKeys(prev => prev.filter(k => keys.includes(k)));
  }, [orderedColumns]);

  // Initialize column widths from localStorage + server view settings
  useEffect(() => {
    if (!tableId || !orderedColumns.length) return;
    const storageKey = `custom-table:${tableId}:column-widths`;
    let localWidths: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          localWidths = parsed as Record<string, number>;
        }
      }
    } catch (error) {
      console.warn('Failed to load column widths from storage:', error);
    }

    const viewCols = viewSettings?.columns ?? {};
    const hasServerWidths = Object.values(viewCols).some(
      entry => typeof entry?.width === 'number' && Number.isFinite(entry.width),
    );

    const newWidths: Record<string, number> = {};
    for (const col of orderedColumns) {
      const serverWidth = viewCols?.[col.key]?.width;
      const localWidth = localWidths[col.key];
      let width: number | undefined;

      if (hasServerWidths && typeof serverWidth === 'number' && Number.isFinite(serverWidth)) {
        width = serverWidth;
      } else if (typeof localWidth === 'number' && Number.isFinite(localWidth) && localWidth > 0) {
        width = localWidth;
      } else if (!hasServerWidths && typeof serverWidth === 'number') {
        width = serverWidth;
      }

      if (!(typeof width === 'number' && Number.isFinite(width))) {
        width = col.width;
      }
      if (!(typeof width === 'number' && Number.isFinite(width))) {
        width = DEFAULT_COLUMN_WIDTH;
      }
      newWidths[col.key] = width;
    }
    setColumnWidths(newWidths);
  }, [tableId, viewSettings, orderedColumns]);

  // Cleanup pending debounced width timers on unmount
  useEffect(() => {
    return () => {
      const timers = columnWidthTimersRef.current;
      Object.values(timers).forEach(timerId => window.clearTimeout(timerId));
    };
  }, []);

  const clampWidth = (width: number) =>
    Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));

  const getColumnWidth = (colKey: string): number => {
    const width = columnWidths[colKey];
    if (typeof width === 'number' && Number.isFinite(width)) return width;
    return DEFAULT_COLUMN_WIDTH;
  };

  const persistColumnWidth = async (colKey: string, width: number): Promise<void> => {
    if (!tableId) return;
    const prevWidth = getColumnWidth(colKey);
    const finalWidth = clampWidth(width);
    if (Math.abs(finalWidth - prevWidth) < 1) return;

    const storageKey = `custom-table:${tableId}:column-widths`;
    setColumnWidths(prev => {
      const next = { ...prev, [colKey]: finalWidth };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        console.warn('Failed to persist column widths to storage:', error);
      }
      return next;
    });

    if (!isAuthenticated) return;

    const existing = columnWidthTimersRef.current[colKey];
    if (existing) window.clearTimeout(existing);
    columnWidthTimersRef.current[colKey] = window.setTimeout(async () => {
      try {
        await apiClient.patch(`/custom-tables/${tableId}/view-settings/columns`, {
          columnKey: colKey,
          width: finalWidth,
        });
      } catch (error) {
        console.error('Failed to persist column width:', error);
        toast.error(columnWidthSaveFailedMessage);
      } finally {
        delete columnWidthTimersRef.current[colKey];
      }
    }, 800);
  };

  const toggleColumnHidden = (key: string) => {
    setHiddenColumnKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const moveColumn = (key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const order = prev.length ? [...prev] : orderedColumns.map(c => c.key);
      const index = order.indexOf(key);
      if (index === -1) return order;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return order;
      const next = [...order];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const resetColumns = () => {
    setHiddenColumnKeys([]);
    setColumnOrder(orderedColumns.map(c => c.key));
  };

  return {
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
  };
}

export { DEFAULT_COLUMN_WIDTH };
