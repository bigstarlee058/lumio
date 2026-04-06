import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { ExchangeRate } from '../../entities/exchange-rate.entity';

export interface ConvertResult {
  converted: number;
  rate: number;
  source: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private readonly apiKey: string | undefined;
  private readonly apiBaseUrl = 'https://v6.exchangerate-api.com/v6';

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
  }

  async getRate(from: string, to: string, date?: Date): Promise<number> {
    const normalizedFrom = from.toUpperCase().trim();
    const normalizedTo = to.toUpperCase().trim();

    if (normalizedFrom === normalizedTo) {
      return 1;
    }

    const rateDate = this.toDateOnly(date ?? new Date());
    const cacheKey = `exchange_rate:${normalizedFrom}:${normalizedTo}:${rateDate}`;

    // 1. Redis cache
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Database
    const dbRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: normalizedFrom, targetCurrency: normalizedTo, rateDate: new Date(rateDate) },
    });
    if (dbRate) {
      const ttl = this.isToday(rateDate) ? 4 * 3600 : 0; // 4h for today, permanent for historical
      await this.cacheManager.set(cacheKey, Number(dbRate.rate), ttl);
      return Number(dbRate.rate);
    }

    // 3. Try to compute via USD base (e.g., EUR→KZT = (1/USD→EUR) * USD→KZT)
    if (normalizedFrom !== 'USD' && normalizedTo !== 'USD') {
      const rateFromUsd = await this.getRateFromApi('USD', normalizedFrom, rateDate);
      const rateToUsd = await this.getRateFromApi('USD', normalizedTo, rateDate);
      if (rateFromUsd && rateToUsd) {
        const crossRate = rateToUsd / rateFromUsd;
        await this.saveRate(normalizedFrom, normalizedTo, crossRate, rateDate, 'computed');
        await this.cacheManager.set(cacheKey, crossRate, this.isToday(rateDate) ? 4 * 3600 : 0);
        return crossRate;
      }
    }

    // 4. External API (direct)
    const apiRate = await this.getRateFromApi(normalizedFrom, normalizedTo, rateDate);
    if (apiRate) {
      await this.saveRate(normalizedFrom, normalizedTo, apiRate, rateDate, 'exchangerate-api');
      await this.cacheManager.set(cacheKey, apiRate, this.isToday(rateDate) ? 4 * 3600 : 0);
      return apiRate;
    }

    // 5. Fallback: most recent rate from DB
    const latestRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: normalizedFrom, targetCurrency: normalizedTo },
      order: { rateDate: 'DESC' },
    });
    if (latestRate) {
      this.logger.warn(
        `Using stale rate ${normalizedFrom}→${normalizedTo} from ${latestRate.rateDate}`,
      );
      return Number(latestRate.rate);
    }

    this.logger.warn(`No rate found for ${normalizedFrom}→${normalizedTo}, returning 1`);
    return 1;
  }

  async convert(
    amount: number,
    from: string,
    to: string,
    date?: Date,
  ): Promise<ConvertResult> {
    const rate = await this.getRate(from, to, date);
    return { converted: amount * rate, rate, source: 'exchange-rates-service' };
  }

  async bulkConvert(
    items: Array<{ amount: number; currency: string; date?: Date }>,
    targetCurrency: string,
  ): Promise<ConvertResult[]> {
    return Promise.all(
      items.map(item => this.convert(item.amount, item.currency, targetCurrency, item.date)),
    );
  }

  async fetchAndCacheRates(baseCurrency = 'USD'): Promise<void> {
    if (!this.apiKey) {
      this.logger.debug('EXCHANGE_RATE_API_KEY not set, skipping rate fetch');
      return;
    }

    try {
      const url = `${this.apiBaseUrl}/${this.apiKey}/latest/${baseCurrency.toUpperCase()}`;
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Exchange rate API returned ${response.status}`);
        return;
      }

      const data = (await response.json()) as {
        result: string;
        conversion_rates: Record<string, number>;
      };

      if (data.result !== 'success') {
        this.logger.warn('Exchange rate API response was not successful');
        return;
      }

      const today = this.toDateOnly(new Date());
      const base = baseCurrency.toUpperCase();

      for (const [target, rate] of Object.entries(data.conversion_rates)) {
        await this.saveRate(base, target, rate, today, 'exchangerate-api');
      }

      this.logger.log(
        `Fetched and cached ${Object.keys(data.conversion_rates).length} rates for ${base}`,
      );
    } catch (error) {
      this.logger.error('Failed to fetch exchange rates', error);
    }
  }

  private async getRateFromApi(
    from: string,
    to: string,
    rateDate: string,
  ): Promise<number | null> {
    if (!this.apiKey) return null;

    try {
      // Use latest rates endpoint (historical endpoint requires higher tier)
      const url = `${this.apiBaseUrl}/${this.apiKey}/latest/${from}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = (await response.json()) as {
        result: string;
        conversion_rates: Record<string, number>;
      };

      if (data.result !== 'success' || !data.conversion_rates[to]) return null;

      const rate = data.conversion_rates[to];
      // Cache all rates from this response to avoid repeated API calls
      for (const [target, targetRate] of Object.entries(data.conversion_rates)) {
        await this.saveRate(from, target, targetRate, rateDate, 'exchangerate-api').catch(() => {});
      }

      return rate;
    } catch {
      return null;
    }
  }

  private async saveRate(
    from: string,
    to: string,
    rate: number,
    rateDate: string | Date,
    source: string,
  ): Promise<void> {
    const dateStr = typeof rateDate === 'string' ? rateDate : this.toDateOnly(rateDate);
    await this.exchangeRateRepository
      .createQueryBuilder()
      .insert()
      .into(ExchangeRate)
      .values({
        baseCurrency: from,
        targetCurrency: to,
        rate,
        rateDate: new Date(dateStr),
        source,
      })
      .orIgnore()
      .execute();
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isToday(dateStr: string): boolean {
    return dateStr === this.toDateOnly(new Date());
  }
}
