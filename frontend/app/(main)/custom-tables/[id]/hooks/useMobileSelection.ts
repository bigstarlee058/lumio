'use client';

import { useCallback, useMemo } from 'react';
import type { CustomTableGridRow } from '../utils/stylingUtils';

interface UseMobileSelectionParams {
  rows: CustomTableGridRow[];
  selectedRowIds: string[];
  onSelectedRowIdsChange: (opts: { rowIds: string[] }) => void;
}

export interface UseMobileSelectionReturn {
  selectedRowsSet: Set<string>;
  allRowsSelectedMobile: boolean;
  someRowsSelectedMobile: boolean;
  handleMobileSelectAll: (checked: boolean | 'indeterminate') => void;
  handleMobileSelectRow: (rowId: string, checked: boolean) => void;
}

export function useMobileSelection({ rows, selectedRowIds, onSelectedRowIdsChange }: UseMobileSelectionParams): UseMobileSelectionReturn {
  const selectedRowsSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const allRowsSelectedMobile = useMemo(
    () => rows.length > 0 && rows.every(row => selectedRowsSet.has(row.id)),
    [rows, selectedRowsSet],
  );

  const someRowsSelectedMobile = useMemo(
    () => rows.some(row => selectedRowsSet.has(row.id)),
    [rows, selectedRowsSet],
  );

  const handleMobileSelectAll = useCallback(
    (checked: boolean | 'indeterminate'): void => {
      onSelectedRowIdsChange({ rowIds: checked === true ? rows.map(r => r.id) : [] });
    },
    [onSelectedRowIdsChange, rows],
  );

  const handleMobileSelectRow = useCallback(
    (rowId: string, checked: boolean): void => {
      if (checked) { onSelectedRowIdsChange({ rowIds: Array.from(new Set([...selectedRowIds, rowId])) }); return; }
      onSelectedRowIdsChange({ rowIds: selectedRowIds.filter(id => id !== rowId) });
    },
    [onSelectedRowIdsChange, selectedRowIds],
  );

  return { selectedRowsSet, allRowsSelectedMobile, someRowsSelectedMobile, handleMobileSelectAll, handleMobileSelectRow };
}
