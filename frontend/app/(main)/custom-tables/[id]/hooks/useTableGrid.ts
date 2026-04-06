'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { isAbortError } from '../utils/pasteUtils';
import type { CustomTableGridRow } from '../utils/stylingUtils';

const getRowIdentity = (row: unknown): string => {
  if (!row || typeof row !== 'object') return '';
  const record = row as Record<string, unknown>;
  if (typeof record.id === 'string') return record.id;
  if (typeof record.rowNumber === 'number') return String(record.rowNumber);
  return '';
};

export interface UseTableGridReturn {
  rows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  loadingRows: boolean;
  hasMore: boolean;
  loadRows: (opts?: { reset?: boolean; filtersParam?: string }) => Promise<void>;
}

interface UseTableGridParams {
  tableId: string | null;
  isAuthenticated: boolean;
  combinedFiltersParam: string | undefined;
  loadRowsFailedMessage: string;
}

export function useTableGrid({
  tableId,
  isAuthenticated,
  combinedFiltersParam,
  loadRowsFailedMessage,
}: UseTableGridParams): UseTableGridReturn {
  const [rows, setRows] = useState<CustomTableGridRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const rowsRef = useRef<CustomTableGridRow[]>([]);
  const rowsRequestSeqRef = useRef(0);
  const rowsAbortControllerRef = useRef<AbortController | null>(null);
  const loadingRowsRef = useRef(false);
  const combinedFiltersRef = useRef<string | undefined>(undefined);

  // Keep rowsRef in sync for cursor-based pagination
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Keep combinedFiltersRef in sync for use inside loadRows
  useEffect(() => {
    combinedFiltersRef.current = combinedFiltersParam;
  }, [combinedFiltersParam]);

  const loadRows = useCallback(
    async (opts?: { reset?: boolean; filtersParam?: string }) => {
      if (!tableId) return;
      const shouldReset = Boolean(opts?.reset);
      if (!shouldReset && loadingRowsRef.current) return;

      rowsRequestSeqRef.current += 1;
      const requestId = rowsRequestSeqRef.current;

      if (shouldReset) {
        rowsAbortControllerRef.current?.abort();
      }

      const controller = new AbortController();
      rowsAbortControllerRef.current = controller;
      loadingRowsRef.current = true;
      setLoadingRows(true);

      try {
        const cursor = shouldReset
          ? undefined
          : rowsRef.current[rowsRef.current.length - 1]?.rowNumber;
        const filters = opts?.filtersParam ?? combinedFiltersRef.current;

        const response = await apiClient.get(`/custom-tables/${tableId}/rows`, {
          signal: controller.signal,
          params: { cursor, limit: 50, filters },
        });

        if (controller.signal.aborted || requestId !== rowsRequestSeqRef.current) return;

        const items = response.data?.items || response.data?.data?.items || [];
        const next = Array.isArray(items) ? items : [];
        setRows(prev => {
          const merged = shouldReset ? next : [...prev, ...next];
          const seen = new Set<string>();
          const deduped: typeof merged = [];
          for (const row of merged) {
            const id = getRowIdentity(row);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            deduped.push(row);
          }
          return deduped;
        });
        setHasMore(next.length >= 50);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Failed to load rows:', error);
        toast.error(loadRowsFailedMessage);
      } finally {
        if (requestId === rowsRequestSeqRef.current) {
          loadingRowsRef.current = false;
          setLoadingRows(false);
        }
        if (rowsAbortControllerRef.current === controller) {
          rowsAbortControllerRef.current = null;
        }
      }
    },
    [tableId, loadRowsFailedMessage],
  );

  // Reset and reload when filters or tableId changes
  useEffect(() => {
    if (!isAuthenticated || !tableId) return;
    setHasMore(true);
    setRows([]);
    const timer = window.setTimeout(() => {
      loadRows({ reset: true, filtersParam: combinedFiltersParam });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [combinedFiltersParam, loadRows, tableId, isAuthenticated]);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      rowsAbortControllerRef.current?.abort();
    };
  }, []);

  return { rows, setRows, loadingRows, hasMore, loadRows };
}
