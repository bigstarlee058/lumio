import { BudgetPeriodType } from '@/entities/budget.entity';
import { BudgetsService } from '@/modules/budgets/budgets.service';

const createRepoMock = () => ({
  create: jest.fn((data: unknown) => data),
  save: jest.fn(async (data: unknown) => data),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (rows: Array<{ currency: string | null; total: string }>) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(rows),
});

describe('BudgetsService', () => {
  const budgetRepository = createRepoMock();
  const transactionRepository = createRepoMock();
  const workspaceRepository = createRepoMock();
  const notificationsService = {
    createForWorkspaceMembers: jest.fn(),
  };
  const exchangeRatesService = {
    getRate: jest.fn(),
  };

  let service: BudgetsService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
    service = new BudgetsService(
      budgetRepository as any,
      transactionRepository as any,
      workspaceRepository as any,
      notificationsService as any,
      exchangeRatesService as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns limit and spent amounts converted to the workspace currency', async () => {
    workspaceRepository.findOne.mockResolvedValue({ currency: 'KZT' });
    budgetRepository.find.mockResolvedValue([
      {
        id: 'budget-1',
        workspaceId: 'workspace-1',
        categoryId: 'category-1',
        name: 'Cloud tools',
        limitAmount: 100,
        manualSpentAmount: 20,
        currency: 'USD',
        periodType: BudgetPeriodType.MONTHLY,
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);
    transactionRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock([{ currency: 'EUR', total: '10' }]),
    );
    exchangeRatesService.getRate.mockImplementation(async (from: string, to: string) => {
      if (from === 'USD' && to === 'KZT') {
        return 500;
      }
      if (from === 'EUR' && to === 'KZT') {
        return 550;
      }
      return 1;
    });

    const result = await service.findAll('workspace-1');

    expect(result[0]).toEqual(
      expect.objectContaining({
        limitAmount: 100,
        limitAmountWorkspace: 50000,
        manualSpentAmount: 20,
        spentAmount: 15500,
        percentUsed: 31,
        currency: 'USD',
        workspaceCurrency: 'KZT',
      }),
    );
    expect(exchangeRatesService.getRate).toHaveBeenCalledWith('USD', 'KZT');
    expect(exchangeRatesService.getRate).toHaveBeenCalledWith('EUR', 'KZT');
  });

  it('creates a budget with manual spent defaulting to zero', async () => {
    budgetRepository.findOne.mockResolvedValue(null);

    await service.create('workspace-1', 'user-1', {
      name: 'Rent',
      categoryId: 'category-1',
      limitAmount: 10000,
      currency: 'KZT',
      periodType: BudgetPeriodType.MONTHLY,
    });

    expect(budgetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        manualSpentAmount: 0,
      }),
    );
  });

  it('accepts category and period fields on update when they are unchanged', async () => {
    const budget = {
      id: 'budget-1',
      workspaceId: 'workspace-1',
      categoryId: 'category-1',
      name: 'Rent',
      limitAmount: 10000,
      manualSpentAmount: 0,
      currency: 'KZT',
      periodType: BudgetPeriodType.MONTHLY,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    };
    budgetRepository.findOne.mockResolvedValue(budget);

    await service.update('budget-1', 'workspace-1', {
      name: 'Rent',
      categoryId: 'category-1',
      limitAmount: 10000,
      manualSpentAmount: 2500,
      currency: 'KZT',
      periodType: BudgetPeriodType.MONTHLY,
    });

    expect(budgetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        manualSpentAmount: 2500,
        categoryId: 'category-1',
        periodType: BudgetPeriodType.MONTHLY,
      }),
    );
  });
});
