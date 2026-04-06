import { format } from 'date-fns';
import type {
  ColumnType,
  CustomTableCellValue,
  CustomTableColumnConfig,
  CustomTableRowPatch,
} from './stylingUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PasteFieldKey = 'date' | 'type' | 'amount' | 'currency' | 'comment' | 'paid';

export type PasteErrorKey = 'date' | 'amount' | 'currency' | 'paid';

export type PasteColumnMapping = {
  sourceIndex: number | null;
  field: PasteFieldKey;
  columnKey: string | null;
  label: string;
  options?: string[];
  mode: 'existing' | 'new';
  newTitle?: string;
  newType?: ColumnType;
};

export type PasteSourceColumn = {
  index: number;
  header: string;
  sampleValues: string[];
};

export type PasteMappingSelection = {
  mode: 'ignore' | 'existing' | 'new';
  columnKey?: string;
  field?: PasteFieldKey | null;
  newTitle?: string;
  newType?: ColumnType;
};

export type PastePreviewCell = {
  value: string;
  error: boolean;
  sourceIndex: number | null;
};

export type PastePreviewRow = {
  id: number;
  rowIndex: number;
  cells: PastePreviewCell[];
};

export type PastePreviewData = {
  totalRows: number;
  previewRows: PastePreviewRow[];
  dataRows: CustomTableRowPatch[];
  columns: PasteColumnMapping[];
  errors: Record<PasteErrorKey, number>;
  hasErrors: boolean;
  extraRowsCount: number;
  hasHeadersToggle: boolean;
  headersDetected: boolean;
};

/** Minimal column shape required by paste helpers. */
export interface PasteColumn {
  key: string;
  title?: string | null;
  type?: ColumnType | string | null;
  config?: CustomTableColumnConfig | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PASTE_FIELD_ALIASES: Record<PasteFieldKey, string[]> = {
  date: ['date', 'дата', 'день', 'day', 'dt', 'дт'],
  type: ['type', 'тип', 'category', 'категория', 'вид', 'account', 'операция'],
  amount: ['amount', 'sum', 'сумма', 'итого', 'total', 'value', 'стоимость'],
  currency: ['currency', 'валюта', 'curr', 'вал', 'code'],
  comment: ['comment', 'комментар', 'note', 'memo', 'описан', 'details', 'description'],
  paid: ['paid', 'оплач', 'оплата', 'неоплач', 'payment', 'status'],
};

const CURRENCY_ALIASES: Record<string, string[]> = {
  KZT: ['kzt', 'тенге', 'теңге', 'тг', 'tg'],
  RUB: ['rub', 'руб', 'рубль', 'ruble', 'rur'],
  USD: ['usd', 'доллар', 'доллары', 'us$', 'бакс'],
  EUR: ['eur', 'евро'],
  GBP: ['gbp', 'фунт'],
  CNY: ['cny', 'юань', 'yuan', 'rmb'],
  JPY: ['jpy', 'иена', 'yen'],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '₽': 'RUB',
  '₸': 'KZT',
  '£': 'GBP',
  '¥': 'JPY',
};

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s._-]+/g, '')
    .trim();

export const matchFieldByName = (raw: string): PasteFieldKey | null => {
  const normalized = normalizeToken(raw);
  if (!normalized) return null;
  for (const [field, aliases] of Object.entries(PASTE_FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === normalizeToken(alias)) return field as PasteFieldKey;
      if (normalized.includes(normalizeToken(alias))) return field as PasteFieldKey;
    }
  }
  return null;
};

export const detectHeaderRow = (
  rows: string[][],
  fieldByColumnName: Map<string, PasteFieldKey>,
) => {
  if (!rows.length) return false;
  const first = rows[0] || [];
  let hits = 0;
  let checked = 0;
  for (const cell of first) {
    const normalized = normalizeToken(cell || '');
    if (!normalized) continue;
    checked += 1;
    if (fieldByColumnName.has(normalized) || matchFieldByName(normalized)) {
      hits += 1;
    }
  }
  if (!checked) return false;
  return hits >= Math.max(1, Math.ceil(checked / 2));
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export const splitDelimitedRow = (line: string, delimiter: string) => {
  if (!line) return [''];
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
};

export const parseClipboardRows = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  const hasTabs = lines.some(line => line.includes('\t'));
  const delimiter = hasTabs
    ? '\t'
    : (() => {
        const commaCount = lines.reduce((acc, line) => acc + (line.match(/,/g)?.length ?? 0), 0);
        const semiCount = lines.reduce((acc, line) => acc + (line.match(/;/g)?.length ?? 0), 0);
        if (semiCount > commaCount && semiCount > 0) return ';';
        if (commaCount > 0) return ',';
        return '\t';
      })();
  const rows = lines.map(line => splitDelimitedRow(line, delimiter));
  return { rows, delimiter };
};

