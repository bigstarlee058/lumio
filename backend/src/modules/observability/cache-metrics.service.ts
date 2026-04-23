import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { MetricsService } from './metrics.service';

@Injectable()
export class CacheMetricsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly metricsService: MetricsService,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    const end = this.metricsService.redisCommandDurationSeconds.startTimer({
      command: 'get',
    });
    try {
      const value = await this.cache.get<T>(key);
      this.metricsService.redisCommandsTotal.inc({
        command: 'get',
        result: value !== undefined && value !== null ? 'hit' : 'miss',
      });
      return value;
    } catch (error) {
      this.metricsService.redisCommandsTotal.inc({
        command: 'get',
        result: 'error',
      });
      throw error;
    } finally {
      end();
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const end = this.metricsService.redisCommandDurationSeconds.startTimer({
      command: 'set',
    });
    try {
      await this.cache.set(key, value, ttl);
      this.metricsService.redisCommandsTotal.inc({
        command: 'set',
        result: 'ok',
      });
    } catch (error) {
      this.metricsService.redisCommandsTotal.inc({
        command: 'set',
        result: 'error',
      });
      throw error;
    } finally {
      end();
    }
  }

  async del(key: string): Promise<void> {
    const end = this.metricsService.redisCommandDurationSeconds.startTimer({
      command: 'del',
    });
    try {
      await this.cache.del(key);
      this.metricsService.redisCommandsTotal.inc({
        command: 'del',
        result: 'ok',
      });
    } catch (error) {
      this.metricsService.redisCommandsTotal.inc({
        command: 'del',
        result: 'error',
      });
      throw error;
    } finally {
      end();
    }
  }
}
