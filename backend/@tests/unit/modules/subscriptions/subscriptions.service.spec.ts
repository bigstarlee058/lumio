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
  const workspaceRepository = createRepoMock();
  const notificationsService = {
    createForWorkspaceMembers: jest.fn(),
  };
  const exchangeRatesService = {
    getRate: jest.fn(),
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SubscriptionsService(
      subscriptionRepository as any,
      workspaceRepository as any,
      notificationsService as any,
      exchangeRatesService as any,
    );
  });

  describe('getSummary', () => {
    it('converts active subscription costs to workspace currency before summing monthly cost', async () => {
      workspaceRepository.findOne.mockResolvedValue({ currency: 'KZT' });
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 100,
          currency: 'USD',
          frequency: SubscriptionFrequency.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);
      exchangeRatesService.getRate.mockResolvedValue(500);

      const result = await service.getSummary('workspace-1');

      expect(result).toEqual({
        totalMonthlyCost: 50000,
        currency: 'KZT',
        activeCount: 1,
        upcomingCount: 0,
      });
      expect(exchangeRatesService.getRate).toHaveBeenCalledWith('USD', 'KZT');
    });

    it('falls back to KZT when workspace currency is not configured', async () => {
      workspaceRepository.findOne.mockResolvedValue({ currency: null });
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
      expect(result.currency).toBe('KZT');
      expect(exchangeRatesService.getRate).not.toHaveBeenCalled();
    });
  });
});
