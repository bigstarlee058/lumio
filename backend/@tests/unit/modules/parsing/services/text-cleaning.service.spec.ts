import { TextCleaningService } from '@/modules/parsing/services/text-cleaning.service';

describe('TextCleaningService', () => {
  let service: TextCleaningService;

  beforeEach(() => {
    service = new TextCleaningService();
  });

  describe('cleanText', () => {
    it('returns empty result for null input', async () => {
      const result = await service.cleanText(null as any);

      expect(result.cleanedText).toBe('');
      expect(result.confidence).toBe(0);
    });

    it('returns empty result for empty string', async () => {
      const result = await service.cleanText('');

      expect(result.cleanedText).toBe('');
      expect(result.confidence).toBe(0);
    });

    it('removes English null indicators', async () => {
      const result = await service.cleanText('n/a');

      expect(result.cleanedText).toBe('');
    });

    it('removes Russian null indicators', async () => {
      const result = await service.cleanText('не указано');

      expect(result.cleanedText).toBe('');
    });

    it('removes date patterns from text', async () => {
      const result = await service.cleanText('Payment 2026-01-15 for services');

      expect(result.cleanedText).not.toContain('2026-01-15');
    });

    it('normalizes multiple spaces', async () => {
      const result = await service.cleanText('Hello    World');

      expect(result.cleanedText).not.toMatch(/\s{2,}/);
    });

    it('removes URLs', async () => {
      const result = await service.cleanText('Visit https://example.com for details');

      expect(result.cleanedText).not.toContain('https://');
    });

    it('removes email addresses', async () => {
      const result = await service.cleanText('Contact support@example.com for help');

      expect(result.cleanedText).not.toContain('@');
    });

    it('returns original text unchanged when no rules apply', async () => {
      const result = await service.cleanText('Grocery Store Purchase');

      expect(result.originalText).toBe('Grocery Store Purchase');
    });

    it('tracks changes made during cleaning', async () => {
      const result = await service.cleanText('Visit https://example.com today');

      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('returns confidence between 0 and 1', async () => {
      const result = await service.cleanText('Some text to clean');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('removes transaction type labels', async () => {
      const result = await service.cleanText('Supermarket перевод funds');

      expect(result.cleanedText).not.toMatch(/\bперевод\b/i);
    });
  });

  describe('cleanCounterpartyName', () => {
    it('removes ТОО legal form prefix', async () => {
      const result = await service.cleanCounterpartyName('ТОО Рога и Копыта');

      expect(result.cleanedText).not.toMatch(/^ТОО/i);
    });

    it('removes ИП legal form prefix', async () => {
      const result = await service.cleanCounterpartyName('ИП Иванов А.А.');

      expect(result.cleanedText).not.toMatch(/^ИП/i);
    });

    it('handles already clean company name', async () => {
      const result = await service.cleanCounterpartyName('Apple Store');

      expect(result.cleanedText.length).toBeGreaterThan(0);
    });

    it('returns empty result for null input', async () => {
      const result = await service.cleanCounterpartyName(null as any);

      expect(result.cleanedText).toBe('');
      expect(result.confidence).toBe(0);
    });
  });

  describe('cleanPaymentPurpose', () => {
    it('cleans payment purpose text', async () => {
      const result = await service.cleanPaymentPurpose(
        'Перевод средств за услуги по договору №123',
      );

      expect(result).toBeDefined();
      expect(result.cleanedText).toBeDefined();
    });

    it('handles clean payment purpose without modifications', async () => {
      const result = await service.cleanPaymentPurpose('Office supplies purchase');

      expect(result.confidence).toBeGreaterThan(0);
    });

    it('removes debit/credit indicators from payment purpose', async () => {
      const result = await service.cleanPaymentPurpose('Debit: payment for groceries');

      expect(result.cleanedText).not.toMatch(/^debit:/i);
    });

    it('preserves meaningful content', async () => {
      const result = await service.cleanPaymentPurpose('Payment for office rent January 2026');

      expect(result.cleanedText.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedLocales', () => {
    it('returns en, ru, kk locales', () => {
      const locales = service.getSupportedLocales();

      expect(locales).toContain('en');
      expect(locales).toContain('ru');
      expect(locales).toContain('kk');
    });
  });

  describe('addCleaningRule', () => {
    it('adds a custom cleaning rule', async () => {
      service.addCleaningRule({
        pattern: /TESTJUNK/gi,
        replacement: '',
        description: 'Remove test junk',
        priority: 5,
      });

      const result = await service.cleanText('Payment TESTJUNK amount');

      expect(result.cleanedText).not.toContain('TESTJUNK');
    });
  });

  describe('addStopWords', () => {
    it('adds stop words for a locale and removes them when locale is provided', async () => {
      service.addStopWords('en', ['uniquestopword']);

      // Stop words are only applied when a locale parameter is passed to cleanText
      const result = await service.cleanText('uniquestopword services payment', 'en');

      expect(result.cleanedText).not.toMatch(/\buniquestopword\b/);
    });
  });

  describe('previewCleaning', () => {
    it('returns same result as cleanText', async () => {
      const text = 'Some payment text';
      const cleanResult = await service.cleanText(text);
      const previewResult = await service.previewCleaning(text);

      expect(previewResult.originalText).toBe(cleanResult.originalText);
    });
  });
});
