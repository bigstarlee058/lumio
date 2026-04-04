import {
  buildCurrencyTokenPattern,
  extractLineItemsFromLines,
  extractAmountFragments,
  escapeRegex,
  isAddressLike,
  isDateRangeLike,
  isLikelySentence,
  isYearLikeAmount,
  scoreAmountCandidate,
  shouldSkipLineItem,
} from '@/common/utils/receipt-extraction.util';

describe('receipt-extraction util', () => {
  it('detects sentence-like descriptions', () => {
    expect(isLikelySentence('Thanks for your purchase!')).toBe(true);
    expect(isLikelySentence('GitHub Actions')).toBe(false);
  });

  it('detects date range and address-like descriptions', () => {
    expect(isDateRangeLike('Feb 27, 2026 - Mar 15, 2026')).toBe(true);
    expect(isDateRangeLike('GitHub Actions')).toBe(false);
    expect(isAddressLike('San Francisco, CA 94107')).toBe(true);
    expect(isAddressLike('Claude subscription')).toBe(false);
  });

  it('treats plain year-like amounts as invalid line item values unless currency is explicit', () => {
    expect(isYearLikeAmount(2026, false)).toBe(true);
    expect(isYearLikeAmount(2026, true)).toBe(false);
  });

  it('extracts currency and total fragments from line text', () => {
    const fragments = extractAmountFragments('Amount Due: $1,234.56', true, '(?:\\$|USD)');

    expect(fragments).toEqual(['$1,234.56', '1,234.56']);
  });

  it('scores total lines with explicit currency above neutral candidates', () => {
    const neutral = scoreAmountCandidate(100, false, false, 0, 5);
    const total = scoreAmountCandidate(100, true, true, 4, 5);

    expect(total).toBeGreaterThan(neutral);
  });

  it('combines the guards for line-item filtering', () => {
    expect(shouldSkipLineItem('Thanks for your purchase!', 202.0, false)).toBe(true);
    expect(shouldSkipLineItem('GitHub Actions', 10.0, false)).toBe(false);
  });

  it('escapes regex special characters for currency symbols', () => {
    expect(escapeRegex('A+B?')).toBe('A\\+B\\?');
  });

  it('builds a currency token pattern from symbols and codes', () => {
    expect(buildCurrencyTokenPattern(['$', 'A+B'], ['USD', 'KZT'])).toBe(
      '(?:A\\+B|\\$|USD|KZT)',
    );
  });

  it('extracts line items with configurable tax-line skipping', async () => {
    const result = await extractLineItemsFromLines({
      lines: ['Service Fee 10.00', 'Tax 1.00', 'Total 11.00'],
      currencyTokenPattern: '(?:USD|\\$)',
      numberPattern: '-?\\d+(?:[.,]\\d{1,2})?',
      hasTotalKeyword: line => /total/i.test(line),
      isTaxLine: line => /tax/i.test(line),
      parseAmountFragment: async fragment => ({
        amount: Number(fragment.replace(/[^\d.]/g, '')),
      }),
      extractCurrency: () => undefined,
      skipTaxLines: true,
    });

    expect(result).toEqual([{ description: 'Service Fee', amount: 10 }]);
  });
});
