import { Injectable, Logger } from '@nestjs/common';
import { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { ChecksumValidationResult } from './checksum-validation.service';
import { NormalizationResult } from './statement-normalization.service';

type QualityLogMetadata = Record<string, unknown>;

interface BatchQualityMetrics extends QualityMetrics {
  averageQualityScore: number;
  totalProcessingTime: number;
  throughput: number;
}

export interface QualityLogEntry {
  timestamp: Date;
  statementId?: string;
  locale?: string;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  performance: PerformanceMetrics;
  metadata: QualityLogMetadata;
}

export interface QualityMetrics {
  totalTransactions: number;
  successfullyProcessed: number;
  failedProcessing: number;
  duplicatesRemoved: number;
  dataQualityScore: number;
  checksumQualityScore?: number;
  overallQualityScore: number;
  processingTime: number;
  errorRate: number;
  completeness: number;
}

export interface QualityIssue {
  type:
    | 'parsing_error'
    | 'normalization_error'
    | 'validation_error'
    | 'checksum_mismatch'
    | 'data_quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows?: number[];
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  parsingTime: number;
  normalizationTime: number;
  validationTime: number;
  checksumTime: number;
  totalTime: number;
  memoryUsage?: number;
  throughput?: number; // transactions per second
}

@Injectable()
export class QualityLoggingService {
  private readonly logger = new Logger(QualityLoggingService.name);
  private readonly qualityLogs: QualityLogEntry[] = [];
  private readonly maxLogEntries = 1000;

  async logStatementProcessing(
    statement: ParsedStatement,
    result: NormalizationResult,
    checksumValidation?: ChecksumValidationResult,
    processingTimes?: Partial<PerformanceMetrics>,
  ): Promise<void> {
    const timestamp = new Date();

    const metrics = await this.calculateQualityMetrics(
      statement.transactions.length,
      result,
      checksumValidation,
    );

    const issues = this.extractQualityIssues(result, checksumValidation);

    const performance = this.calculatePerformanceMetrics(
      processingTimes,
      result.qualityMetrics.totalRows,
    );

    const logEntry: QualityLogEntry = {
      timestamp,
      statementId: this.extractStatementId(statement),
      locale: statement.metadata.locale,
      metrics: {
        ...metrics,
        processingTime: performance.totalTime,
      },
      issues,
      performance,
      metadata: {
        currency: statement.metadata.currency,
        institution: statement.metadata.institution,
        period: statement.metadata.periodLabel,
        accountNumber: statement.metadata.accountNumber,
        hasHeader: !!statement.metadata.rawHeader,
        warnings: result.warnings,
        errors: result.errors,
      },
    };

    await this.storeLogEntry(logEntry);

    // Log to console based on severity
    this.logToConsole(logEntry);

    // Update statistics
    await this.updateStatistics(logEntry);
  }

  async logBatchProcessing(
    statements: ParsedStatement[],
    results: NormalizationResult[],
  ): Promise<void> {
    const batchMetrics = await this.calculateBatchMetrics(statements, results);

    this.logger.log(`Batch processing completed:
      - Statements: ${statements.length}
      - Total transactions: ${batchMetrics.totalTransactions}
      - Overall quality score: ${batchMetrics.averageQualityScore.toFixed(2)}
      - Error rate: ${(batchMetrics.errorRate * 100).toFixed(1)}%
      - Processing time: ${batchMetrics.totalProcessingTime}ms`);

    // Store batch metrics separately
    const batchLog: QualityLogEntry = {
      timestamp: new Date(),
      metrics: batchMetrics,
      issues: [], // Batch-level issues would be aggregated
      performance: {
        parsingTime: 0,
        normalizationTime: 0,
        validationTime: 0,
        checksumTime: 0,
        totalTime: batchMetrics.totalProcessingTime,
        throughput: batchMetrics.throughput,
      },
      metadata: {
        batchMode: true,
        statementCount: statements.length,
      },
    };

    await this.storeLogEntry(batchLog);
  }

  private async calculateQualityMetrics(
    totalTransactions: number,
    result: NormalizationResult,
    checksumValidation?: ChecksumValidationResult,
  ): Promise<QualityMetrics> {
    const successfullyProcessed = result.qualityMetrics.successfullyNormalized;
    const failedProcessing = result.qualityMetrics.failedNormalization;
    const duplicatesRemoved = result.qualityMetrics.duplicatesRemoved;

    const dataQualityScore = result.qualityMetrics.dataQualityScore;
    const checksumQualityScore = checksumValidation?.qualityScore || 1.0;
    const overallQualityScore = (dataQualityScore + checksumQualityScore) / 2;

    const errorRate = totalTransactions > 0 ? failedProcessing / totalTransactions : 0;
    const completeness = totalTransactions > 0 ? successfullyProcessed / totalTransactions : 0;

    return {
      totalTransactions,
      successfullyProcessed,
      failedProcessing,
      duplicatesRemoved,
      dataQualityScore,
      checksumQualityScore,
      overallQualityScore,
      processingTime: 0, // Will be set from performance metrics
      errorRate,
      completeness,
    };
  }

  private extractQualityIssues(
    result: NormalizationResult,
    checksumValidation?: ChecksumValidationResult,
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Extract issues from normalization result
    if (result.errors.length > 0) {
      issues.push({
        type: 'normalization_error',
        severity: 'high',
        description: `Normalization errors: ${result.errors.join(', ')}`,
        affectedRows: [], // Could be tracked if needed
      });
    }

    // Extract issues from checksum validation
    if (checksumValidation && !checksumValidation.isValid) {
      checksumValidation.discrepancies.forEach(disc => {
        issues.push({
          type: 'checksum_mismatch',
          severity: disc.severity as 'low' | 'medium' | 'high',
          description: `${disc.type}: ${disc.difference.toFixed(2)} (${disc.percentageDifference.toFixed(1)}% difference)`,
          details: { ...disc },
        });
      });
    }

    // Check for low quality scores
    if (result.qualityMetrics.dataQualityScore < 0.7) {
      issues.push({
        type: 'data_quality_issue',
        severity: 'medium',
        description: `Low data quality score: ${(result.qualityMetrics.dataQualityScore * 100).toFixed(1)}%`,
      });
    }

    // Check for high error rates
    const errorRate = result.qualityMetrics.failedNormalization / result.qualityMetrics.totalRows;
    if (errorRate > 0.1) {
      issues.push({
        type: 'parsing_error',
        severity: 'high',
        description: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
      });
    }

    return issues;
  }

  private calculatePerformanceMetrics(
    processingTimes?: Partial<PerformanceMetrics>,
    totalRows?: number,
  ): PerformanceMetrics {
    const defaultTimes = {
      parsingTime: 0,
      normalizationTime: 0,
      validationTime: 0,
      checksumTime: 0,
    };

    const times = { ...defaultTimes, ...processingTimes };
    const totalTime = Object.values(times).reduce((sum, time) => sum + time, 0);

    const throughput = totalRows && totalTime > 0 ? (totalRows / totalTime) * 1000 : undefined; // transactions per second

    return {
      ...times,
      totalTime,
      throughput,
    };
  }

  private extractStatementId(statement: ParsedStatement): string | undefined {
    // Try to extract a unique identifier from the statement
    if (statement.metadata.accountNumber && statement.metadata.dateFrom) {
      const account = statement.metadata.accountNumber.replace(/\s/g, '').substring(0, 8);
      const date = statement.metadata.dateFrom.toISOString().substring(0, 10);
      return `${account}-${date}`;
    }
    return undefined;
  }

  private async storeLogEntry(logEntry: QualityLogEntry): Promise<void> {
    // Add to in-memory logs (in production, this would go to a database)
    this.qualityLogs.push(logEntry);

    // Keep only recent logs
    if (this.qualityLogs.length > this.maxLogEntries) {
      this.qualityLogs.splice(0, this.qualityLogs.length - this.maxLogEntries);
    }

    // In a real implementation, you would also:
    // - Store to database
    // - Send to monitoring system
    // - Update dashboards
  }

  private logToConsole(logEntry: QualityLogEntry): void {
    const criticalIssues = logEntry.issues.filter(issue => issue.severity === 'critical');
    const highIssues = logEntry.issues.filter(issue => issue.severity === 'high');

    if (criticalIssues.length > 0) {
      this.logger.error(
        `Critical quality issues detected: ${criticalIssues.map(i => i.description).join('; ')}`,
      );
    } else if (highIssues.length > 0) {
      this.logger.warn(
        `High severity issues detected: ${highIssues.map(i => i.description).join('; ')}`,
      );
    }

    if (logEntry.metrics.overallQualityScore < 0.5) {
      this.logger.warn(
        `Low quality score: ${(logEntry.metrics.overallQualityScore * 100).toFixed(1)}% for statement ${logEntry.statementId}`,
      );
    }

    // Log detailed metrics for debugging
    this.logger.debug(`Quality metrics for statement ${logEntry.statementId}:
      - Total: ${logEntry.metrics.totalTransactions}
      - Success: ${logEntry.metrics.successfullyProcessed}
      - Quality: ${(logEntry.metrics.overallQualityScore * 100).toFixed(1)}%
      - Time: ${logEntry.performance.totalTime}ms
      - Throughput: ${logEntry.performance.throughput?.toFixed(1)} tx/s`);
  }

  private async updateStatistics(logEntry: QualityLogEntry): Promise<void> {
    // Update running statistics (in production, this would update a monitoring system)
    // For now, we just log the information
    if (logEntry.issues.length > 0) {
      const issueTypes = logEntry.issues.reduce(
        (types, issue) => {
          types[issue.type] = (types[issue.type] || 0) + 1;
          return types;
        },
        {} as Record<string, number>,
      );

      this.logger.debug(`Issue distribution: ${JSON.stringify(issueTypes)}`);
    }
  }

  private async calculateBatchMetrics(
    statements: ParsedStatement[],
    results: NormalizationResult[],
  ): Promise<BatchQualityMetrics> {
    const totalTransactions = statements.reduce((sum, stmt) => sum + stmt.transactions.length, 0);
    const totalProcessingTime = results.reduce(
      (sum, result) => sum + this.getProcessingTime(result),
      0,
    );

    const qualityScores = results.map(result => result.qualityMetrics.dataQualityScore);
    const averageQualityScore =
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    const totalErrors = results.reduce(
      (sum, result) => sum + result.qualityMetrics.failedNormalization,
      0,
    );
    const errorRate = totalTransactions > 0 ? totalErrors / totalTransactions : 0;

    const throughput =
      totalProcessingTime > 0 ? (totalTransactions / totalProcessingTime) * 1000 : 0;

    const failedProcessing = results.reduce(
      (sum, result) => sum + result.qualityMetrics.failedNormalization,
      0,
    );
    const duplicatesRemoved = results.reduce(
      (sum, result) => sum + result.qualityMetrics.duplicatesRemoved,
      0,
    );

    return {
      totalTransactions,
      successfullyProcessed: totalTransactions - failedProcessing,
      failedProcessing,
      duplicatesRemoved,
      dataQualityScore: averageQualityScore,
      checksumQualityScore: undefined,
      overallQualityScore: averageQualityScore,
      processingTime: totalProcessingTime,
      completeness: totalTransactions > 0 ? (totalTransactions - failedProcessing) / totalTransactions : 0,
      totalProcessingTime,
      averageQualityScore,
      errorRate,
      throughput,
    };
  }

  private getProcessingTime(result: NormalizationResult): number {
    const candidate = (result.qualityMetrics as { processingTime?: unknown }).processingTime;
    return typeof candidate === 'number' ? candidate : 0;
  }

  // Public methods for accessing quality logs
  getRecentLogs(count = 50): QualityLogEntry[] {
    return this.qualityLogs.slice(-count);
  }

  getQualityTrends(hours = 24): QualityLogEntry[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.qualityLogs.filter(log => log.timestamp >= cutoffTime);
  }

  getQualitySummary(): {
    totalProcessed: number;
    averageQualityScore: number;
    errorRate: number;
    commonIssues: string[];
  } {
    if (this.qualityLogs.length === 0) {
      return {
        totalProcessed: 0,
        averageQualityScore: 0,
        errorRate: 0,
        commonIssues: [],
      };
    }

    const totalProcessed = this.qualityLogs.reduce(
      (sum, log) => sum + log.metrics.totalTransactions,
      0,
    );
    const averageQualityScore =
      this.qualityLogs.reduce((sum, log) => sum + log.metrics.overallQualityScore, 0) /
      this.qualityLogs.length;

    const totalErrors = this.qualityLogs.reduce(
      (sum, log) => sum + log.metrics.failedProcessing,
      0,
    );
    const errorRate = totalProcessed > 0 ? totalErrors / totalProcessed : 0;

    const issueCounts = new Map<string, number>();
    this.qualityLogs.forEach(log => {
      log.issues.forEach(issue => {
        const count = issueCounts.get(issue.type) || 0;
        issueCounts.set(issue.type, count + 1);
      });
    });

    const commonIssues = Array.from(issueCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    return {
      totalProcessed,
      averageQualityScore,
      errorRate,
      commonIssues,
    };
  }

  // Method to export quality logs for analysis
  exportQualityLogs(startDate?: Date, endDate?: Date): QualityLogEntry[] {
    let logs = this.qualityLogs;

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    return logs;
  }
}