export const parseDateCell = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const isoMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  let year: number;
  let month: number;
  let day: number;
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dmyMatch) {
    day = Number(dmyMatch[1]);
    month = Number(dmyMatch[2]);
    year = Number(dmyMatch[3]);
  } else {
    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) return { value: null, error: true };
    return { value: format(fallback, 'yyyy-MM-dd'), error: false };
  }
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return { value: null, error: true };
  }
  return { value: format(parsed, 'yyyy-MM-dd'), error: false };
};

export const parseNumberCell = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const stripped = trimmed.replace(/\s/g, '');
  const separators = stripped.match(/[.,]/g) || [];
  let normalized = stripped;
  if (separators.length === 1) {
    const sepIndex = stripped.search(/[.,]/);
    const digitsAfter = stripped.length - sepIndex - 1;
    if (digitsAfter === 3) {
      normalized = stripped.replace(/[.,]/g, '');
    } else {
      normalized = stripped.replace(/[.,]/g, (match, offset) => (offset === sepIndex ? '.' : ''));
    }
  } else if (separators.length > 1) {
    const lastComma = stripped.lastIndexOf(',');
    const lastDot = stripped.lastIndexOf('.');
    const decimalPos = Math.max(lastComma, lastDot);
    normalized = stripped.replace(/[.,]/g, (match, offset) => (offset === decimalPos ? '.' : ''));
  } else {
    normalized = stripped.replace(/[.,]/g, '');
  }
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
    return { value: null, error: true };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { value: null, error: true };
  return { value, error: false };
};

const normalizeCurrencyToken = (value: string) =>
  normalizeToken(value).replace(/[^\p{L}\p{N}]/gu, '');

export const resolveCurrencyCode = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (CURRENCY_SYMBOLS[trimmed]) return CURRENCY_SYMBOLS[trimmed];
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  const normalized = normalizeCurrencyToken(trimmed);
  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    if (aliases.some(alias => normalizeCurrencyToken(alias) === normalized)) {
      return code;
    }
  }
  return null;
};

export const parseCurrencyCell = (raw: string, options?: string[]) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const resolved = resolveCurrencyCode(trimmed);
  if (options?.length) {
    const normalizedOptions = options.map(opt => normalizeToken(opt));
    const matchIndex = normalizedOptions.indexOf(normalizeToken(trimmed));
    if (matchIndex !== -1) {
      return { value: options[matchIndex], error: false };
    }
    if (resolved) {
      const resolvedIndex = normalizedOptions.indexOf(normalizeToken(resolved));
      if (resolvedIndex !== -1) {
        return { value: options[resolvedIndex], error: false };
      }
    }
    return { value: null, error: true };
  }
  if (resolved) return { value: resolved, error: false };
  return { value: null, error: true };
};

export const parsePaidCell = (raw: string) => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return { value: null, error: false };
  const positive = ['true', '1', 'yes', 'y', 't', 'да', 'оплачено', 'paid'];
  const negative = [
    'false',
    '0',
    'no',
    'n',
    'f',
    'нет',
    'неоплачено',
    'не оплачено',
    'не оплачен',
    'unpaid',
  ];
  if (positive.includes(trimmed)) return { value: true, error: false };
  if (negative.includes(trimmed)) return { value: false, error: false };
  return { value: null, error: true };
};

// ---------------------------------------------------------------------------
// Column inference helpers
// ---------------------------------------------------------------------------

export const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  return Boolean(element.getAttribute('contenteditable') === 'true');
};

export const inferFieldFromColumn = (column: PasteColumn): PasteFieldKey | null => {
  const matched = matchFieldByName(`${column.title ?? ''} ${column.key ?? ''}`);
  if (matched) return matched;
  if (column.type === 'date') return 'date';
  if (column.type === 'number') return 'amount';
  if (column.type === 'boolean') return 'paid';
  return null;
};

export const inferFieldFromValues = (values: string[]) => {
  const sample = values
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!sample.length) return null;
  const score = (parser: (raw: string) => { error: boolean }) =>
    sample.reduce((acc, value) => acc + (parser(value).error ? 0 : 1), 0);
  const totals = sample.length;
  const scores = {
    date: score(parseDateCell),
    amount: score(parseNumberCell),
    currency: score(value => parseCurrencyCell(value)),
    paid: score(parsePaidCell),
  };
  const entries = Object.entries(scores) as Array<[PasteFieldKey, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const [bestField, bestScore] = entries[0] || [];
  if (!bestField) return null;
  const ratio = bestScore / totals;
  if (ratio < 0.6) return null;
  return bestField;
};

