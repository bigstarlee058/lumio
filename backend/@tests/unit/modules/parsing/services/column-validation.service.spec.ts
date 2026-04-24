import { ColumnValidationService } from '@/modules/parsing/services/column-validation.service';
import type { ParsedTransaction } from '@/modules/parsing/interfaces/parsed-statement.interface';

describe('ColumnValidationService', () => {
  let service: ColumnValidationService;

  const makeTransaction = (overrides: Partial<ParsedTransaction> = {}): ParsedTransaction => ({
    transactionDate: new Date('2026-01-15'),
    counterpartyName: 'Test Company',
    paymentPurpose: 'Payment for services',
    ...overrides,
  });

  beforeEach(() => {
    service = new ColumnValidationService();
  });

  describe('validateTransactions', () => {
    it('returns valid result for well-formed transactions', async () => {
      const transactions = [
        makeTransaction({ debit: 1000, currency: 'KZT' }),
        makeTransaction({ credit: 500, currency: 'KZT' }),
      ];

      const result = await service.validateTransactions(transactions);

      expect(result.isValid).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
      expect(result.qualityScore).toBe(1.0);
    });

    it('returns empty corrected transactions for empty input', async () => {
      const result = await service.validateTransactions([]);

      expect(result.correctedTransactions).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('detects missing required field transactionDate', async () => {
      const transactions = [
        makeTransaction({ transactionDate: undefined as any }),
      ];

      const result = await service.validateTransactions(transactions);

      expect(result.isValid).toBe(false);
      const missingDate = result.inconsistencies.find(
        i => i.field === 'transactionDate' && i.type === 'missing_column',
      );
      expect(missingDate).toBeDefined();
      expect(missingDate?.severity).toBe('high');
    });

    it('detects missing required field counterpartyName', async () => {
      const transactions = [makeTransaction({ counterpartyName: '' })];

      const result = await service.validateTransactions(transactions);

      expect(result.isValid).toBe(false);
      const missing = result.inconsistencies.find(
        i => i.field === 'counterpartyName' && i.type === 'missing_column',
      );
      expect(missing).toBeDefined();
    });

    it('detects missing required field paymentPurpose', async () => {
      const transactions = [makeTransaction({ paymentPurpose: '' })];

      const result = await service.validateTransactions(transactions);

      expect(result.isValid).toBe(false);
      const missing = result.inconsistencies.find(i => i.field === 'paymentPurpose');
      expect(missing).toBeDefined();
    });

    it('flags transaction with neither debit nor credit', async () => {
      const transactions = [
        {
          transactionDate: new Date('2026-01-15'),
          counterpartyName: 'Company',
          paymentPurpose: 'Services',
          // no debit or credit
        },
      ];

      const result = await service.validateTransactions(transactions);

      // Financial logic requires either debit or credit to be set
      expect(result.isValid).toBe(false);
      const missingAmount = result.inconsistencies.find(i => i.field === 'debit/credit');
      expect(missingAmount).toBeDefined();
    });

    it('auto-corrects string debit field to number', async () => {
      const transactions = [makeTransaction({ debit: '1000' as any })];

      const result = await service.validateTransactions(transactions);

      const corrected = result.correctedTransactions[0];
      expect(typeof corrected.debit).toBe('number');
      expect(corrected.debit).toBe(1000);
    });

    it('returns quality score between 0.1 and 1.0', async () => {
      const transactions = [makeTransaction({ counterpartyName: '' })];

      const result = await service.validateTransactions(transactions);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0.1);
      expect(result.qualityScore).toBeLessThanOrEqual(1.0);
    });

    it('reduces quality score for each high-severity inconsistency', async () => {
      const goodResult = await service.validateTransactions([makeTransaction({ debit: 100 })]);
      const badResult = await service.validateTransactions([
        makeTransaction({ transactionDate: undefined as any, counterpartyName: '' }),
      ]);

      expect(badResult.qualityScore).toBeLessThan(goodResult.qualityScore);
    });

    it('includes row number in inconsistency for multi-row validation', async () => {
      const transactions = [
        makeTransaction({ debit: 100 }),
        makeTransaction({ counterpartyName: '' }),
      ];

      const result = await service.validateTransactions(transactions);

      const withRowNumber = result.inconsistencies.find(i => i.rowNumber !== undefined);
      expect(withRowNumber).toBeDefined();
    });

    it('returns corrected transactions array of same length as input', async () => {
      const transactions = [
        makeTransaction({ debit: 100 }),
        makeTransaction({ credit: 200 }),
        makeTransaction({ debit: 50 }),
      ];

      const result = await service.validateTransactions(transactions);

      expect(result.correctedTransactions).toHaveLength(3);
    });
  });

  describe('getSchema', () => {
    it('returns the transaction schema', () => {
      const schema = service.getSchema();

      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThan(0);
    });

    it('schema contains required fields transactionDate, counterpartyName, paymentPurpose', () => {
      const schema = service.getSchema();
      const requiredFields = schema.filter(s => s.required).map(s => s.field);

      expect(requiredFields).toContain('transactionDate');
      expect(requiredFields).toContain('counterpartyName');
      expect(requiredFields).toContain('paymentPurpose');
    });

    it('schema contains optional fields debit and credit', () => {
      const schema = service.getSchema();
      const optionalFields = schema.filter(s => !s.required).map(s => s.field);

      expect(optionalFields).toContain('debit');
      expect(optionalFields).toContain('credit');
    });

    it('returns a copy that does not mutate internal schema', () => {
      const schema1 = service.getSchema();
      schema1.push({ field: 'custom', type: 'string', required: false });
      const schema2 = service.getSchema();

      expect(schema2.find(s => s.field === 'custom')).toBeUndefined();
    });
  });

  describe('addCustomSchema', () => {
    it('stores a custom schema under a given name', () => {
      const customSchema = [{ field: 'customField', type: 'string' as const, required: true }];

      expect(() => service.addCustomSchema('custom', customSchema)).not.toThrow();
    });
  });
});
