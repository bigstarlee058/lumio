import { AuditAction, EntityType, Severity } from '../../../src/entities/audit-event.entity';
import { CustomTableColumnType } from '../../../src/entities/custom-table-column.entity';
import { CustomTableSource } from '../../../src/entities/custom-table.entity';
import { TransactionType } from '../../../src/entities/transaction.entity';
import { CustomTablesService } from '../../../src/modules/custom-tables/custom-tables.service';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((value?: unknown) => value),
  delete: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('CustomTablesService.createFromStatements', () => {
  it('creates a custom table from a single statement without throwing', async () => {
    const customTableRepository = createRepositoryMock();
    const categoryRepository = createRepositoryMock();
    const customTableColumnRepository = createRepositoryMock();
    const customTableRowRepository = createRepositoryMock();
    const customTableColumnStyleRepository = createRepositoryMock();
    const customTableCellStyleRepository = createRepositoryMock();
    const dataEntryRepository = createRepositoryMock();
    const dataEntryCustomFieldRepository = createRepositoryMock();
    const statementRepository = createRepositoryMock();
    const transactionRepository = createRepositoryMock();
    const userRepository = createRepositoryMock();
    const workspaceMemberRepository = createRepositoryMock();
    const auditService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
      createBatchEvents: jest.fn().mockResolvedValue(undefined),
    };

    const statementQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'statement-1',
          fileName: 'receipt-scan.pdf',
          createdAt: new Date('2026-03-29T00:00:00.000Z'),
        },
      ]),
    };

    statementRepository.createQueryBuilder.mockReturnValue(statementQueryBuilder);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    transactionRepository.find.mockResolvedValue([
      {
        id: 'tx-1',
        statementId: 'statement-1',
        transactionDate: new Date('2026-03-29T00:00:00.000Z'),
        counterpartyName: 'Magnum',
        paymentPurpose: 'Magnum',
        debit: 500,
        credit: null,
        currency: 'KZT',
        transactionType: TransactionType.EXPENSE,
        createdAt: new Date('2026-03-29T00:00:00.000Z'),
      },
    ]);

    customTableRepository.save.mockResolvedValue({
      id: 'table-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      name: 'Receipt export',
      description: 'Exported from receipt scan',
      source: CustomTableSource.MANUAL,
      categoryId: null,
    });

    customTableColumnRepository.save.mockImplementation(async values => values);
    customTableRowRepository.save.mockImplementation(async values => values);

    const service = new CustomTablesService(
      customTableRepository as never,
      categoryRepository as never,
      customTableColumnRepository as never,
      customTableRowRepository as never,
      customTableColumnStyleRepository as never,
      customTableCellStyleRepository as never,
      dataEntryRepository as never,
      dataEntryCustomFieldRepository as never,
      statementRepository as never,
      transactionRepository as never,
      userRepository as never,
      workspaceMemberRepository as never,
      auditService as never,
    );

    const result = await service.createFromStatements('user-1', 'workspace-1', {
      statementIds: ['statement-1'],
      name: 'Receipt export',
      description: 'Exported from receipt scan',
    });

    expect(result).toEqual({
      tableId: 'table-1',
      columnsCreated: 7,
      rowsCreated: 1,
    });
    expect(customTableRepository.save).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      name: 'Receipt export',
      description: 'Exported from receipt scan',
      source: CustomTableSource.MANUAL,
      categoryId: null,
    });
    expect(customTableColumnRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Дата', type: CustomTableColumnType.DATE, position: 0 }),
      expect.objectContaining({ title: 'Контрагент', type: CustomTableColumnType.TEXT, position: 1 }),
      expect.objectContaining({ title: 'Назначение', type: CustomTableColumnType.TEXT, position: 2 }),
      expect.objectContaining({ title: 'Дебет', type: CustomTableColumnType.NUMBER, position: 3 }),
      expect.objectContaining({ title: 'Кредит', type: CustomTableColumnType.NUMBER, position: 4 }),
      expect.objectContaining({ title: 'Валюта', type: CustomTableColumnType.TEXT, position: 5 }),
      expect.objectContaining({ title: 'Тип', type: CustomTableColumnType.TEXT, position: 6 }),
    ]);
    expect(customTableRowRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tableId: 'table-1',
        rowNumber: 1,
        data: expect.any(Object),
      }),
    ]);
    const savedRows = customTableRowRepository.save.mock.calls[0]?.[0] as Array<{
      data: Record<string, unknown>;
    }>;
    expect(Object.values(savedRows[0]?.data || {})).toEqual(
      expect.arrayContaining(['2026-03-29', 'Magnum', 500, null, 'KZT', 'Списание']),
    );
    expect(auditService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        actorId: 'user-1',
        entityType: EntityType.CUSTOM_TABLE,
        action: AuditAction.CREATE,
        severity: Severity.INFO,
      }),
    );
    expect(auditService.createBatchEvents).toHaveBeenCalled();
  });
});
