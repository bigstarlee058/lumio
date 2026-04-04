import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SpendOverTimeQueryDto } from '@/modules/reports/dto/spend-over-time-query.dto';
import { TopCategoriesQueryDto } from '@/modules/reports/dto/top-categories-query.dto';

describe('Report query DTOs', () => {
  it('transforms shared report filters for spend over time queries', async () => {
    const dto = plainToInstance(SpendOverTimeQueryDto, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      type: 'expense',
      groupBy: 'month',
      statuses: 'completed,error',
      keywords: 'kaspi',
      amountMin: '10.5',
      amountMax: '100.25',
      currencies: 'KZT,USD',
      approved: 'true',
      billable: 'false',
      exported: 'true',
      paid: 'false',
      bankName: 'Kaspi',
      counterparties: 'Acme',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.amountMin).toBe(10.5);
    expect(dto.amountMax).toBe(100.25);
    expect(dto.approved).toBe(true);
    expect(dto.billable).toBe(false);
    expect(dto.exported).toBe(true);
    expect(dto.paid).toBe(false);
  });

  it('transforms shared report filters for top categories queries', async () => {
    const dto = plainToInstance(TopCategoriesQueryDto, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      type: 'all',
      limit: '25',
      bankName: 'Kaspi',
      counterparties: 'Acme',
      statuses: 'completed,error',
      keywords: 'travel',
      amountMin: '5',
      amountMax: '500',
      currencies: 'EUR,USD',
      approved: 'false',
      billable: 'true',
      has: 'transactions',
      groupBy: 'merchant',
      exported: 'false',
      paid: 'true',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(25);
    expect(dto.amountMin).toBe(5);
    expect(dto.amountMax).toBe(500);
    expect(dto.approved).toBe(false);
    expect(dto.billable).toBe(true);
    expect(dto.exported).toBe(false);
    expect(dto.paid).toBe(true);
  });
});
