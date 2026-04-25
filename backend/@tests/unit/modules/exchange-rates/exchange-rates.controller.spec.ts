import { ExchangeRatesController } from '@/modules/exchange-rates/exchange-rates.controller';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  const exchangeRatesService = {
    getRate: jest.fn(),
    bulkConvert: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExchangeRatesController(exchangeRatesService);
  });

  describe('getRate', () => {
    it('returns rate for a currency pair', async () => {
      exchangeRatesService.getRate.mockResolvedValue(3.67);
      const result = await controller.getRate('USD', 'ILS');

      expect(result).toEqual({ from: 'USD', to: 'ILS', rate: 3.67, date: null });
      expect(exchangeRatesService.getRate).toHaveBeenCalledWith('USD', 'ILS', undefined);
    });

    it('passes date when provided', async () => {
      exchangeRatesService.getRate.mockResolvedValue(3.60);
      const result = await controller.getRate('USD', 'ILS', '2025-06-15');

      expect(result.date).toBe('2025-06-15');
      expect(exchangeRatesService.getRate).toHaveBeenCalledWith(
        'USD',
        'ILS',
        new Date('2025-06-15'),
      );
    });
  });

  describe('bulkConvert', () => {
    it('delegates to service with parsed dates', async () => {
      const mockResults = [
        { converted: 367, rate: 3.67, source: 'exchange-rates-service' },
      ];
      exchangeRatesService.bulkConvert.mockResolvedValue(mockResults);

      const dto = {
        items: [{ amount: 100, currency: 'USD', date: '2025-06-15' }],
        targetCurrency: 'ILS',
      };

      const result = await controller.bulkConvert(dto);

      expect(result).toEqual({ targetCurrency: 'ILS', results: mockResults });
      expect(exchangeRatesService.bulkConvert).toHaveBeenCalledWith(
        [{ amount: 100, currency: 'USD', date: new Date('2025-06-15') }],
        'ILS',
      );
    });

    it('handles items without date', async () => {
      exchangeRatesService.bulkConvert.mockResolvedValue([]);
      const dto = {
        items: [{ amount: 50, currency: 'EUR' }],
        targetCurrency: 'USD',
      };

      await controller.bulkConvert(dto);

      expect(exchangeRatesService.bulkConvert).toHaveBeenCalledWith(
        [{ amount: 50, currency: 'EUR', date: undefined }],
        'USD',
      );
    });
  });
});
