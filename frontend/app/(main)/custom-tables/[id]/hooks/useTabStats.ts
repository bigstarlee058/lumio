'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../utils/pasteUtils';

function readRowsTotal(response: unknown): number {
  const data =
    response !== null &&
    typeof response === 'object' &&
    'data' in response &&
    typeof (response as Record<string, unknown>).data === 'object'
      ? ((response as Record<string, unknown>).data as Record<string, unknown>)
      : null;
  const meta =
    data !== null && typeof data === 'object' && 'meta' in data
      ? (data.meta as Record<string, unknown>)
      : null;
  const itemsLength =
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as Record<string, unknown>).items)
      ? ((data as Record<string, unknown>).items as unknown[]).length
      : undefined;
  const totalCandidate =
    meta?.total ?? (data as Record<string, unknown> | null)?.total ?? itemsLength;
  return typeof totalCandidate === 'number' ? totalCandidate : 0;
}

export interface TabCounts {
  total: number;
  paid: number | null;
  unpaid: number | null;
}

export interface UseTabStatsReturn {
  tabCounts: TabCounts;
  refreshStats: () => Promise<void>;
}

interface UseTabStatsParams {
  tableId: string | null;
  isAuthenticated: boolean;
  paidColKey: string | null;
}

export function useTabStats({
  tableId,
  isAuthenticated,
  paidColKey,
}: UseTabStatsParams): UseTabStatsReturn {
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    total: 0,
    paid: null,
    unpaid: null,
  });
  const statsRequestSeqRef = useRef(0);
  const statsAbortControllerRef = useRef<AbortController | null>(null);

  const refreshStats = useCallback(async () => {
    if (!tableId || !isAuthenticated) return;
    statsRequestSeqRef.current += 1;
    const requestId = statsRequestSeqRef.current;
    statsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    statsAbortControllerRef.current = controller;

    try {
      const totalRequest = apiClient.get(`/custom-tables/${tableId}/rows`, {
        signal: controller.signal,
        params: { limit: 1 },
      });

      if (!paidColKey) {
        const totalResponse = await totalRequest;
        if (controller.signal.aborted || requestId !== statsRequestSeqRef.current) return;
        setTabCounts({ total: readRowsTotal(totalResponse), paid: null, unpaid: null });
        return;
      }

      const paidRequest = apiClient.get(`/custom-tables/${tableId}/rows`, {
        signal: controller.signal,
        params: {
          limit: 1,
          filters: JSON.stringify([{ col: paidColKey, op: 'eq', value: true }]),
        },
      });
      const unpaidRequest = apiClient.get(`/custom-tables/${tableId}/rows`, {
        signal: controller.signal,
        params: {
          limit: 1,
          filters: JSON.stringify([{ col: paidColKey, op: 'eq', value: false }]),
        },
      });

      const [totalResponse, paidResponse, unpaidResponse] = await Promise.all([
        totalRequest,
        paidRequest,
        unpaidRequest,
      ]);
      if (controller.signal.aborted || requestId !== statsRequestSeqRef.current) return;

      setTabCounts({
        total: readRowsTotal(totalResponse),
        paid: readRowsTotal(paidResponse),
        unpaid: readRowsTotal(unpaidResponse),
      });
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Failed to fetch table stats:', error);
    } finally {
      if (statsAbortControllerRef.current === controller) {
        statsAbortControllerRef.current = null;
      }
    }
  }, [paidColKey, tableId, isAuthenticated]);

  // Auto-refresh when params change
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      statsAbortControllerRef.current?.abort();
    };
  }, []);

  return { tabCounts, refreshStats };
}
