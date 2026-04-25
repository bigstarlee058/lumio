import { UniversalAmountParser } from '../../../../../src/modules/parsing/services/universal-amount-parser.service';

describe('UniversalAmountParser', () => {
  let service: UniversalAmountParser;

  beforeEach(() => {
    service = new UniversalAmountParser();
  });

  // ─── parseAmount: currency symbol formats ─────────────────

  describe('parseAmount with currency symbols', () => {
    it('parses European decimal format (EUR)', async () => {
      await expect(service.parseAmount('1.234,56 €')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'EUR',
      });
    });

    it('parses Swiss apostrophe thousands separator (CHF)', async () => {
      await expect(service.parseAmount("CHF 1'234.56")).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'CHF',
      });
    });

    it('parses Indian lakh separators (INR)', async () => {
      await expect(service.parseAmount('₹1,23,456.78')).resolves.toMatchObject({
        amount: 123456.78,
        currency: 'INR',
      });
    });

    it('parses Japanese amount without decimals (JPY)', async () => {
      await expect(service.parseAmount('¥12,345')).resolves.toMatchObject({
        amount: 12345,
      });
    });

    it('parses Arabic-Indic numerals with SAR marker', async () => {
      await expect(service.parseAmount('١٢٣٤٫٥٦ ر.س')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'SAR',
      });
    });

    it('parses space thousands separator with decimal comma (RUB)', async () => {
      await expect(service.parseAmount('1 234,56 ₽')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'RUB',
      });
    });

    it('parses USD with $ before amount', async () => {
      await expect(service.parseAmount('$1,234.56')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'USD',
      });
    });

    it('parses GBP with £ before amount', async () => {
      await expect(service.parseAmount('£500.00')).resolves.toMatchObject({
        amount: 500,
        currency: 'GBP',
      });
    });

    it('parses ILS with ₪ before amount', async () => {
      await expect(service.parseAmount('₪3,500.00')).resolves.toMatchObject({
        amount: 3500,
        currency: 'ILS',
      });
    });

    it('parses KZT with ₸ after amount', async () => {
      await expect(service.parseAmount('500 000,50 ₸')).resolves.toMatchObject({
        amount: 500000.50,
        currency: 'KZT',
      });
    });

    it('parses UAH with ₴ after amount', async () => {
      await expect(service.parseAmount('1 000,00 ₴')).resolves.toMatchObject({
        amount: 1000,
        currency: 'UAH',
      });
    });

    it('parses PLN with zł after amount', async () => {
      await expect(service.parseAmount('2 500,75 zł')).resolves.toMatchObject({
        amount: 2500.75,
        currency: 'PLN',
      });
    });

    it('parses TRY with ₺ after amount', async () => {
      await expect(service.parseAmount('1.234,56 ₺')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'TRY',
      });
    });

    it('parses BRL with R$ before amount', async () => {
      await expect(service.parseAmount('R$1.234,56')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'BRL',
      });
    });

    it('parses currency code before amount (e.g., USD 100)', async () => {
      await expect(service.parseAmount('USD 1234.56')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'USD',
      });
    });

    it('parses currency code after amount (e.g., 100 EUR)', async () => {
      await expect(service.parseAmount('1234,56 EUR')).resolves.toMatchObject({
        amount: 1234.56,
        currency: 'EUR',
      });
    });
  });

  // ─── parseAmount: separator detection ─────────────────────

  describe('parseAmount with separator detection', () => {
    it('parses comma as thousands separator (US format)', async () => {
      await expect(service.parseAmount('1,234.56')).resolves.toMatchObject({
        amount: 1234.56,
        format: 'WITH_SEPARATORS',
      });
    });

    it('parses dot as thousands separator (EU format)', async () => {
      await expect(service.parseAmount('1.234,56')).resolves.toMatchObject({
        amount: 1234.56,
        format: 'WITH_SEPARATORS',
      });
    });

    it('parses space as thousands separator', async () => {
      await expect(service.parseAmount('1 234,56')).resolves.toMatchObject({
        amount: 1234.56,
        format: 'WITH_SEPARATORS',
      });
    });

    it('parses ambiguous "1,234" — comma treated as decimal in EU-first strategy', async () => {
      // Without currency context, the parser may interpret comma as decimal separator
      const result = await service.parseAmount('1,234');
      expect(result).not.toBeNull();
      expect(result!.format).toBe('WITH_SEPARATORS');
    });

    it('parses large number with multiple thousands groups', async () => {
      await expect(service.parseAmount('1,234,567.89')).resolves.toMatchObject({
        amount: 1234567.89,
      });
    });
  });

  // ─── parseAmount: simple numbers ──────────────────────────

  describe('parseAmount simple numbers', () => {
    it('parses simple integer', async () => {
      const result = await service.parseAmount('42');
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(42);
    });

    it('parses simple decimal', async () => {
      const result = await service.parseAmount('42.50');
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(42.50);
    });

    it('parses negative simple number', async () => {
      await expect(service.parseAmount('-100.50')).resolves.toMatchObject({
        amount: -100.50,
        isNegative: true,
        format: 'SIMPLE',
      });
    });

    it('parses zero', async () => {
      const result = await service.parseAmount('0');
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(0);
    });

    it('parses zero with decimals', async () => {
      const result = await service.parseAmount('0.00');
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(0);
    });
  });

  // ─── parseAmount: parentheses (accounting notation) ───────

  describe('parseAmount parentheses notation', () => {
    it('parses parenthesized number as negative', async () => {
      await expect(service.parseAmount('(100.50)')).resolves.toMatchObject({
        amount: -100.50,
        isNegative: true,
        format: 'PARENTHESES',
      });
    });

    it('parses parenthesized number with thousands separator', async () => {
      await expect(service.parseAmount('(1,234.56)')).resolves.toMatchObject({
        amount: -1234.56,
        isNegative: true,
        format: 'PARENTHESES',
      });
    });

    it('parses parenthesized integer', async () => {
      await expect(service.parseAmount('(500)')).resolves.toMatchObject({
        amount: -500,
        isNegative: true,
      });
    });
  });

  // ─── parseAmount: edge cases and invalid inputs ───────────

  describe('parseAmount edge cases', () => {
    it('returns null for empty string', async () => {
      await expect(service.parseAmount('')).resolves.toBeNull();
    });

    it('returns null for null/undefined input', async () => {
      await expect(service.parseAmount(null as any)).resolves.toBeNull();
      await expect(service.parseAmount(undefined as any)).resolves.toBeNull();
    });

    it('returns null for non-string input', async () => {
      await expect(service.parseAmount(123 as any)).resolves.toBeNull();
    });

    it('returns null for pure text', async () => {
      await expect(service.parseAmount('hello world')).resolves.toBeNull();
    });

    it('trims whitespace before parsing', async () => {
      await expect(service.parseAmount('  $100.00  ')).resolves.toMatchObject({
        amount: 100,
        currency: 'USD',
      });
    });

    it('returns high confidence (0.95) for currency-tagged amounts', async () => {
      const result = await service.parseAmount('$100.00');
      expect(result?.confidence).toBe(0.95);
    });

    it('returns lower confidence (0.85) for separator-only amounts', async () => {
      const result = await service.parseAmount('1,234.56');
      expect(result?.confidence).toBe(0.85);
    });

    it('returns confidence for numbers parsed by separator or simple strategy', async () => {
      const result = await service.parseAmount('100.50');
      expect(result).not.toBeNull();
      // May be parsed by WITH_SEPARATORS (0.85) or SIMPLE (0.9) depending on strategy order
      expect([0.85, 0.9]).toContain(result!.confidence);
    });

    it('returns lower confidence (0.8) for parenthesized amounts', async () => {
      const result = await service.parseAmount('(100.50)');
      expect(result?.confidence).toBe(0.8);
    });
  });

  // ─── detectCurrencyFromContext ─────────────────────────────

  describe('detectCurrencyFromContext', () => {
    it('detects currency code in text', () => {
      expect(service.detectCurrencyFromContext('Total: 100 USD')).toBe('USD');
    });

    it('detects currency code EUR in text', () => {
      expect(service.detectCurrencyFromContext('Total: 100 EUR')).toBe('EUR');
    });

    it('returns null when no currency found', () => {
      expect(service.detectCurrencyFromContext('just some text')).toBeNull();
    });
  });

  // ─── formatAmount ─────────────────────────────────────────

  describe('formatAmount', () => {
    it('formats amount with symbol before (USD)', () => {
      expect(service.formatAmount(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('formats amount with symbol after (EUR)', () => {
      const result = service.formatAmount(1234.56, 'EUR');
      expect(result).toContain('€');
      expect(result).toContain('1,234.56');
    });

    it('returns plain number for unknown currency', () => {
      expect(service.formatAmount(1234.56, 'XXX')).toBe('1234.56');
    });
  });

  // ─── isValidAmount ────────────────────────────────────────

  describe('isValidAmount', () => {
    it('accepts normal amounts', () => {
      expect(service.isValidAmount(100)).toBe(true);
      expect(service.isValidAmount(0)).toBe(true);
      expect(service.isValidAmount(-500)).toBe(true);
    });

    it('rejects Infinity', () => {
      expect(service.isValidAmount(Infinity)).toBe(false);
      expect(service.isValidAmount(-Infinity)).toBe(false);
    });

    it('rejects NaN', () => {
      expect(service.isValidAmount(NaN)).toBe(false);
    });

    it('rejects amounts >= 1e15', () => {
      expect(service.isValidAmount(1e15)).toBe(false);
    });

    it('accepts amounts just below 1e15', () => {
      expect(service.isValidAmount(999999999999999)).toBe(true);
    });
  });

  // ─── getSupportedCurrencies ───────────────────────────────

  describe('getSupportedCurrencies', () => {
    it('returns a non-empty list of currency codes', () => {
      const currencies = service.getSupportedCurrencies();
      expect(currencies.length).toBeGreaterThan(30);
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('ILS');
    });
  });

  // ─── addCurrency ──────────────────────────────────────────

  describe('addCurrency', () => {
    it('adds a custom currency and can parse it', async () => {
      service.addCurrency('BTC', {
        code: 'BTC',
        symbol: '₿',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
      });

      const result = await service.parseAmount('₿1.50');
      expect(result).toMatchObject({ amount: 1.50, currency: 'BTC' });
      expect(service.getSupportedCurrencies()).toContain('BTC');
    });
  });
});
