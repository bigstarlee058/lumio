const NUMBER_PATTERN = '-?\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{1,2})?|-?\\d+(?:[.,]\\d{1,2})?';

const MONTH_DATE_RANGE_REGEX =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}\s*[-–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?\b/i;

const DATE_RANGE_REGEX =
  /\d{4}[-/.]\d{2}[-/.]\d{2}\s*[-–]\s*\d{4}[-/.]\d{2}[-/.]\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s*[-–]\s*\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/;

const ADDRESS_LIKE_REGEX = /\b[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/;

export const isLikelySentence = (value: string): boolean => {
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
};

export const isDateRangeLike = (value: string): boolean => {
  return DATE_RANGE_REGEX.test(value) || MONTH_DATE_RANGE_REGEX.test(value);
};

export const isAddressLike = (value: string): boolean => {
  if (ADDRESS_LIKE_REGEX.test(value)) {
    return true;
  }

  return /,\s*[A-Z]{2}\b/.test(value) && /\b\d{5}(?:-\d{4})?\b/.test(value);
};

export const isYearLikeAmount = (amount: number, hasExplicitCurrency: boolean): boolean => {
  if (hasExplicitCurrency) {
    return false;
  }

  return amount >= 1900 && amount <= 2099 && Number.isInteger(Math.round(amount));
};

export const scoreAmountCandidate = (
  amount: number,
  hasTotalKeyword: boolean,
  explicitCurrency: boolean,
  lineIndex: number,
  totalLines: number,
): number => {
  let score = 0;

  if (hasTotalKeyword) {
    score += 100;
  }

  if (explicitCurrency) {
    score += 30;
  }

  const lineWeight = totalLines > 1 ? lineIndex / (totalLines - 1) : 1;
  score += lineWeight * 20;
  score += Math.min(Math.log10(amount + 1) * 5, 20);

  return score;
};

export const extractAmountFragments = (
  line: string,
  includeNumbersWithoutCurrency: boolean,
  currencyTokenPattern: string,
): string[] => {
  const withCurrencyPattern = new RegExp(
    `${currencyTokenPattern}\\s*(?:${NUMBER_PATTERN})|(?:${NUMBER_PATTERN})\\s*${currencyTokenPattern}`,
    'gi',
  );
  const fragments = new Set<string>();

  for (const match of line.matchAll(withCurrencyPattern)) {
    const value = match[0]?.trim();
    if (value) {
      fragments.add(value);
    }
  }

  if (includeNumbersWithoutCurrency) {
    const numberRegex = new RegExp(NUMBER_PATTERN, 'g');
    for (const match of line.matchAll(numberRegex)) {
      const value = match[0]?.trim();
      if (value && /\d/.test(value)) {
        fragments.add(value);
      }
    }
  }

  return Array.from(fragments);
};
