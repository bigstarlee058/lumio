import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, Max, Min, validateSync } from 'class-validator';

/**
 * Import configuration class with validation
 * Provides centralized settings management for the import session system
 */
class ImportConfig {
  /**
   * Number of days tolerance for date matching during deduplication
   * Default: 3 days
   * Range: 0-30 days
   */
  @IsInt()
  @Min(0)
  @Max(30)
  dedupDateToleranceDays: number;

  /**
   * Percentage tolerance for amount matching during deduplication
   * Default: 2% (0.02)
   * Range: 0-100%
   */
  @IsNumber()
  @Min(0)
  @Max(100)
  dedupAmountTolerancePercent: number;

  /**
   * Text similarity threshold for description matching (0-1 scale)
   * Default: 0.75 (75% similarity required)
   * Range: 0-1
   */
  @IsNumber()
  @Min(0)
  @Max(1)
  dedupTextSimilarityThreshold: number;

  /**
   * Whether to automatically commit import sessions when confidence is high
   * Default: false (manual commit required)
   */
  @IsBoolean()
  importAutoCommit: boolean;

  /**
   * Maximum number of retry attempts for failed operations
   * Default: 3
   * Range: 1-10
   */
  @IsInt()
  @Min(1)
  @Max(10)
  importMaxRetries: number;

  /**
   * Base delay in milliseconds for exponential backoff retry strategy
   * Default: 30000ms (30 seconds)
   * Range: 1000-300000ms (1s-5min)
   */
  @IsInt()
  @Min(1000)
  @Max(300000)
  importRetryBackoffBaseMs: number;

  /**
   * Confidence threshold for automatic conflict resolution (0-1 scale)
   * Default: 0.95 (95% confidence required)
   * Range: 0-1
   * When confidence is above this threshold, conflicts may be auto-resolved
   */
  @IsNumber()
  @Min(0)
  @Max(1)
  importConflictAutoResolveThreshold: number;
}

/**
 * Injectable service for accessing validated import configuration
 */
@Injectable()
export class ImportConfigService {
  private readonly config: ImportConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadAndValidateConfig();
  }

  /**
   * Load configuration from environment variables and validate
   */
  private loadAndValidateConfig(): ImportConfig {
    const config = plainToClass(ImportConfig, {
      dedupDateToleranceDays: this.getNumberOrDefault('DEDUP_DATE_TOLERANCE_DAYS', 3),
      dedupAmountTolerancePercent: this.getNumberOrDefault('DEDUP_AMOUNT_TOLERANCE_PERCENT', 2),
      dedupTextSimilarityThreshold: this.getNumberOrDefault(
        'DEDUP_TEXT_SIMILARITY_THRESHOLD',
        0.75,
      ),
      importAutoCommit: this.getBooleanOrDefault('IMPORT_AUTO_COMMIT', false),
      importMaxRetries: this.getNumberOrDefault('IMPORT_MAX_RETRIES', 3),
      importRetryBackoffBaseMs: this.getNumberOrDefault('IMPORT_RETRY_BACKOFF_BASE_MS', 30000),
      importConflictAutoResolveThreshold: this.getNumberOrDefault(
        'IMPORT_CONFLICT_AUTO_RESOLVE_THRESHOLD',
        0.95,
      ),
    });

    // Validate configuration
    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .map(error => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new Error(`Import configuration validation failed: ${messages}`);
    }

    return config;
  }

  /**
   * Helper to get number from environment or return default
   */
  private getNumberOrDefault(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);
    if (!value) {
      return defaultValue;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Helper to get boolean from environment or return default
   */
  private getBooleanOrDefault(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (!value) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }

  /**
   * Get the complete validated configuration
   */
  getConfig(): Readonly<ImportConfig> {
    return this.config;
  }

  /**
   * Get date tolerance for deduplication in days
   */
  getDedupDateToleranceDays(): number {
    return this.config.dedupDateToleranceDays;
  }

  /**
   * Get amount tolerance for deduplication as percentage
   */
  getDedupAmountTolerancePercent(): number {
    return this.config.dedupAmountTolerancePercent;
  }

  /**
   * Get text similarity threshold for deduplication (0-1)
   */
  getDedupTextSimilarityThreshold(): number {
    return this.config.dedupTextSimilarityThreshold;
  }

  /**
   * Check if auto-commit is enabled
   */
  isAutoCommitEnabled(): boolean {
    return this.config.importAutoCommit;
  }

  /**
   * Get maximum retry attempts
   */
  getMaxRetries(): number {
    return this.config.importMaxRetries;
  }

  /**
   * Get base backoff delay in milliseconds
   */
  getRetryBackoffBaseMs(): number {
    return this.config.importRetryBackoffBaseMs;
  }

  /**
   * Get conflict auto-resolve threshold (0-1)
   */
  getConflictAutoResolveThreshold(): number {
    return this.config.importConflictAutoResolveThreshold;
  }

  /**
   * Calculate backoff delay for retry attempt using exponential backoff
   * @param attempt Retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  calculateRetryBackoff(attempt: number): number {
    const base = this.config.importRetryBackoffBaseMs;
    return base * 2 ** attempt;
  }
}
