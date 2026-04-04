const MONTH_DATE_RANGE_REGEX =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}\s*[-–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?\b/i;

const DATE_RANGE_REGEX =
  /\d{4}[-/.]\d{2}[-/.]\d{2}\s*[-–]\s*\d{4}[-/.]\d{2}[-/.]\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s*[-–]\s*\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/;

const ADDRESS_LIKE_REGEX = /\b[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/;

export function isLikelySentence(value: string): boolean {
  const lower = value.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  if (words.length >= 6) {
    return true;
  }

  if (/^(we|your|thanks?|dear|hello|hi)\b/.test(lower)) {
    return true;
  }

  if (/[.!?]/.test(value) && words.length >= 4) {
    return true;
  }

  return false;
}

export function isDateRangeLike(value: string): boolean {
  if (DATE_RANGE_REGEX.test(value)) {
    return true;
  }

  if (MONTH_DATE_RANGE_REGEX.test(value)) {
    return true;
  }

  return false;
}

export function isAddressLike(value: string): boolean {
  if (ADDRESS_LIKE_REGEX.test(value)) {
    return true;
  }

  if (/\,\s*[A-Z]{2}\b/.test(value) && /\b\d{5}(?:-\d{4})?\b/.test(value)) {
    return true;
  }

  return false;
}

export function isYearLikeAmount(amount: number, hasExplicitCurrency: boolean): boolean {
  if (hasExplicitCurrency) {
    return false;
  }

  return amount >= 1900 && amount <= 2099 && Number.isInteger(Math.round(amount));
}

export function shouldSkipLineItem(
  description: string,
  amount: number,
  hasExplicitCurrency: boolean,
): boolean {
  return (
    isLikelySentence(description) ||
    isDateRangeLike(description) ||
    isAddressLike(description) ||
    isYearLikeAmount(amount, hasExplicitCurrency)
  );
}
