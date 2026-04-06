import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRate } from '../../entities/exchange-rate.entity';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesSyncService } from './exchange-rates-sync.service';
import { ExchangeRatesService } from './exchange-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, ExchangeRatesSyncService],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
