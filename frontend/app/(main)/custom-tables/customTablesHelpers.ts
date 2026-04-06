import { getRecord } from '@/app/lib/side-panel-utils';

export type ExportColumn = {
  key: string;
  title?: string | null;
  position?: number | null;
};

export const getExportColumn = (value: unknown): ExportColumn | null => {
  const record = getRecord(value);
  if (!record || typeof record.key !== 'string') return null;

  return {
    key: record.key,
    title: typeof record.title === 'string' ? record.title : null,
    position: typeof record.position === 'number' ? record.position : null,
  };
};

export const formatUpdatedDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}.${month}.${year}`;
};

export const formatUpdatedBadge = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const isSameDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();

  if (isSameDay) {
    return 'Today';
  }

  return formatUpdatedDate(value);
};

export const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'table_export';

export const toCsv = (headers: string[], rows: Array<Record<string, unknown>>): string => {
  const escapeCell = (input: unknown) => {
    const raw = input === null || input === undefined ? '' : String(input);
    if (raw.includes('"')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    if (raw.includes(',') || raw.includes('\n')) {
      return `"${raw}"`;
    }
    return raw;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map(row => headers.map(header => escapeCell(row[header])).join(','));
  return [headerLine, ...dataLines].join('\n');
};
