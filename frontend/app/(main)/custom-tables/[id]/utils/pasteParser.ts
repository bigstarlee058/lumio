import { format } from 'date-fns';
import { PASTE_FIELD_ALIASES, type PasteFieldKey } from './pasteTypes';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export const normalizeToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\s._-]+/g, '')
    .trim();

export const matchFieldByName = (raw: string): PasteFieldKey | null => {
  const normalized = normalizeToken(raw);
  if (!normalized) {
    return null;
  }
  for (const [field, aliases] of Object.entries(PASTE_FIELD_ALIASES)) {
    if (aliases.some(alias => normalized === normalizeToken(alias))) {
      return field as PasteFieldKey;
    }
    if (aliases.some(alias => normalized.includes(normalizeToken(alias)))) {
      return field as PasteFieldKey;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Clipboard row parsing
// ---------------------------------------------------------------------------

const charIsQuote = (char: string): boolean => char === '"';

type QuoteAdvanceArgs = { line: string; i: number; inQuotes: boolean; current: string };

const advanceQuotedChar = ({
  line,
  i,
  inQuotes,
  current,
}: QuoteAdvanceArgs): { current: string; i: number; inQuotes: boolean } => {
  if (inQuotes && line[i + 1] === '"') {
    return { current: `${current}"`, i: i + 1, inQuotes };
  }
  return { current, i, inQuotes: !inQuotes };
};

export const splitDelimitedRow = (line: string, delimiter: string): string[] => {
  if (!line) {
    return [''];
  }
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    if (charIsQuote(char)) {
      const next = advanceQuotedChar({ line, i, inQuotes, current });
      current = next.current;
      i = next.i;
      inQuotes = next.inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
    i += 1;
  }
  result.push(current);
  return result;
};

const detectDelimiter = (lines: string[]): string => {
  const hasTabs = lines.some(line => line.includes('\t'));
  if (hasTabs) {
    return '\t';
  }
  const commaCount = lines.reduce((acc, line) => acc + (line.match(/,/g)?.length ?? 0), 0);
  const semiCount = lines.reduce((acc, line) => acc + (line.match(/;/g)?.length ?? 0), 0);
  if (semiCount > commaCount && semiCount > 0) {
    return ';';
  }
  if (commaCount > 0) {
    return ',';
  }
  return '\t';
};

export const parseClipboardRows = (text: string): { rows: string[][]; delimiter: string } => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  const delimiter = detectDelimiter(lines);
  const rows = lines.map(line => splitDelimitedRow(line, delimiter));
  return { rows, delimiter };
};

// ---------------------------------------------------------------------------
// Date cell parsing
// ---------------------------------------------------------------------------

export type ParsedCell<T> = { value: T | null; error: boolean };

type DateParts = { year: number; month: number; day: number };

const parseDateFromIso = (raw: string): DateParts | null => {
  const isoMatch = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!isoMatch) {
    return null;
  }
  return { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) };
};

const parseDateFromDmy = (raw: string): DateParts | null => {
  const dmyMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!dmyMatch) {
    return null;
  }
  return { year: Number(dmyMatch[3]), month: Number(dmyMatch[2]), day: Number(dmyMatch[1]) };
};

const validateParsedDate = (date: Date, parts: DateParts): boolean =>
  !Number.isNaN(date.getTime()) &&
  date.getFullYear() === parts.year &&
  date.getMonth() === parts.month - 1 &&
  date.getDate() === parts.day;

export const parseDateCell = (raw: string): ParsedCell<string> => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  const parts = parseDateFromIso(trimmed) ?? parseDateFromDmy(trimmed);
  if (!parts) {
    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) {
      return { value: null, error: true };
    }
    return { value: format(fallback, 'yyyy-MM-dd'), error: false };
  }
  const { year, month, day } = parts;
  const parsed = new Date(year, month - 1, day);
  if (!validateParsedDate(parsed, parts)) {
    return { value: null, error: true };
  }
  return { value: format(parsed, 'yyyy-MM-dd'), error: false };
};

// ---------------------------------------------------------------------------
// Number cell parsing
// ---------------------------------------------------------------------------

const normalizeSingleSeparator = (stripped: string, sepIndex: number): string => {
  const digitsAfter = stripped.length - sepIndex - 1;
  if (digitsAfter === 3) {
    return stripped.replace(/[.,]/g, '');
  }
  return stripped.replace(/[.,]/g, (_match, offset: number) => (offset === sepIndex ? '.' : ''));
};

const normalizeMultipleSeparators = (stripped: string): string => {
  const lastComma = stripped.lastIndexOf(',');
  const lastDot = stripped.lastIndexOf('.');
  const decimalPos = Math.max(lastComma, lastDot);
  return stripped.replace(/[.,]/g, (_match, offset: number) => (offset === decimalPos ? '.' : ''));
};

const normalizeStripped = (stripped: string): string => {
  const separators = stripped.match(/[.,]/g) || [];
  if (separators.length === 1) {
    return normalizeSingleSeparator(stripped, stripped.search(/[.,]/));
  }
  if (separators.length > 1) {
    return normalizeMultipleSeparators(stripped);
  }
  return stripped.replace(/[.,]/g, '');
};

export const parseNumberCell = (raw: string): ParsedCell<number> => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  const normalized = normalizeStripped(trimmed.replace(/\s/g, ''));
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
    return { value: null, error: true };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { value: null, error: true };
  }
  return { value, error: false };
};

// ---------------------------------------------------------------------------
// Currency cell parsing
// ---------------------------------------------------------------------------

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

const normalizeCurrencyToken = (value: string): string =>
  normalizeToken(value).replace(/[^\p{L}\p{N}]/gu, '');

export const resolveCurrencyCode = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (CURRENCY_SYMBOLS[trimmed]) {
    return CURRENCY_SYMBOLS[trimmed];
  }
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }
  const normalized = normalizeCurrencyToken(trimmed);
  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    if (aliases.some(alias => normalizeCurrencyToken(alias) === normalized)) {
      return code;
    }
  }
  return null;
};

const matchCurrencyInOptions = (
  trimmed: string,
  options: string[],
  resolved: string | null,
): string | null => {
  const normalizedOptions = options.map(opt => normalizeToken(opt));
  const matchIndex = normalizedOptions.indexOf(normalizeToken(trimmed));
  if (matchIndex !== -1) {
    return options[matchIndex];
  }
  if (resolved) {
    const resolvedIndex = normalizedOptions.indexOf(normalizeToken(resolved));
    if (resolvedIndex !== -1) {
      return options[resolvedIndex];
    }
  }
  return null;
};

export const parseCurrencyCell = (raw: string, options?: string[]): ParsedCell<string> => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  const resolved = resolveCurrencyCode(trimmed);
  if (options?.length) {
    const match = matchCurrencyInOptions(trimmed, options, resolved);
    if (match) {
      return { value: match, error: false };
    }
    return { value: null, error: true };
  }
  if (resolved) {
    return { value: resolved, error: false };
  }
  return { value: null, error: true };
};

// ---------------------------------------------------------------------------
// Paid cell parsing
// ---------------------------------------------------------------------------

const PAID_POSITIVE = ['true', '1', 'yes', 'y', 't', 'да', 'оплачено', 'paid'];
const PAID_NEGATIVE = [
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

export const parsePaidCell = (raw: string): ParsedCell<boolean> => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return { value: null, error: false };
  }
  if (PAID_POSITIVE.includes(trimmed)) {
    return { value: true, error: false };
  }
  if (PAID_NEGATIVE.includes(trimmed)) {
    return { value: false, error: false };
  }
  return { value: null, error: true };
};
