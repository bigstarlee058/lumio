import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePayableDto } from '@/modules/payables/dto/create-payable.dto';
import { FilterPayablesDto } from '@/modules/payables/dto/filter-payables.dto';
import { MarkPayablePaidDto } from '@/modules/payables/dto/mark-payable-paid.dto';
import { UpdatePayableDto } from '@/modules/payables/dto/update-payable.dto';

describe('Payables DTO validation', () => {
  it('rejects invalid due dates and non-uuid linked ids for create/update/filter/mark-paid', async () => {
    const createDto = plainToInstance(CreatePayableDto, {
      vendor: 'Acme',
      amount: 10,
      dueDate: 'not-a-date',
      linkedTransactionId: 'bad-id',
      statementId: 'also-bad',
    });
    const updateDto = plainToInstance(UpdatePayableDto, {
      dueDate: 'still-not-a-date',
      linkedTransactionId: 'bad-id',
      statementId: 'also-bad',
    });
    const filterDto = plainToInstance(FilterPayablesDto, {
      dueDateFrom: 'bad-date',
      dueDateTo: 'bad-date',
    });
    const markPaidDto = plainToInstance(MarkPayablePaidDto, {
      linkedTransactionId: 'bad-id',
    });

    expect(await validate(createDto as object)).not.toHaveLength(0);
    expect(await validate(updateDto as object)).not.toHaveLength(0);
    expect(await validate(filterDto as object)).not.toHaveLength(0);
    expect(await validate(markPaidDto as object)).not.toHaveLength(0);
  });
});
