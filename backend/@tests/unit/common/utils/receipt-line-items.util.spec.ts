import { UniversalAmountParser } from '@/modules/parsing/services/universal-amount-parser.service';
import { extractCurrency, parseAmountFragment } from '@/common/utils/receipt-amount.util';
import { extractLineItems } from '@/common/utils/receipt-line-items.util';

const NUMBER_PATTERN = '-?\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{1,2})?|-?\\d+(?:[.,]\\d{1,2})?';

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₽': 'RUB',
  '₸': 'KZT',
  Kč: 'CZK',
};

describe('receipt line item utility', () => {
  const amountParser = new UniversalAmountParser();
  const currencyTokenPattern = '(?:\\$|USD|KZT|CZK|Kč)';

  it('extracts a normal line item', async () => {
    const lineItems = await extractLineItems(['GitHub Actions 10.00'], {
      numberPattern: NUMBER_PATTERN,
      currencyTokenPattern,
      shouldSkipLine: () => false,
      parseAmountFragment: fragment =>
        parseAmountFragment(fragment, {
          amountParser,
          extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
          numberPattern: NUMBER_PATTERN,
        }),
      hasExplicitCurrency: value =>
        Boolean(extractCurrency(value, amountParser, SYMBOL_TO_CURRENCY)),
    });

    expect(lineItems).toEqual([{ description: 'GitHub Actions', amount: 10 }]);
  });

  it('skips a line item when the filter says so', async () => {
    const lineItems = await extractLineItems(['Thanks for your purchase! 202.00'], {
      numberPattern: NUMBER_PATTERN,
      currencyTokenPattern,
      shouldSkipLine: () => true,
      parseAmountFragment: fragment =>
        parseAmountFragment(fragment, {
          amountParser,
          extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
          numberPattern: NUMBER_PATTERN,
        }),
      hasExplicitCurrency: value =>
        Boolean(extractCurrency(value, amountParser, SYMBOL_TO_CURRENCY)),
    });

    expect(lineItems).toEqual([]);
  });
});
