import { Module } from '@nestjs/common';
import { CacheMetricsService } from './cache-metrics.service';
import { DbMetricsCollector } from './db-metrics.collector';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  providers: [MetricsService, DbMetricsCollector, CacheMetricsService],
  controllers: [MetricsController],
  exports: [MetricsService, CacheMetricsService],
})
export class ObservabilityModule {}
