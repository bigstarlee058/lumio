'use client';

import { useMemo } from 'react';
import {
  buildDisplayColumns,
  checkColumnsDefault,
  computeGridWidths,
  computeOrderedVisibleColumns,
  findSpecialColumnKeys,
} from '../helpers/columnLayoutHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

export interface UseColumnLayoutReturn {
  orderedVisibleColumns: CustomTablePageColumn[];
  isColumnsDefault: boolean;
  displayColumns: CustomTablePageColumn[];
  dateColKey: string | null;
  counterpartyColKey: string | null;
  stickyLeftColumnIds: string[];
  stickyRightColumnIds: string[];
  gridColumnWidths: Record<string, number>;
}

interface UseColumnLayoutParams {
  orderedColumns: CustomTablePageColumn[];
  columnOrder: string[];
  hiddenColumnKeys: string[];
  getColumnWidth: (key: string) => number;
  paidColKey: string | null;
  t: unknown;
}

export function useColumnLayout({
  orderedColumns,
  columnOrder,
  hiddenColumnKeys,
  getColumnWidth,
  paidColKey,
  t,
}: UseColumnLayoutParams): UseColumnLayoutReturn {
  const orderedVisibleColumns = useMemo(
    () => computeOrderedVisibleColumns(orderedColumns, columnOrder, hiddenColumnKeys),
    [orderedColumns, columnOrder, hiddenColumnKeys],
  );
  const isColumnsDefault = useMemo(
    () => checkColumnsDefault(orderedColumns, columnOrder, hiddenColumnKeys),
    [orderedColumns, columnOrder, hiddenColumnKeys],
  );
  const displayColumns = useMemo(
    () => buildDisplayColumns(orderedVisibleColumns, paidColKey, t),
    [orderedVisibleColumns, paidColKey, t],
  );
  const { dateColKey, counterpartyColKey } = useMemo(
    () => findSpecialColumnKeys(orderedColumns),
    [orderedColumns],
  );
  const stickyLeftColumnIds = useMemo(
    () => [['__select', dateColKey, counterpartyColKey].filter(Boolean) as string[]].flat(),
    [dateColKey, counterpartyColKey],
  );
  const stickyRightColumnIds = useMemo(() => ['__actions'], []);
  const gridColumnWidths = useMemo(
    () => computeGridWidths(orderedColumns, getColumnWidth),
    [orderedColumns, getColumnWidth],
  );
  return {
    orderedVisibleColumns,
    isColumnsDefault,
    displayColumns,
    dateColKey,
    counterpartyColKey,
    stickyLeftColumnIds,
    stickyRightColumnIds,
    gridColumnWidths,
  };
}
