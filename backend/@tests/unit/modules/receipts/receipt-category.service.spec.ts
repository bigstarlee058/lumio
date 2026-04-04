import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, Receipt, Transaction } from '@/entities';
import { ReceiptCategoryService } from '@/modules/receipts/services/receipt-category.service';

function createCategoryQueryBuilder(result: Category[]) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

function createTransactionQueryBuilder(result: Transaction[]) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

describe('ReceiptCategoryService', () => {
  let service: ReceiptCategoryService;
  let categoryRepository: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let transactionRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    categoryRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    transactionRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptCategoryService,
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepository },
      ],
    }).compile();

    service = module.get(ReceiptCategoryService);
  });

  it('loads categories directly for regular receipts', async () => {
    const categories = [{ id: 'food', name: 'food', isEnabled: true }] as Category[];

    categoryRepository.find.mockResolvedValue(categories);
    transactionRepository.createQueryBuilder.mockReturnValue(createTransactionQueryBuilder([]));

    const result = await service.suggestCategory({
      workspaceId: 'workspace-1',
      parsedData: { vendor: 'coffee point' },
    } as Receipt);

    expect(categoryRepository.find).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace-1', isEnabled: true },
    });
    expect(categoryRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(result?.id).toBe('food');
  });

  it('loads categories via statement ownership for gmail receipts', async () => {
    const categories = [{ id: 'food', name: 'food', isEnabled: true }] as Category[];
    const categoryQueryBuilder = createCategoryQueryBuilder(categories);

    categoryRepository.createQueryBuilder.mockReturnValue(categoryQueryBuilder);
    transactionRepository.createQueryBuilder.mockReturnValue(createTransactionQueryBuilder([]));

    const result = await service.suggestCategory(
      {
        workspaceId: 'workspace-1',
        parsedData: { vendor: 'coffee point' },
      } as Receipt,
      'via-statement',
    );

    expect(categoryRepository.find).not.toHaveBeenCalled();
    expect(categoryRepository.createQueryBuilder).toHaveBeenCalledWith('category');
    expect(categoryQueryBuilder.leftJoin).toHaveBeenCalledWith('category.user', 'user');
    expect(categoryQueryBuilder.where).toHaveBeenCalledWith('user.workspace_id = :workspaceId', {
      workspaceId: 'workspace-1',
    });
    expect(result?.id).toBe('food');
  });
});
