import { UniversalAmountParser } from '@/modules/parsing/services/universal-amount-parser.service';
import {
  DEFAULT_RECEIPT_SYMBOL_TO_CURRENCY,
  createAmountFragmentParser,
  createReceiptAmountHelpers,
  createCurrencyExtractor,
  extractAmountWithCurrency,
  extractAmountFragments,
  extractCurrency,
  parseAmountFragment,
  selectTopAmountCandidate,
} from '@/common/utils/receipt-amount.util';

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

describe('receipt amount utilities', () => {
  const amountParser = new UniversalAmountParser();

  it('extracts explicit currency from text', () => {
    expect(extractCurrency('Celkem: 1 500,00 CZK', amountParser, SYMBOL_TO_CURRENCY)).toBe('CZK');
    expect(extractCurrency('Итого: 700 KZT', amountParser, SYMBOL_TO_CURRENCY)).toBe('KZT');
  });

  it('collects currency and numeric fragments from a total line', () => {
    const fragments = extractAmountFragments('Amount Due: $1,234.56', true, NUMBER_PATTERN, '(?:\\$|USD)');

    expect(fragments).toContain('$1,234.56');
    expect(fragments).toContain('1,234.56');
  });

  it('parses a currency amount fragment', async () => {
    const parsed = await parseAmountFragment('$1,234.56', {
      amountParser,
      extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
      numberPattern: NUMBER_PATTERN,
    });

    expect(parsed).toEqual({ amount: 1234.56, currency: 'USD' });
  });

  it('builds reusable currency and amount fragment helpers', async () => {
    const extractCurrencyHelper = createCurrencyExtractor(amountParser, SYMBOL_TO_CURRENCY);
    const parseAmountFragmentHelper = createAmountFragmentParser({
      amountParser,
      numberPattern: NUMBER_PATTERN,
      extractCurrency: extractCurrencyHelper,
    });

    expect(extractCurrencyHelper('Total: 700 KZT')).toBe('KZT');
    await expect(parseAmountFragmentHelper('$12.50')).resolves.toEqual({
      amount: 12.5,
      currency: 'USD',
    });
  });

  it('builds shared receipt amount helpers from default currency symbols', async () => {
    const helpers = createReceiptAmountHelpers(amountParser, NUMBER_PATTERN);

    expect(DEFAULT_RECEIPT_SYMBOL_TO_CURRENCY['₸']).toBe('KZT');
    expect(helpers.extractCurrency('Total: 700 KZT')).toBe('KZT');
    await expect(helpers.parseAmountFragment('$12.50')).resolves.toEqual({
      amount: 12.5,
      currency: 'USD',
    });
  });

  it('selects the top scored amount candidate with amount tie-breaker', () => {
    expect(
      selectTopAmountCandidate([
        { amount: 10, score: 50, currency: 'USD' },
        { amount: 20, score: 50, currency: 'EUR' },
        { amount: 5, score: 70, currency: 'KZT' },
      ]),
    ).toEqual({ amount: 5, score: 70, currency: 'KZT' });

    expect(
      selectTopAmountCandidate([
        { amount: 10, score: 50, currency: 'USD' },
        { amount: 20, score: 50, currency: 'EUR' },
      ]),
    ).toEqual({ amount: 20, score: 50, currency: 'EUR' });

    expect(selectTopAmountCandidate([])).toBeUndefined();
  });

  it('returns null for empty amount fragments', async () => {
    await expect(
      parseAmountFragment('   ', {
        amountParser,
        extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
        numberPattern: NUMBER_PATTERN,
      }),
    ).resolves.toBeNull();
  });

  it('prefers a total line when extracting amount with currency', async () => {
    const parsed = await extractAmountWithCurrency(
      ['Item 1  10.00', 'Total: $30.49'],
      'Item 1  10.00\nTotal: $30.49',
      {
        amountParser,
        numberPattern: NUMBER_PATTERN,
        extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
        extractAmountFragments: (line, includeNumbersWithoutCurrency, currencyTokenPattern) =>
          extractAmountFragments(
            line,
            includeNumbersWithoutCurrency,
            NUMBER_PATTERN,
            currencyTokenPattern,
          ),
        parseAmountFragment: fragment =>
          parseAmountFragment(fragment, {
            amountParser,
            extractCurrency: text => extractCurrency(text, amountParser, SYMBOL_TO_CURRENCY),
            numberPattern: NUMBER_PATTERN,
          }),
        getCurrencyTokenPattern: () => '(?:\\$|USD|KZT|CZK|Kč)',
        hasTotalKeyword: line => /total/i.test(line),
      },
    );

    expect(parsed).toEqual({ amount: 30.49, currency: 'USD' });
  });
});
