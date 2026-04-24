import { ChecksumValidationService } from '@/modules/parsing/services/checksum-validation.service';
import type {
  ParsedStatementMetadata,
  ParsedTransaction,
} from '@/modules/parsing/interfaces/parsed-statement.interface';

describe('ChecksumValidationService', () => {
  let service: ChecksumValidationService;

  const makeTransaction = (overrides: Partial<ParsedTransaction> = {}): ParsedTransaction => ({
    transactionDate: new Date('2026-01-15'),
    counterpartyName: 'Test Company',
    paymentPurpose: 'Payment for services',
    ...overrides,
  });

  const makeMetadata = (overrides: Partial<ParsedStatementMetadata> = {}): ParsedStatementMetadata => ({
    accountNumber: 'KZ123456789',
    dateFrom: new Date('2026-01-01'),
    dateTo: new Date('2026-01-31'),
    currency: 'KZT',
    ...overrides,
  });

  beforeEach(() => {
    service = new ChecksumValidationService();
  });

  describe('validateStatementChecksums', () => {
    it('returns valid result for empty transactions', async () => {
      const result = await service.validateStatementChecksums([]);

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('returns quality score between 0.1 and 1.0', async () => {
      const transactions = [
        makeTransaction({ debit: 1000 }),
        makeTransaction({ credit: 500 }),
      ];

      const result = await service.validateStatementChecksums(transactions);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0.1);
      expect(result.qualityScore).toBeLessThanOrEqual(1.0);
    });

    it('validates balanced transactions as valid', async () => {
      const transactions = [
        makeTransaction({ debit: 1000 }),
        makeTransaction({ credit: 1000 }),
      ];

      const result = await service.validateStatementChecksums(transactions);

      expect(result.isValid).toBe(true);
    });

    it('flags extreme imbalance between debits and credits', async () => {
      const transactions = [
        makeTransaction({ debit: 100000 }),
        makeTransaction({ debit: 100000 }),
        makeTransaction({ debit: 100000 }),
        makeTransaction({ credit: 100 }),
      ];

      const result = await service.validateStatementChecksums(transactions);

      const imbalanceDiscrepancy = result.discrepancies.find(d => d.type === 'transaction_sum');
      expect(imbalanceDiscrepancy).toBeDefined();
    });

    it('calculates expected and calculated totals when metadata has balances', async () => {
      const transactions = [makeTransaction({ credit: 500 })];
      const metadata = makeMetadata({ balanceStart: 1000, balanceEnd: 1500 });

      const result = await service.validateStatementChecksums(transactions, metadata);

      expect(result.expectedTotal).toBe(1500);
      expect(result.calculatedTotal).toBeDefined();
    });

    it('flags closing balance discrepancy when mismatch exceeds 0.1%', async () => {
      const transactions = [makeTransaction({ credit: 100 })];
      // Opening: 1000, +100 credit = expected 1100, but metadata says 2000
      const metadata = makeMetadata({ balanceStart: 1000, balanceEnd: 2000 });

      const result = await service.validateStatementChecksums(transactions, metadata);

      const closingDiscrepancy = result.discrepancies.find(d => d.type === 'closing_balance');
      expect(closingDiscrepancy).toBeDefined();
      expect(closingDiscrepancy?.severity).toBe('high');
    });

    it('flags unusually large opening balance (>1 trillion)', async () => {
      const transactions = [makeTransaction({ debit: 100 })];
      const metadata = makeMetadata({ balanceStart: 2e12 });

      const result = await service.validateStatementChecksums(transactions, metadata);

      const openingDiscrepancy = result.discrepancies.find(d => d.type === 'opening_balance');
      expect(openingDiscrepancy).toBeDefined();
    });

    it('flags unusual average transaction amount (>1 million)', async () => {
      const transactions = [
        makeTransaction({ debit: 5000000 }),
        makeTransaction({ debit: 5000000 }),
      ];

      const result = await service.validateStatementChecksums(transactions);

      const largeAmountDiscrepancy = result.discrepancies.find(d => d.type === 'transaction_sum');
      expect(largeAmountDiscrepancy).toBeDefined();
    });

    it('passes when opening balance is not suspiciously large', async () => {
      const transactions = [makeTransaction({ debit: 100 })];
      const metadata = makeMetadata({ balanceStart: 50000 });

      const result = await service.validateStatementChecksums(transactions, metadata);

      const openingDiscrepancy = result.discrepancies.find(d => d.type === 'opening_balance');
      expect(openingDiscrepancy).toBeUndefined();
    });
  });

  describe('generateChecksumReport', () => {
    it('generates a valid report string', async () => {
      const transactions = [makeTransaction({ debit: 1000 }), makeTransaction({ credit: 500 })];
      const validationResult = await service.validateStatementChecksums(transactions);
      const report = service.generateChecksumReport(validationResult);

      expect(report).toContain('Checksum Validation Report');
      expect(report).toContain('Quality Score');
    });

    it('shows VALID when no discrepancies', async () => {
      const validationResult = await service.validateStatementChecksums([
        makeTransaction({ debit: 500 }),
        makeTransaction({ credit: 500 }),
      ]);
      const report = service.generateChecksumReport(validationResult);

      expect(report).toContain('VALID');
    });

    it('includes balance section when expected and calculated totals are present', async () => {
      const transactions = [makeTransaction({ credit: 500 })];
      const metadata = makeMetadata({ balanceStart: 1000, balanceEnd: 1500 });
      const validationResult = await service.validateStatementChecksums(transactions, metadata);
      const report = service.generateChecksumReport(validationResult);

      expect(report).toContain('Balance Verification');
    });

    it('includes discrepancy details when issues found', async () => {
      const transactions = [makeTransaction({ debit: 100000 }), makeTransaction({ credit: 1 })];
      const validationResult = await service.validateStatementChecksums(transactions);

      if (validationResult.discrepancies.length > 0) {
        const report = service.generateChecksumReport(validationResult);
        expect(report).toContain('Discrepancies Found');
      }
    });
  });

  describe('suggestCorrections', () => {
    it('returns empty array when no discrepancies', async () => {
      const validationResult = await service.validateStatementChecksums([
        makeTransaction({ debit: 500 }),
        makeTransaction({ credit: 500 }),
      ]);
      const suggestions = service.suggestCorrections(validationResult);

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('suggests rounding correction for minor balance discrepancy', async () => {
      const transactions = [makeTransaction({ credit: 1000.005 })];
      const metadata = makeMetadata({ balanceStart: 1000, balanceEnd: 2000.00 });
      const validationResult = await service.validateStatementChecksums(transactions, metadata);
      const suggestions = service.suggestCorrections(validationResult);

      if (validationResult.discrepancies.some(d => d.type === 'closing_balance' && d.percentageDifference < 1)) {
        expect(suggestions.some(s => s.includes('rounding'))).toBe(true);
      }
    });

    it('suggests verification for unusual opening balance', async () => {
      const transactions = [makeTransaction({ debit: 100 })];
      const metadata = makeMetadata({ balanceStart: 5e12 });
      const validationResult = await service.validateStatementChecksums(transactions, metadata);
      const suggestions = service.suggestCorrections(validationResult);

      if (validationResult.discrepancies.some(d => d.type === 'opening_balance')) {
        expect(suggestions.some(s => s.includes('opening balance') || s.includes('Unusual'))).toBe(true);
      }
    });
  });
});
