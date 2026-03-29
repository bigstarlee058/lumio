import { ClassificationController } from '@/modules/classification/classification.controller';

function createRepoMock() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async value => value),
  };
}

describe('ClassificationController', () => {
  it('scopes single transaction classification by workspaceId', async () => {
    const transactionRepository = createRepoMock();
    const classificationService = {
      classifyTransaction: jest.fn(async () => ({ categoryId: 'cat-1' })),
      learnFromCorrection: jest.fn(async () => undefined),
    };
    const transaction = { id: 'tx-1', workspaceId: 'ws-1' };
    transactionRepository.findOne.mockResolvedValue(transaction);

    const controller = new ClassificationController(
      classificationService as any,
      transactionRepository as any,
    );

    await controller.classifyTransaction('tx-1', { id: 'u1' } as any, 'ws-1');

    expect(transactionRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'tx-1', workspaceId: 'ws-1' },
    });
  });

  it('scopes bulk classification and learning by workspaceId', async () => {
    const transactionRepository = createRepoMock();
    const classificationService = {
      classifyTransaction: jest.fn(async () => ({ categoryId: 'cat-1' })),
      learnFromCorrection: jest.fn(async () => undefined),
    };
    transactionRepository.findOne.mockResolvedValue({ id: 'tx-1', workspaceId: 'ws-1' });
    const controller = new ClassificationController(
      classificationService as any,
      transactionRepository as any,
    );

    await controller.classifyBulk({ transactionIds: ['tx-1'] }, { id: 'u1' } as any, 'ws-1');
    await controller.recordLearning(
      { transactionId: 'tx-1', categoryId: 'cat-1' },
      { id: 'u1' } as any,
      'ws-1',
    );

    expect(transactionRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 'tx-1', workspaceId: 'ws-1' },
    });
    expect(transactionRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { id: 'tx-1', workspaceId: 'ws-1' },
    });
  });
});
