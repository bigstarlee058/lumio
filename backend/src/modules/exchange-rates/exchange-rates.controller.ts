import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BulkConvertDto } from './dto/convert.dto';
import { ExchangeRatesService } from './exchange-rates.service';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  async getRate(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    const rateDate = date ? new Date(date) : undefined;
    const rate = await this.exchangeRatesService.getRate(from, to, rateDate);
    return { from: from.toUpperCase(), to: to.toUpperCase(), rate, date: date ?? null };
  }

  @Post('convert')
  async bulkConvert(@Body() dto: BulkConvertDto) {
    const items = dto.items.map(item => ({
      amount: item.amount,
      currency: item.currency,
      date: item.date ? new Date(item.date) : undefined,
    }));
    const results = await this.exchangeRatesService.bulkConvert(items, dto.targetCurrency);
    return { targetCurrency: dto.targetCurrency, results };
  }
}