export const inferNewColumnType = (field: PasteFieldKey | null) => {
  if (field === 'date') return 'date';
  if (field === 'amount') return 'number';
  if (field === 'paid') return 'boolean';
  return 'text';
};

// ---------------------------------------------------------------------------
// Source column builder
// ---------------------------------------------------------------------------

export const buildSourceColumns = (rawRows: string[][], useHeaders: boolean) => {
  const headerRow = useHeaders ? rawRows[0] || [] : [];
  const dataRows = useHeaders ? rawRows.slice(1) : rawRows;
  const maxLen = Math.max(headerRow.length, ...dataRows.map(row => row.length), 0);
  const columns: PasteSourceColumn[] = [];
  for (let index = 0; index < maxLen; index += 1) {
    const header = String(headerRow[index] ?? '').trim();
    const sampleValues = dataRows
      .slice(0, 20)
      .map(row => String(row[index] ?? ''))
      .filter(value => value.trim() !== '');
    columns.push({ index, header, sampleValues });
  }
  return { columns, dataRows };
};

// ---------------------------------------------------------------------------
// Main paste preview builder
// ---------------------------------------------------------------------------

export const buildPastePreview = (
  rawRows: string[][],
  useHeaders: boolean,
  orderedColumns: PasteColumn[],
  mappingSelection: Record<number, PasteMappingSelection> | null,
  edits: Record<string, string>,
  defaults: Record<PasteFieldKey | 'columnPrefix', string>,
): {
  preview: PastePreviewData;
  mapping: Record<number, PasteMappingSelection>;
  sourceColumns: PasteSourceColumn[];
} => {
  const columnByKey = new Map(orderedColumns.map(col => [col.key, col]));
  const columnNameMap = new Map<string, PasteColumn>();
  const columnNameToField = new Map<string, PasteFieldKey>();
  const fieldToColumn = new Map<PasteFieldKey, PasteColumn>();

  for (const col of orderedColumns) {
    const inferredField = inferFieldFromColumn(col);
    if (col.title) {
      const normalized = normalizeToken(col.title);
      columnNameMap.set(normalized, col);
      if (inferredField) columnNameToField.set(normalized, inferredField);
    }
    if (col.key) {
      const normalized = normalizeToken(col.key);
      columnNameMap.set(normalized, col);
      if (inferredField) columnNameToField.set(normalized, inferredField);
    }
    if (inferredField && !fieldToColumn.has(inferredField)) {
      fieldToColumn.set(inferredField, col);
    }
  }

  const headersDetected = detectHeaderRow(rawRows, columnNameToField);
  const hasHeadersToggle = headersDetected || rawRows.length > 1;

  const { columns: sourceColumns, dataRows } = buildSourceColumns(rawRows, useHeaders);

  const mapping: Record<number, PasteMappingSelection> = mappingSelection ?? {};

  if (!mappingSelection) {
    const usedExisting = new Set<string>();
    for (const sourceColumn of sourceColumns) {
      const { index, header, sampleValues } = sourceColumn;
      const headerNormalized = normalizeToken(header);
      const headerField = matchFieldByName(header);
      const headerMatch = headerNormalized ? columnNameMap.get(headerNormalized) : null;

      const hasContent = Boolean(header) || sampleValues.length > 0;
      if (!hasContent) {
        mapping[index] = { mode: 'ignore' };
        continue;
      }

      if (useHeaders && headerMatch && !usedExisting.has(headerMatch.key)) {
        mapping[index] = {
          mode: 'existing',
          columnKey: headerMatch.key,
          field: inferFieldFromColumn(headerMatch),
        };
        usedExisting.add(headerMatch.key);
        continue;
      }

      if (useHeaders && headerField) {
        const fieldColumn = fieldToColumn.get(headerField);
        if (fieldColumn && !usedExisting.has(fieldColumn.key)) {
          mapping[index] = {
            mode: 'existing',
            columnKey: fieldColumn.key,
            field: headerField,
          };
          usedExisting.add(fieldColumn.key);
          continue;
        }
        mapping[index] = {
          mode: 'new',
          field: headerField,
          newTitle: header || defaults[headerField],
          newType: inferNewColumnType(headerField),
        };
        continue;
      }

      const inferredField = inferFieldFromValues(sampleValues);
      if (inferredField) {
        const fieldColumn = fieldToColumn.get(inferredField);
        if (fieldColumn && !usedExisting.has(fieldColumn.key)) {
          mapping[index] = {
            mode: 'existing',
            columnKey: fieldColumn.key,
            field: inferredField,
          };
          usedExisting.add(fieldColumn.key);
          continue;
        }
        mapping[index] = {
          mode: 'new',
          field: inferredField,
          newTitle: header || defaults[inferredField],
          newType: inferNewColumnType(inferredField),
        };
        continue;
      }

      mapping[index] = {
        mode: 'new',
        field: headerField ?? null,
        newTitle: header || `${defaults.columnPrefix} ${index + 1}`,
        newType: inferNewColumnType(headerField ?? null),
      };
    }
  }

  const mappedColumns: PasteColumnMapping[] = [];
  for (const sourceColumn of sourceColumns) {
    const selection = mapping[sourceColumn.index];
    if (!selection || selection.mode === 'ignore') continue;
    if (selection.mode === 'existing' && selection.columnKey) {
      const column = columnByKey.get(selection.columnKey);
      if (!column) continue;
      mappedColumns.push({
        sourceIndex: sourceColumn.index,
        field: (selection.field ?? inferFieldFromColumn(column) ?? 'comment') as PasteFieldKey,
        columnKey: column.key,
        label: column.title || column.key,
        options: column.config?.options,
        mode: 'existing',
      });
      continue;
    }

    const fallbackTitle =
      sourceColumn.header || `${defaults.columnPrefix} ${sourceColumn.index + 1}`;
    const resolvedTitle = selection.newTitle !== undefined ? selection.newTitle : fallbackTitle;
    const label = resolvedTitle?.trim() ? resolvedTitle : fallbackTitle;
    const field =
      selection.field === null
        ? ('comment' as PasteFieldKey)
        : (selection.field ?? matchFieldByName(resolvedTitle) ?? ('comment' as PasteFieldKey));
    mappedColumns.push({
      sourceIndex: sourceColumn.index,
      field,
      columnKey: `__new__${sourceColumn.index}`,
      label,
      mode: 'new',
      newTitle: resolvedTitle,
      newType: selection.newType ?? inferNewColumnType(field),
    });
  }

  if (!mappedColumns.length) {
    return {
      preview: {
        totalRows: 0,
        previewRows: [],
        dataRows: [],
        columns: [],
        errors: { date: 0, amount: 0, currency: 0, paid: 0 },
        hasErrors: false,
        extraRowsCount: 0,
        hasHeadersToggle,
        headersDetected,
      },
      mapping,
      sourceColumns,
    };
  }

  const dataPayload: CustomTableRowPatch[] = [];
  const previewRows: PastePreviewRow[] = [];
  const errors: Record<PasteErrorKey, number> = {
    date: 0,
    amount: 0,
    currency: 0,
    paid: 0,
  };
  let hasErrors = false;

  dataRows.forEach((row, rowIndex) => {
    if (!row || row.every(cell => !String(cell ?? '').trim())) return;
    const rowData: CustomTableRowPatch = {};
    const cells: PastePreviewCell[] = [];

    for (const col of mappedColumns) {
      const sourceIndex = col.sourceIndex;
      const key = sourceIndex !== null ? `${rowIndex}:${sourceIndex}` : '';
      const rawValue =
        sourceIndex !== null && row[sourceIndex] !== undefined ? String(row[sourceIndex]) : '';
      const editedValue = sourceIndex !== null && edits[key] !== undefined ? edits[key] : rawValue;
      const trimmed = editedValue.trim();
      let parsedValue: CustomTableCellValue = trimmed || null;
      let errorFlag = false;

      if (col.field === 'date') {
        const parsed = parseDateCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.date += 1;
      } else if (col.field === 'amount') {
        const parsed = parseNumberCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.amount += 1;
      } else if (col.field === 'currency') {
        const parsed = parseCurrencyCell(editedValue, col.options);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.currency += 1;
      } else if (col.field === 'paid') {
        const parsed = parsePaidCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.paid += 1;
      }

      if (errorFlag) hasErrors = true;
      cells.push({
        value: trimmed,
        error: errorFlag,
        sourceIndex,
      });
      if (col.columnKey) rowData[col.columnKey] = parsedValue;
    }

    dataPayload.push(rowData);
    if (previewRows.length < 50) {
      previewRows.push({
        id: rowIndex,
        rowIndex,
        cells,
      });
    }
  });

  const totalRows = dataPayload.length;
  const extraRowsCount = totalRows > 50 ? totalRows - 50 : 0;

  return {
    preview: {
      totalRows,
      previewRows,
      dataRows: dataPayload,
      columns: mappedColumns,
      errors,
      hasErrors,
      extraRowsCount,
      hasHeadersToggle,
      headersDetected,
    },
    mapping,
    sourceColumns,
  };
};

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

export const isAbortError = (error: unknown): boolean => {
  const candidate = error as { name?: string; code?: string } | null;
  return (
    candidate?.name === 'CanceledError' ||
    candidate?.name === 'AbortError' ||
    candidate?.code === 'ERR_CANCELED'
  );
};
