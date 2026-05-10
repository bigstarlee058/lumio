import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

export function computeOrderedVisibleColumns(
  orderedColumns: CustomTablePageColumn[],
  columnOrder: string[],
  hiddenColumnKeys: string[],
): CustomTablePageColumn[] {
  const columnsByKey = new Map(orderedColumns.map(c => [c.key, c]));
  const orderedKeys = columnOrder.length ? columnOrder : orderedColumns.map(c => c.key);
  const hiddenSet = new Set(hiddenColumnKeys);
  return orderedKeys
    .map(key => columnsByKey.get(key))
    .filter(Boolean)
    .filter(col => !hiddenSet.has((col as CustomTablePageColumn).key)) as CustomTablePageColumn[];
}

export function checkColumnsDefault(
  orderedColumns: CustomTablePageColumn[],
  columnOrder: string[],
  hiddenColumnKeys: string[],
): boolean {
  const defaultKeys = orderedColumns.map(c => c.key);
  const currentOrder = columnOrder.length ? columnOrder : defaultKeys;
  if (currentOrder.length !== defaultKeys.length) {
    return false;
  }
  for (let i = 0; i < defaultKeys.length; i += 1) {
    if (currentOrder[i] !== defaultKeys[i]) {
      return false;
    }
  }
  return hiddenColumnKeys.length === 0;
}

export function buildDisplayColumns(
  visibleColumns: CustomTablePageColumn[],
  paidColKey: string | null,
  t: unknown,
): CustomTablePageColumn[] {
  return visibleColumns.map(c =>
    c.key === paidColKey ? { ...c, title: tx(t, ['paidColumn'], c.title) } : c,
  );
}

export function findSpecialColumnKeys(cols: CustomTablePageColumn[]): {
  dateColKey: string | null;
  counterpartyColKey: string | null;
} {
  const dateColKey = cols.find(c => c.type === 'date')?.key ?? null;
  const re = /(контрагент|counterparty|counter party|client|customer|payer|payee|partner)/i;
  const counterpartyColKey =
    cols.find(c => re.test(`${c.title ?? ''} ${c.key ?? ''}`))?.key ?? null;
  return { dateColKey, counterpartyColKey };
}

export function computeGridWidths(
  cols: CustomTablePageColumn[],
  getColumnWidth: (key: string) => number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const col of cols) {
    next[col.key] = getColumnWidth(col.key);
  }
  return next;
}
