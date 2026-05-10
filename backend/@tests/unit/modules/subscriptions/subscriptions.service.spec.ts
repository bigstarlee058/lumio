import { SubscriptionFrequency, SubscriptionStatus } from '@/entities/subscription.entity';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';

const createRepoMock = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('SubscriptionsService', () => {
  const subscriptionRepository = createRepoMock();
  const notificationsService = {
    createForWorkspaceMembers: jest.fn(),
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SubscriptionsService(
      subscriptionRepository as any,
      notificationsService as any,
    );
  });

  describe('getSummary', () => {
    it('normalizes active subscription costs to monthly and sums them', async () => {
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 100,
          currency: 'USD',
          frequency: SubscriptionFrequency.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);

      const result = await service.getSummary('workspace-1');

      expect(result).toEqual({
        totalMonthlyCost: 100,
        activeCount: 1,
        upcomingCount: 0,
      });
    });

    it('normalizes annual subscriptions to monthly cost', async () => {
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 1200,
          currency: 'KZT',
          frequency: SubscriptionFrequency.ANNUAL,
          status: SubscriptionStatus.ACTIVE,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);

      const result = await service.getSummary('workspace-1');

      expect(result.totalMonthlyCost).toBe(100);
    });
  });
});
