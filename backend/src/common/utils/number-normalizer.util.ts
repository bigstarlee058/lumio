/**
 * Normalizes numbers from bank statements
 * - Replaces comma with dot
 * - Removes thousands separators
 * - Converts to number
 */
export function normalizeNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  // Remove all spaces
  let normalized = value.replace(/\s/g, '');

  // Replace comma with dot
  normalized = normalized.replace(/,/g, '.');

  // Remove any non-digit characters except dot and minus
  normalized = normalized.replace(/[^\d.-]/g, '');

  // Handle multiple dots (keep only the last one)
  const parts = normalized.split('.');
  if (parts.length > 2) {
    normalized = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
  }

  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

export function normalizeNumberAdvanced(
  value: string | number | null | undefined,
  locale = 'en',
): { value: number | null; normalized: string } {
  if (value === null || value === undefined) {
    return { value: null, normalized: '' };
  }

  if (typeof value === 'number') {
    return { value, normalized: String(value) };
  }

  if (typeof value !== 'string') {
    return { value: null, normalized: '' };
  }

  let sanitized = value.replace(/[^\d.,-]/g, '').replace(/\s+/g, '');

  if (locale === 'de' || locale === 'ru') {
    sanitized = sanitized.replace(/\./g, '').replace(/,/g, '.');
  } else {
    if (sanitized.includes(',') && !sanitized.includes('.')) {
      sanitized = sanitized.replace(/,/g, '.');
    } else {
      sanitized = sanitized.replace(/,/g, '');
    }
  }

  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
  }

  const num = Number.parseFloat(sanitized);
  return { value: Number.isFinite(num) ? num : null, normalized: sanitized };
}

/**
 * Normalizes date strings to Date objects
 */
export function normalizeDate(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  const trimmed = dateStr.trim();
  const dateTimeMatch = trimmed.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (dateTimeMatch) {
    const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = dateTimeMatch;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
  }

  // Try different date formats
  const formats = [
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD.MM.YYYY
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }

      if (format === formats[1]) {
        // YYYY-MM-DD
        return new Date(dateStr);
      }

      if (format === formats[2]) {
        // DD/MM/YYYY
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
    }
  }

  // DD/MM/YY (2-digit year)
  const shortYearMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{2})(?!\d)/);
  if (shortYearMatch) {
    const [, dd, mm, yy] = shortYearMatch;
    const year = Number(yy) <= 49 ? 2000 + Number(yy) : 1900 + Number(yy);
    return new Date(year, Number(mm) - 1, Number(dd));
  }

  // Try direct parsing
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}
