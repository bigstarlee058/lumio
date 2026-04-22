import type { ColumnType, CustomTableColumn } from '../utils/stylingUtils';

export function getColumnOptions(column: CustomTableColumn): string[] {
  return Array.isArray(column.config?.options)
    ? column.config.options.map((option: unknown) => String(option))
    : [];
}

function normalizeMultiSelect(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function normalizeNullableString(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function normalizeSelect(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function normalizeText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

const normalizers: Record<string, (value: unknown) => unknown> = {
  boolean: (v) => Boolean(v),
  number: (v) => (v === null || v === undefined || v === '' ? null : Number(v)),
  multi_select: normalizeMultiSelect,
  date: normalizeNullableString,
  select: normalizeSelect,
};

export function normalizeValue(type: ColumnType, value: unknown): unknown {
  const normalizer = normalizers[type];
  return normalizer ? normalizer(value) : normalizeText(value);
}

function formatMultiSelect(value: unknown): string {
  const arr = Array.isArray(value) ? value : [value];
  const text = arr.map((v) => String(v)).filter(Boolean).join(', ');
  return text || '—';
}

const formatters: Record<string, (value: unknown) => string> = {
  boolean: (v) => (v ? 'Yes' : 'No'),
  multi_select: formatMultiSelect,
};

export function formatValue(type: ColumnType, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const formatter = formatters[type];
  if (formatter) return formatter(value);
  const text = String(value);
  return text.trim() ? text : '—';
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, idx) => v === b[idx]);
}

function valuesEqual(before: unknown, after: unknown): boolean {
  if (Array.isArray(before) && Array.isArray(after)) return arraysEqual(before, after);
  return before === after;
}

function resolveAfterValue(type: ColumnType, after: unknown): unknown {
  return type === 'select' && after === '' ? null : after;
}

interface ComputePatchParams {
  orderedColumns: CustomTableColumn[];
  baseData: Record<string, unknown>;
  draft: Record<string, unknown>;
}

export function computePatch({ orderedColumns, baseData, draft }: ComputePatchParams): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const col of orderedColumns) {
    const key = col.key;
    if (!valuesEqual(baseData[key], draft[key])) {
      next[key] = resolveAfterValue(col.type, draft[key]);
    }
  }
  return next;
}
