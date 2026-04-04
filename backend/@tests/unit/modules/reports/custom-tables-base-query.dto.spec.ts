import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CustomTablesBaseQueryDto } from '@/modules/reports/dto/custom-tables-base-query.dto';

describe('CustomTablesBaseQueryDto', () => {
  it('transforms and validates shared custom table filters', async () => {
    const dto = plainToInstance(CustomTablesBaseQueryDto, {
      days: '30',
      tableIds: ['550e8400-e29b-41d4-a716-446655440000'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.days).toBe(30);
    expect(dto.tableIds).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
  });
});
