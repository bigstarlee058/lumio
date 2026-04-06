import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExchangeRatesService } from './exchange-rates.service';

@Injectable()
export class ExchangeRatesSyncService {
  private readonly logger = new Logger(ExchangeRatesSyncService.name);

  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Cron('0 */4 * * *')
  async syncRates(): Promise<void> {
    this.logger.log('Syncing exchange rates...');
    // Fetch rates for the most relevant base currencies
    for (const base of ['USD', 'EUR', 'RUB']) {
      await this.exchangeRatesService.fetchAndCacheRates(base);
    }
    this.logger.log('Exchange rate sync complete');
  }
}
