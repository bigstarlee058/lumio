import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MetricsService } from './metrics.service';

@Injectable()
export class DbMetricsCollector {
  constructor(
    private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
  ) {}

  @Interval(15_000)
  collectPoolMetrics(): void {
    const pool = (this.dataSource.driver as any).master;
    if (!pool) return;

    this.metricsService.dbPoolActiveConnections.set(
      pool.totalCount - pool.idleCount,
    );
    this.metricsService.dbPoolIdleConnections.set(pool.idleCount);
    this.metricsService.dbPoolWaitingQueries.set(pool.waitingCount);
  }
}
