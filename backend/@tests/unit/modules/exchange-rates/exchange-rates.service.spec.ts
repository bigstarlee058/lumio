import { ExchangeRatesService } from '@/modules/exchange-rates/exchange-rates.service';

function createRepoMock() {
  return {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    }),
  } as any;
}

function createCacheMock() {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn(),
  } as any;
}

function createConfigMock(apiKey?: string) {
  return {
    get: jest.fn().mockReturnValue(apiKey),
  } as any;
}

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let repo: ReturnType<typeof createRepoMock>;
  let cache: ReturnType<typeof createCacheMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    repo = createRepoMock();
    cache = createCacheMock();
    service = new ExchangeRatesService(repo, cache, createConfigMock());
  });

  // ─── getRate ───────────────────────────────────────────────

  describe('getRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await service.getRate('USD', 'USD');
      expect(rate).toBe(1);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('normalizes currency codes to uppercase', async () => {
      repo.findOne.mockResolvedValue({ rate: 3.5 });
      const rate = await service.getRate('  usd ', ' ils');
      expect(rate).toBe(3.5);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            baseCurrency: 'USD',
            targetCurrency: 'ILS',
          }),
        }),
      );
    });

    it('returns cached rate when available', async () => {
      cache.get.mockResolvedValue(3.67);
      const rate = await service.getRate('USD', 'ILS');
      expect(rate).toBe(3.67);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('looks up rate from database when not cached', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.65' });
      const rate = await service.getRate('USD', 'ILS');
      expect(rate).toBe(3.65);
      expect(cache.set).toHaveBeenCalled();
    });

    it('uses inverse database rate when only the reverse pair exists', async () => {
      repo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ rate: '500', rateDate: '2026-03-17' });

      const rate = await service.getRate('KZT', 'USD');

      expect(rate).toBe(0.002);
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('exchange_rate:KZT:USD'),
        0.002,
        expect.any(Number),
      );
    });

    it('returns stale DB rate as last resort before fallback to 1', async () => {
      // First findOne (exact date) returns null
      // Second findOne (reverse exact date) returns null
      // Third findOne (latest by date) returns a stale rate
      repo.findOne
        .mockResolvedValueOnce(null) // exact date lookup
        .mockResolvedValueOnce(null) // reverse exact date lookup
        .mockResolvedValueOnce({ rate: '3.50', rateDate: '2025-01-01' }); // latest rate

      const rate = await service.getRate('USD', 'ILS');
      expect(rate).toBe(3.50);
    });

    it('returns 1 when no rate is found anywhere (fallback)', async () => {
      repo.findOne.mockResolvedValue(null);
      const rate = await service.getRate('USD', 'KZT');
      expect(rate).toBe(1);
    });

    it('fetches the current rate from the public API when no API key is configured', async () => {
      repo.findOne.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: '2026-04-29', usd: { kzt: 512.34 } }),
      }) as any;

      const rate = await service.getRate('USD', 'KZT');

      expect(rate).toBe(512.34);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('@fawazahmed0/currency-api@latest'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/currencies/usd.json'));
      expect(repo.createQueryBuilder).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('exchange_rate:USD:KZT'),
        512.34,
        expect.any(Number),
      );
    });

    it('uses the public API fallback URL when the CDN request fails', async () => {
      repo.findOne.mockResolvedValue(null);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ date: '2026-04-29', usd: { kzt: 511.22 } }),
        }) as any;

      const rate = await service.getRate('USD', 'KZT');

      expect(rate).toBe(511.22);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('latest.currency-api.pages.dev'),
      );
    });

    it('uses specific date when provided', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.60' });
      const date = new Date('2025-06-15');
      await service.getRate('USD', 'ILS', date);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rateDate: new Date('2025-06-15'),
          }),
        }),
      );
    });

    it('normalizes NIS to ILS for exchange-rate lookups', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.72' });

      const rate = await service.getRate('USD', 'NIS');

      expect(rate).toBe(3.72);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            baseCurrency: 'USD',
            targetCurrency: 'ILS',
          }),
        }),
      );
    });
  });

  // ─── convert ───────────────────────────────────────────────

  describe('convert', () => {
    it('multiplies amount by rate', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.67' });
      const result = await service.convert(100, 'USD', 'ILS');
      expect(result.converted).toBeCloseTo(367, 2);
      expect(result.rate).toBe(3.67);
      expect(result.source).toBe('exchange-rates-service');
    });

    it('returns same amount for same currency', async () => {
      const result = await service.convert(250, 'EUR', 'EUR');
      expect(result.converted).toBe(250);
      expect(result.rate).toBe(1);
    });

    it('handles zero amount', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.67' });
      const result = await service.convert(0, 'USD', 'ILS');
      expect(result.converted).toBe(0);
    });

    it('handles negative amounts', async () => {
      repo.findOne.mockResolvedValue({ rate: '3.67' });
      const result = await service.convert(-50, 'USD', 'ILS');
      expect(result.converted).toBeCloseTo(-183.5, 1);
    });
  });

  // ─── bulkConvert ───────────────────────────────────────────

  describe('bulkConvert', () => {
    it('converts multiple items to target currency', async () => {
      // USD->ILS first, EUR->ILS second
      repo.findOne
        .mockResolvedValueOnce({ rate: '3.67' }) // USD->ILS
        .mockResolvedValueOnce(null) // EUR->ILS exact
        .mockResolvedValueOnce(null) // ILS->EUR exact
        .mockResolvedValueOnce({ rate: '4.05' }); // EUR->ILS latest

      const results = await service.bulkConvert(
        [
          { amount: 100, currency: 'USD' },
          { amount: 200, currency: 'EUR' },
        ],
        'ILS',
      );

      expect(results).toHaveLength(2);
      expect(results[0].converted).toBeCloseTo(367, 0);
      expect(results[1].converted).toBeCloseTo(810, 0);
    });

    it('handles empty items array', async () => {
      const results = await service.bulkConvert([], 'USD');
      expect(results).toEqual([]);
    });
  });

  // ─── fetchAndCacheRates ────────────────────────────────────

  describe('fetchAndCacheRates', () => {
    it('does nothing when API key is not set', async () => {
      // service created without API key (default in beforeEach)
      await service.fetchAndCacheRates('USD');
      // Should not throw, should not call repo
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('fetches and saves rates from API', async () => {
      const serviceWithKey = new ExchangeRatesService(
        repo,
        cache,
        createConfigMock('test-api-key'),
      );

      const mockRates = { USD: 1, EUR: 0.85, ILS: 3.67 };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'success', conversion_rates: mockRates }),
      }) as any;

      await serviceWithKey.fetchAndCacheRates('USD');

      // Should insert one rate per conversion_rates entry
      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('handles API error gracefully', async () => {
      const serviceWithKey = new ExchangeRatesService(
        repo,
        cache,
        createConfigMock('test-api-key'),
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      // Should not throw
      await expect(serviceWithKey.fetchAndCacheRates('USD')).resolves.toBeUndefined();
    });

    it('handles unsuccessful API result', async () => {
      const serviceWithKey = new ExchangeRatesService(
        repo,
        cache,
        createConfigMock('test-api-key'),
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'error' }),
      }) as any;

      await serviceWithKey.fetchAndCacheRates('USD');
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('handles network failure gracefully', async () => {
      const serviceWithKey = new ExchangeRatesService(
        repo,
        cache,
        createConfigMock('test-api-key'),
      );

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;
      await expect(serviceWithKey.fetchAndCacheRates()).resolves.toBeUndefined();
    });
  });
});
