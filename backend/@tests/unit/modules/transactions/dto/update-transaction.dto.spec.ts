import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TransactionType } from '@/entities/transaction.entity';
import { UpdateTransactionDto } from '@/modules/transactions/dto/update-transaction.dto';

describe('UpdateTransactionDto', () => {
  it('passes validation when all fields are absent (full optional)', async () => {
    const dto = plainToInstance(UpdateTransactionDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with all valid fields', async () => {
    const dto = plainToInstance(UpdateTransactionDto, {
      transactionDate: '2026-01-15',
      documentNumber: 'DOC-001',
      counterpartyName: 'Acme Corp',
      counterpartyBin: '123456789012',
      counterpartyAccount: 'KZ123456789',
      counterpartyBank: 'Halyk Bank',
      debit: 1000.50,
      credit: 0,
      amountForeign: 25.00,
      exchangeRate: 450.5,
      amount: 1000.50,
      currency: 'KZT',
      paymentPurpose: 'Services rendered',
      categoryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      branchId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      walletId: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
      article: 'expense',
      activityType: 'purchase',
      transactionType: TransactionType.EXPENSE,
      comments: 'Approved by finance',
      isVerified: true,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('transactionDate', () => {
    it('passes validation for ISO date string', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { transactionDate: '2026-01-15' });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'transactionDate')).toHaveLength(0);
    });

    it('fails validation for non-date string', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { transactionDate: 'not-a-date' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'transactionDate')).toBe(true);
    });
  });

  describe('financial amount fields', () => {
    it('passes validation with numeric debit', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { debit: 500.75 });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'debit')).toHaveLength(0);
    });

    it('fails validation when debit is a string that is not a number', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { debit: 'five hundred' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'debit')).toBe(true);
    });

    it('passes validation with zero debit', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { debit: 0 });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'debit')).toHaveLength(0);
    });
  });

  describe('UUID fields (injection prevention)', () => {
    it('passes validation with valid UUID categoryId', async () => {
      const dto = plainToInstance(UpdateTransactionDto, {
        categoryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'categoryId')).toHaveLength(0);
    });

    it('fails validation for non-UUID categoryId', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { categoryId: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'categoryId')).toBe(true);
    });

    it('fails validation for SQL injection attempt in categoryId', async () => {
      const dto = plainToInstance(UpdateTransactionDto, {
        categoryId: "'; DROP TABLE transactions; --",
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'categoryId')).toBe(true);
    });

    it('fails validation for non-UUID branchId', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { branchId: '12345' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'branchId')).toBe(true);
    });

    it('fails validation for non-UUID walletId', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { walletId: '../../../etc/passwd' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'walletId')).toBe(true);
    });
  });

  describe('transactionType enum', () => {
    it('passes validation with valid TransactionType enum value', async () => {
      const dto = plainToInstance(UpdateTransactionDto, {
        transactionType: TransactionType.EXPENSE,
      });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'transactionType')).toHaveLength(0);
    });

    it('fails validation with arbitrary string for transactionType', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { transactionType: 'malicious_type' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'transactionType')).toBe(true);
    });
  });

  describe('isVerified boolean field', () => {
    it('passes validation with boolean true', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { isVerified: true });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'isVerified')).toHaveLength(0);
    });

    it('fails validation with string "true" (not boolean)', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { isVerified: 'true' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'isVerified')).toBe(true);
    });
  });
});
