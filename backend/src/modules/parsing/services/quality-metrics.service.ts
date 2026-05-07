import { Injectable, Logger } from '@nestjs/common';
import { ExtractedMetadata } from '../interfaces/enhanced-parsed-statement.interface';
import { ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { ChecksumValidationResult } from './checksum-validation.service';
import { ColumnValidationResult } from './column-validation.service';
import { DuplicationResult } from './intelligent-deduplication.service';
import { NormalizationResult } from './statement-normalization.service';

interface QualityMetricsResults {
  duplication?: DuplicationResult;
  normalization?: NormalizationResult;
  validation?: ColumnValidationResult;
  checksum?: ChecksumValidationResult;
  metadata?: ExtractedMetadata;
}

interface QualityMetricsContext {
  bankId?: string;
  processingTime: number;
  memoryUsage?: number;
  format?: string;
  transactionCount?: number;
}

interface RichExtractedMetadata extends ExtractedMetadata {
  account?: { number?: string };
  period?: { label?: string };
  currency?: { code?: string };
  institution?: { name?: string };
}

export interface QualityMetricsSnapshot {
  timestamp: Date;
  processingId: string;
  bankId?: string;
  statementCount: number;
  transactionCount: number;
  overallMetrics: OverallQualityMetrics;
  breakdownMetrics: BreakdownMetrics;
  trendMetrics: TrendMetrics;
  performanceMetrics: PerformanceMetrics;
  alerts: QualityAlert[];
}

export interface OverallQualityMetrics {
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
  reliability: number;
  completeness: number;
  accuracy: number;
  consistency: number;
}

export interface BreakdownMetrics {
  parsing: ParsingQualityMetrics;
  extraction: ExtractionQualityMetrics;
  normalization: NormalizationQualityMetrics;
  validation: ValidationQualityMetrics;
  deduplication: DeduplicationQualityMetrics;
}

export interface ParsingQualityMetrics {
  successRate: number;
  errorRate: number;
  formatDetectionAccuracy: number;
  averageProcessingTime: number;
  supportedFormats: string[];
}

export interface ExtractionQualityMetrics {
  headerExtractionAccuracy: number;
  metadataCompleteness: number;
  fieldExtractionRate: Record<string, number>;
  confidenceLevel: number;
  extractionMethod: string;
}

export interface NormalizationQualityMetrics {
  fieldNormalizationRate: number;
  typeConversionAccuracy: number;
  formatStandardizationRate: number;
  dataCleaningEffectiveness: number;
  autoFixSuccessRate: number;
}

export interface ValidationQualityMetrics {
  ruleComplianceRate: number;
  checksumValidationRate: number;
  businessRuleValidationRate: number;
  criticalIssueRate: number;
  warningRate: number;
}

export interface DeduplicationQualityMetrics {
  duplicateDetectionAccuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  deduplicationEffectiveness: number;
  averageConfidence: number;
}

export interface TrendMetrics {
  daily: DailyTrend[];
  weekly: WeeklyTrend[];
  monthly: MonthlyTrend[];
  performance: PerformanceTrend[];
}

export interface DailyTrend {
  date: string;
  overallScore: number;
  transactionCount: number;
  processingTime: number;
  errorCount: number;
}

export interface WeeklyTrend {
  week: string;
  startDate: string;
  endDate: string;
  averageScore: number;
  totalTransactions: number;
  peakDay: string;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  averageScore: number;
  totalTransactions: number;
  totalErrors: number;
  qualityImprovement: number;
}

export interface PerformanceTrend {
  timestamp: Date;
  category: string;
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface PerformanceMetrics {
  processingTime: ProcessingTimeMetrics;
  memoryUsage: MemoryUsageMetrics;
  throughput: ThroughputMetrics;
  resourceEfficiency: ResourceEfficiencyMetrics;
}

export interface ProcessingTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  minimum: number;
  maximum: number;
}

export interface MemoryUsageMetrics {
  average: number;
  peak: number;
  efficiency: number;
  leaks: number;
}

export interface ThroughputMetrics {
  transactionsPerSecond: number;
  statementsPerMinute: number;
  peakThroughput: number;
  sustainedThroughput: number;
}

export interface ResourceEfficiencyMetrics {
  cpuUsage: number;
  ioWait: number;
  contextSwitches: number;
  efficiency: number;
}

export interface QualityAlert {
  id: string;
  type: 'performance' | 'quality' | 'reliability' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'improving' | 'stable' | 'degrading';
  recommendation: string;
  timestamp: Date;
  resolved: boolean;
}

export interface QualityThresholds {
  overallScore: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  processingTime: {
    warning: number;
    critical: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

export interface QualityAnalytics {
  summary: QualitySummary;
  trends: QualityTrends;
  insights: QualityInsight[];
  recommendations: QualityRecommendation[];
  benchmarks: QualityBenchmark[];
}

export interface QualitySummary {
  totalProcessed: number;
  averageScore: number;
  bestDay: string;
  worstDay: string;
  topBanks: BankPerformance[];
  commonIssues: IssueFrequency[];
}

export interface QualityTrends {
  scoreTrend: TrendDirection;
  performanceTrend: TrendDirection;
  errorRateTrend: TrendDirection;
  qualityTrajectory: QualityTrajectory;
}

export interface BankPerformance {
  bankId: string;
  bankName: string;
  statementCount: number;
  averageScore: number;
  reliability: number;
  lastProcessed: string;
}

export interface IssueFrequency {
  issue: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface QualityInsight {
  category: string;
  title: string;
  description: string;
  impact: string;
  data: Record<string, unknown>;
  confidence: number;
}

export interface QualityRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  action: string;
  expectedImpact: string;
  estimatedEffort: string;
}

export interface QualityBenchmark {
  metric: string;
  category: string;
  current: number;
  baseline: number;
  target: number;
  industryAverage?: number;
  performanceLevel: 'below' | 'at' | 'above';
}

export type TrendDirection = 'improving' | 'stable' | 'degrading';
export type QualityTrajectory = 'positive' | 'stable' | 'negative';

@Injectable()
export class QualityMetricsService {
  private readonly logger = new Logger(QualityMetricsService.name);

  // In-memory storage for metrics (in production, use database)
  private readonly metricsHistory: QualityMetricsSnapshot[] = [];
  private readonly maxHistorySize = 1000;

  private getNormalizationScore(normalization?: NormalizationResult): number {
    return normalization?.qualityMetrics.dataQualityScore || 0;
  }

  private getNormalizationCompleteness(normalization?: NormalizationResult): number {
    if (!normalization) return 0;
    const totalRows = normalization.qualityMetrics.totalRows;
    return totalRows > 0 ? normalization.qualityMetrics.successfullyNormalized / totalRows : 0;
  }

  private getNormalizationAutoFixSuccessRate(normalization?: NormalizationResult): number {
    return this.getNormalizationCompleteness(normalization);
  }

  private getRichMetadata(metadata?: ExtractedMetadata): RichExtractedMetadata | undefined {
    return metadata as RichExtractedMetadata | undefined;
  }

  // Quality thresholds
  private readonly thresholds: QualityThresholds = {
    overallScore: {
      excellent: 95,
      good: 85,
      fair: 70,
      poor: 0,
    },
    processingTime: {
      warning: 5000, // 5 seconds
      critical: 10000, // 10 seconds
    },
    memoryUsage: {
      warning: 512, // 512 MB
      critical: 1024, // 1 GB
    },
    errorRate: {
      warning: 0.05, // 5%
      critical: 0.1, // 10%
    },
  };

  async recordQualityMetrics(
    processingId: string,
    transactions: ParsedTransaction[],
    results: {
      duplication?: DuplicationResult;
      normalization?: NormalizationResult;
      validation?: ColumnValidationResult;
      checksum?: ChecksumValidationResult;
      metadata?: ExtractedMetadata;
    },
    context: QualityMetricsContext,
  ): Promise<QualityMetricsSnapshot> {
    this.logger.log(`Recording quality metrics for processing: ${processingId}`);

    const timestamp = new Date();

    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(transactions, results);

    // Calculate breakdown metrics
    const breakdownMetrics = await this.calculateBreakdownMetrics(transactions, results);

    // Calculate trend metrics
    const trendMetrics = await this.calculateTrendMetrics();

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(context);

    // Generate alerts
    const alerts = this.generateAlerts(overallMetrics, performanceMetrics, context);

    const snapshot: QualityMetricsSnapshot = {
      timestamp,
      processingId,
      bankId: context.bankId,
      statementCount: 1,
      transactionCount: transactions.length,
      overallMetrics,
      breakdownMetrics,
      trendMetrics,
      performanceMetrics,
      alerts,
    };

    // Store the snapshot
    this.storeSnapshot(snapshot);

    // Process alerts
    await this.processAlerts(alerts);

    return snapshot;
  }

  private calculateOverallMetrics(
    transactions: ParsedTransaction[],
    results: QualityMetricsResults,
  ): OverallQualityMetrics {
    let completeness = 0;
    let accuracy = 0;
    let consistency = 0;

    // Calculate from different processing results
    if (results.duplication) {
      const dupMetrics = results.duplication.qualityMetrics;
      accuracy += dupMetrics.precision * 0.3;
      completeness += (1 - dupMetrics.correctDeduplicationRate) * 0.2;
      consistency += dupMetrics.f1Score * 0.2;
    }

    if (results.normalization) {
      const normQuality = this.getNormalizationScore(results.normalization);
      accuracy += normQuality * 0.2;
      completeness += normQuality * 0.3;
      consistency += normQuality * 0.3;
    }

    if (results.validation) {
      const validQuality = results.validation.qualityScore || 0;
      accuracy += validQuality * 0.3;
      completeness += validQuality * 0.2;
      consistency += validQuality * 0.3;
    }

    if (results.checksum) {
      const checksumQuality = results.checksum.qualityScore || 0;
      accuracy += checksumQuality * 0.2;
      consistency += checksumQuality * 0.2;
    }

    // Normalize weights
    const totalWeight = 1.0;
    const currentWeight = 0.3 + 0.2 + 0.3 + 0.3 + 0.2 + 0.2; // From above calculations
    if (currentWeight > 0) {
      completeness /= currentWeight / 0.4; // Completeness should be 40%
      accuracy /= currentWeight / 0.4; // Accuracy should be 40%
      consistency /= currentWeight / 0.2; // Consistency should be 20%
    }

    const score = (completeness + accuracy + consistency) / 3;
    const category = this.getScoreCategory(score);

    return {
      score: Math.round(score * 100) / 100,
      category,
      confidence: this.calculateConfidence(transactions, results),
      reliability: this.calculateReliability(results),
      completeness: Math.round(completeness * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
    };
  }

  private async calculateBreakdownMetrics(
    transactions: ParsedTransaction[],
    results: QualityMetricsResults,
  ): Promise<BreakdownMetrics> {
    return {
      parsing: this.calculateParsingMetrics(results),
      extraction: this.calculateExtractionMetrics(results),
      normalization: this.calculateNormalizationMetrics(results),
      validation: this.calculateValidationMetrics(results),
      deduplication: this.calculateDeduplicationMetrics(results),
    };
  }

  private calculateParsingMetrics(results: QualityMetricsResults): ParsingQualityMetrics {
    // Simplified calculation - would use actual parsing metrics
    return {
      successRate: 0.95, // Assumed from results
      errorRate: 0.05,
      formatDetectionAccuracy: 0.9,
      averageProcessingTime: 1000, // Would come from actual metrics
      supportedFormats: ['pdf', 'excel', 'csv'],
    };
  }

  private calculateExtractionMetrics(results: QualityMetricsResults): ExtractionQualityMetrics {
    const metadata = this.getRichMetadata(results.metadata);

    if (!metadata) {
      return {
        headerExtractionAccuracy: 0,
        metadataCompleteness: 0,
        fieldExtractionRate: {},
        confidenceLevel: 0,
        extractionMethod: 'none',
      };
    }

    const completeness = metadata.confidence || 0;

    return {
      headerExtractionAccuracy: completeness,
      metadataCompleteness: completeness,
      fieldExtractionRate: {
        account: metadata.account ? 1 : 0,
        period: metadata.period ? 1 : 0,
        currency: metadata.currency ? 1 : 0,
        institution: metadata.institution ? 1 : 0,
      },
      confidenceLevel: completeness,
      extractionMethod: metadata.extractionMethod,
    };
  }

  private calculateNormalizationMetrics(
    results: QualityMetricsResults,
  ): NormalizationQualityMetrics {
    const normalization = results.normalization;

    if (!normalization) {
      return {
        fieldNormalizationRate: 0,
        typeConversionAccuracy: 0,
        formatStandardizationRate: 0,
        dataCleaningEffectiveness: 0,
        autoFixSuccessRate: 0,
      };
    }

    return {
      fieldNormalizationRate: this.getNormalizationCompleteness(normalization),
      typeConversionAccuracy: normalization.qualityMetrics.dataQualityScore || 0,
      formatStandardizationRate: 0.95, // Assumed
      dataCleaningEffectiveness: 0.9, // Assumed
      autoFixSuccessRate: this.getNormalizationAutoFixSuccessRate(normalization),
    };
  }

  private calculateValidationMetrics(results: QualityMetricsResults): ValidationQualityMetrics {
    const validation = results.validation;

    if (!validation) {
      return {
        ruleComplianceRate: 0,
        checksumValidationRate: 0,
        businessRuleValidationRate: 0,
        criticalIssueRate: 0,
        warningRate: 0,
      };
    }

    const totalIssues = validation.inconsistencies?.length || 0;
    const criticalIssues =
      validation.inconsistencies?.filter(i => i.severity === 'high').length || 0;
    const warnings =
      validation.inconsistencies?.filter(i => i.severity === 'medium' || i.severity === 'low')
        .length || 0;

    return {
      ruleComplianceRate: 1 - totalIssues / Math.max(1, totalIssues),
      checksumValidationRate: validation.isValid ? 1 : 0.8,
      businessRuleValidationRate: 0.9, // Assumed
      criticalIssueRate: criticalIssues / Math.max(1, totalIssues),
      warningRate: warnings / Math.max(1, totalIssues),
    };
  }

  private calculateDeduplicationMetrics(
    results: QualityMetricsResults,
  ): DeduplicationQualityMetrics {
    const deduplication = results.duplication;

    if (!deduplication) {
      return {
        duplicateDetectionAccuracy: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        deduplicationEffectiveness: 0,
        averageConfidence: 0,
      };
    }

    const metrics = deduplication.qualityMetrics;

    return {
      duplicateDetectionAccuracy: metrics.precision || 0,
      falsePositiveRate: 1 - metrics.recall, // Simplified
      falseNegativeRate: 1 - metrics.precision, // Simplified
      deduplicationEffectiveness: metrics.f1Score || 0,
      averageConfidence: metrics.averageConfidence || 0,
    };
  }

  private async calculateTrendMetrics(): Promise<TrendMetrics> {
    const recentSnapshots = this.metricsHistory.slice(-30); // Last 30 entries

    return {
      daily: this.calculateDailyTrends(recentSnapshots),
      weekly: this.calculateWeeklyTrends(recentSnapshots),
      monthly: this.calculateMonthlyTrends(recentSnapshots),
      performance: this.calculatePerformanceTrends(recentSnapshots),
    };
  }

  private calculateDailyTrends(snapshots: QualityMetricsSnapshot[]): DailyTrend[] {
    const dailyMap = new Map<string, DailyTrend>();

    for (const snapshot of snapshots) {
      const date = snapshot.timestamp.toISOString().split('T')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          overallScore: 0,
          transactionCount: 0,
          processingTime: 0,
          errorCount: 0,
        });
      }

      const dayTrend = dailyMap.get(date) as DailyTrend;
      dayTrend.overallScore += snapshot.overallMetrics.score;
      dayTrend.transactionCount += snapshot.transactionCount;
      dayTrend.processingTime += snapshot.performanceMetrics.processingTime.average;
      dayTrend.errorCount +=
        snapshot.performanceMetrics.processingTime.average > this.thresholds.processingTime.warning
          ? 1
          : 0;
    }

    // Average the values for each day
    for (const [date, trend] of dailyMap) {
      const daySnapshots = snapshots.filter(s => s.timestamp.toISOString().split('T')[0] === date);
      if (daySnapshots.length > 0) {
        trend.overallScore /= daySnapshots.length;
        trend.processingTime /= daySnapshots.length;
      }
    }

    return Array.from(dailyMap.values());
  }

  private calculateWeeklyTrends(snapshots: QualityMetricsSnapshot[]): WeeklyTrend[] {
    // Simplified weekly calculation
    const weeklyTrends: WeeklyTrend[] = [];

    for (let i = 0; i < 4; i++) {
      // Last 4 weeks
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekSnapshots = snapshots.filter(
        s => s.timestamp >= weekStart && s.timestamp <= weekEnd,
      );

      if (weekSnapshots.length > 0) {
        const avgScore =
          weekSnapshots.reduce((sum, s) => sum + s.overallMetrics.score, 0) / weekSnapshots.length;
        const totalTransactions = weekSnapshots.reduce((sum, s) => sum + s.transactionCount, 0);

        weeklyTrends.push({
          week: `W${i + 1}`,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          averageScore: avgScore,
          totalTransactions,
          peakDay: 'Monday', // Would calculate from daily trends
        });
      }
    }

    return weeklyTrends;
  }

  private calculateMonthlyTrends(snapshots: QualityMetricsSnapshot[]): MonthlyTrend[] {
    const monthlyTrends: MonthlyTrend[] = [];
    const currentYear = new Date().getFullYear();

    for (let month = 0; month < 12; month++) {
      const monthSnapshots = snapshots.filter(
        s => s.timestamp.getFullYear() === currentYear && s.timestamp.getMonth() === month,
      );

      if (monthSnapshots.length > 0) {
        const avgScore =
          monthSnapshots.reduce((sum, s) => sum + s.overallMetrics.score, 0) /
          monthSnapshots.length;
        const totalTransactions = monthSnapshots.reduce((sum, s) => sum + s.transactionCount, 0);
        const totalErrors = monthSnapshots.reduce(
          (sum, s) => sum + s.alerts.filter(a => a.severity === 'critical').length,
          0,
        );

        monthlyTrends.push({
          month: new Date(currentYear, month).toLocaleString('default', {
            month: 'short',
          }),
          year: currentYear,
          averageScore: avgScore,
          totalTransactions,
          totalErrors,
          qualityImprovement: month > 0 ? avgScore - monthlyTrends[month - 1]?.averageScore : 0, // Simplified
        });
      }
    }

    return monthlyTrends;
  }

  private calculatePerformanceTrends(snapshots: QualityMetricsSnapshot[]): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    // Processing time trend
    const recentSnapshots = snapshots.slice(-10);
    const avgProcessingTime =
      recentSnapshots.reduce((sum, s) => sum + s.performanceMetrics.processingTime.average, 0) /
      recentSnapshots.length;

    trends.push({
      timestamp: new Date(),
      category: 'processing_time',
      value: avgProcessingTime,
      threshold: this.thresholds.processingTime.warning,
      status: avgProcessingTime > this.thresholds.processingTime.warning ? 'warning' : 'normal',
    });

    return trends;
  }

  private calculatePerformanceMetrics(context: QualityMetricsContext): PerformanceMetrics {
    return {
      processingTime: {
        average: context.processingTime || 0,
        median: context.processingTime || 0,
        p95: context.processingTime || 0,
        p99: context.processingTime || 0,
        minimum: context.processingTime || 0,
        maximum: context.processingTime || 0,
      },
      memoryUsage: {
        average: context.memoryUsage || 0,
        peak: context.memoryUsage || 0,
        efficiency: 0.85, // Assumed
        leaks: 0, // Would track from actual metrics
      },
      throughput: {
        transactionsPerSecond: context.transactionCount
          ? context.transactionCount / (context.processingTime / 1000)
          : 0,
        statementsPerMinute: 60 / (context.processingTime / 1000), // Assuming 1 statement
        peakThroughput: 100, // Assumed
        sustainedThroughput: 80, // Assumed
      },
      resourceEfficiency: {
        cpuUsage: 0.6, // Assumed
        ioWait: 0.1, // Assumed
        contextSwitches: 1000, // Assumed
        efficiency: 0.85, // Assumed
      },
    };
  }

  private generateAlerts(
    overallMetrics: OverallQualityMetrics,
    performanceMetrics: PerformanceMetrics,
    context: QualityMetricsContext,
  ): QualityAlert[] {
    const alerts: QualityAlert[] = [];

    // Quality alerts
    if (overallMetrics.score < this.thresholds.overallScore.fair) {
      alerts.push({
        id: `quality_low_${Date.now()}`,
        type: 'quality',
        severity: 'high',
        title: 'Low Quality Score',
        description: `Quality score is ${overallMetrics.score}, below acceptable threshold`,
        metric: 'overall_score',
        currentValue: overallMetrics.score,
        threshold: this.thresholds.overallScore.fair,
        trend: 'stable',
        recommendation: 'Review parsing configuration and source data quality',
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Performance alerts
    if (performanceMetrics.processingTime.average > this.thresholds.processingTime.warning) {
      alerts.push({
        id: `performance_slow_${Date.now()}`,
        type: 'performance',
        severity:
          performanceMetrics.processingTime.average > this.thresholds.processingTime.critical
            ? 'critical'
            : 'medium',
        title: 'Slow Processing Time',
        description: `Average processing time is ${performanceMetrics.processingTime.average}ms`,
        metric: 'processing_time',
        currentValue: performanceMetrics.processingTime.average,
        threshold: this.thresholds.processingTime.warning,
        trend: 'degrading',
        recommendation: 'Optimize parsing algorithms or increase resources',
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Memory alerts
    if (performanceMetrics.memoryUsage.average > this.thresholds.memoryUsage.warning) {
      alerts.push({
        id: `memory_high_${Date.now()}`,
        type: 'capacity',
        severity:
          performanceMetrics.memoryUsage.average > this.thresholds.memoryUsage.critical
            ? 'critical'
            : 'medium',
        title: 'High Memory Usage',
        description: `Memory usage is ${performanceMetrics.memoryUsage.average}MB`,
        metric: 'memory_usage',
        currentValue: performanceMetrics.memoryUsage.average,
        threshold: this.thresholds.memoryUsage.warning,
        trend: 'stable',
        recommendation: 'Investigate memory leaks or optimize memory usage',
        timestamp: new Date(),
        resolved: false,
      });
    }

    return alerts;
  }

  private getScoreCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= this.thresholds.overallScore.excellent) return 'excellent';
    if (score >= this.thresholds.overallScore.good) return 'good';
    if (score >= this.thresholds.overallScore.fair) return 'fair';
    return 'poor';
  }

  private calculateConfidence(
    transactions: ParsedTransaction[],
    results: QualityMetricsResults,
  ): number {
    // Simplified confidence calculation
    let confidence = 0.8; // Base confidence

    if (transactions.length > 0) {
      confidence += 0.1; // Has data
    }

    if (
      results.duplication?.qualityMetrics?.f1Score &&
      results.duplication.qualityMetrics.f1Score > 0.8
    ) {
      confidence += 0.05; // Good deduplication
    }

    if (results.validation?.isValid) {
      confidence += 0.05; // Validation passed
    }

    return Math.min(confidence, 1.0);
  }

  private calculateReliability(results: QualityMetricsResults): number {
    // Calculate reliability based on consistency of results
    let reliability = 0.9; // Base reliability

    if (results.checksum?.isValid) {
      reliability += 0.05;
    }

    if (results.validation?.qualityScore && results.validation.qualityScore > 0.85) {
      reliability += 0.05;
    }

    return Math.min(reliability, 1.0);
  }

  private storeSnapshot(snapshot: QualityMetricsSnapshot): void {
    this.metricsHistory.push(snapshot);

    // Keep only recent snapshots
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.splice(0, this.metricsHistory.length - this.maxHistorySize);
    }
  }

  private async processAlerts(alerts: QualityAlert[]): Promise<void> {
    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        this.logger.error(`Critical alert: ${alert.title} - ${alert.description}`);
        // In production: send notifications, create tickets, etc.
      } else if (alert.severity === 'high') {
        this.logger.warn(`High alert: ${alert.title} - ${alert.description}`);
      } else {
        this.logger.log(`Alert: ${alert.title} - ${alert.description}`);
      }
    }
  }

  // Public methods for accessing metrics

  getRecentMetrics(count = 10): QualityMetricsSnapshot[] {
    return this.metricsHistory.slice(-count);
  }

  getMetricsByDateRange(startDate: Date, endDate: Date): QualityMetricsSnapshot[] {
    return this.metricsHistory.filter(
      snapshot => snapshot.timestamp >= startDate && snapshot.timestamp <= endDate,
    );
  }

  getMetricsByBank(bankId: string): QualityMetricsSnapshot[] {
    return this.metricsHistory.filter(snapshot => snapshot.bankId === bankId);
  }

  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): QualityAlert[] {
    const allAlerts = this.metricsHistory.flatMap(snapshot => snapshot.alerts);

    if (severity) {
      return allAlerts.filter(alert => alert.severity === severity);
    }

    return allAlerts;
  }

  getUnresolvedAlerts(): QualityAlert[] {
    const allAlerts = this.metricsHistory.flatMap(snapshot => snapshot.alerts);
    return allAlerts.filter(alert => !alert.resolved);
  }

  async generateQualityReport(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<QualityAnalytics> {
    const snapshots = timeRange
      ? this.getMetricsByDateRange(timeRange.startDate, timeRange.endDate)
      : this.getRecentMetrics(100);

    const summary = this.generateSummary(snapshots);
    const trends = this.generateTrends(snapshots);
    const insights = this.generateInsights(snapshots);
    const recommendations = this.generateRecommendations(insights);
    const benchmarks = this.generateBenchmarks(snapshots);

    return {
      summary,
      trends,
      insights,
      recommendations,
      benchmarks,
    };
  }

  private generateSummary(snapshots: QualityMetricsSnapshot[]): QualitySummary {
    const totalProcessed = snapshots.reduce((sum, s) => sum + s.transactionCount, 0);
    const averageScore =
      snapshots.reduce((sum, s) => sum + s.overallMetrics.score, 0) / snapshots.length;

    // Find best and worst days
    const bestDay = snapshots.reduce((best, current) =>
      current.overallMetrics.score > best.overallMetrics.score ? current : best,
    );

    const worstDay = snapshots.reduce((worst, current) =>
      current.overallMetrics.score < worst.overallMetrics.score ? current : worst,
    );

    // Top banks
    const bankPerformance = new Map<string, BankPerformance>();
    for (const snapshot of snapshots) {
      if (snapshot.bankId) {
        const existing = bankPerformance.get(snapshot.bankId);
        if (existing) {
          existing.statementCount++;
          existing.averageScore = (existing.averageScore + snapshot.overallMetrics.score) / 2;
          existing.lastProcessed = snapshot.timestamp.toISOString().split('T')[0];
        } else {
          bankPerformance.set(snapshot.bankId, {
            bankId: snapshot.bankId,
            bankName: snapshot.bankId, // Would get from bank profiles
            statementCount: 1,
            averageScore: snapshot.overallMetrics.score,
            reliability: snapshot.overallMetrics.reliability,
            lastProcessed: snapshot.timestamp.toISOString().split('T')[0],
          });
        }
      }
    }

    const topBanks = Array.from(bankPerformance.values())
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    // Common issues
    const issueFrequency = new Map<string, IssueFrequency>();
    for (const snapshot of snapshots) {
      for (const alert of snapshot.alerts) {
        const existing = issueFrequency.get(alert.type);
        if (existing) {
          existing.frequency++;
        } else {
          issueFrequency.set(alert.type, {
            issue: alert.title,
            frequency: 1,
            severity: alert.severity,
            trend: 'stable', // Would calculate from historical data
          });
        }
      }
    }

    const commonIssues = Array.from(issueFrequency.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return {
      totalProcessed,
      averageScore,
      bestDay: bestDay.timestamp.toISOString().split('T')[0],
      worstDay: worstDay.timestamp.toISOString().split('T')[0],
      topBanks,
      commonIssues,
    };
  }

  private generateTrends(snapshots: QualityMetricsSnapshot[]): QualityTrends {
    const recentSnapshots = snapshots.slice(-20);
    const scores = recentSnapshots.map(s => s.overallMetrics.score);
    const processingTimes = recentSnapshots.map(s => s.performanceMetrics.processingTime.average);

    return {
      scoreTrend: this.calculateTrendDirection(scores),
      performanceTrend: this.calculateTrendDirection(processingTimes),
      errorRateTrend: 'stable', // Would calculate from error data
      qualityTrajectory:
        scores.length > 1 && scores[scores.length - 1] > scores[0] ? 'positive' : 'stable',
    };
  }

  private calculateTrendDirection(values: number[]): TrendDirection {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = 2; // Minimum significant change

    if (difference > threshold) return 'improving';
    if (difference < -threshold) return 'degrading';
    return 'stable';
  }

  private generateInsights(snapshots: QualityMetricsSnapshot[]): QualityInsight[] {
    const insights: QualityInsight[] = [];

    // Generate insights based on patterns
    const avgScore =
      snapshots.reduce((sum, s) => sum + s.overallMetrics.score, 0) / snapshots.length;

    if (avgScore < this.thresholds.overallScore.fair) {
      insights.push({
        category: 'quality',
        title: 'Consistently Low Quality',
        description: 'Recent processing quality is consistently below acceptable levels',
        impact: 'High',
        data: {
          averageScore: avgScore,
          threshold: this.thresholds.overallScore.fair,
        },
        confidence: 0.9,
      });
    }

    return insights;
  }

  private generateRecommendations(insights: QualityInsight[]): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    for (const insight of insights) {
      if (insight.category === 'quality') {
        recommendations.push({
          priority: 'high',
          category: 'quality',
          title: 'Improve Data Quality',
          description: 'Address the root causes of low quality scores',
          action: 'Review parsing configurations and update parsing rules',
          expectedImpact: 'Significant improvement in processing quality',
          estimatedEffort: 'Medium',
        });
      }
    }

    return recommendations;
  }

  private generateBenchmarks(snapshots: QualityMetricsSnapshot[]): QualityBenchmark[] {
    const benchmarks: QualityBenchmark[] = [];

    const avgScore =
      snapshots.reduce((sum, s) => sum + s.overallMetrics.score, 0) / snapshots.length;
    const avgProcessingTime =
      snapshots.reduce((sum, s) => sum + s.performanceMetrics.processingTime.average, 0) /
      snapshots.length;

    benchmarks.push({
      metric: 'quality_score',
      category: 'quality',
      current: avgScore,
      baseline: 75, // Industry baseline
      target: 95, // Excellence target
      performanceLevel: avgScore >= 95 ? 'above' : avgScore >= 75 ? 'at' : 'below',
    });

    benchmarks.push({
      metric: 'processing_time',
      category: 'performance',
      current: avgProcessingTime,
      baseline: 2000, // 2 seconds baseline
      target: 1000, // 1 second target
      performanceLevel:
        avgProcessingTime <= 1000 ? 'above' : avgProcessingTime <= 2000 ? 'at' : 'below',
    });

    return benchmarks;
  }

  // Configuration methods

  updateThresholds(newThresholds: Partial<QualityThresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    this.logger.log('Updated quality thresholds');
  }

  getThresholds(): QualityThresholds {
    return { ...this.thresholds };
  }

  clearMetrics(): void {
    this.metricsHistory.length = 0;
    this.logger.log('Cleared quality metrics history');
  }

  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metricsHistory, null, 2);
    }

    // CSV export
    const headers = [
      'timestamp',
      'processingId',
      'bankId',
      'transactionCount',
      'overallScore',
      'completeness',
      'accuracy',
      'consistency',
      'processingTime',
      'memoryUsage',
    ];

    const rows = this.metricsHistory.map(snapshot => [
      snapshot.timestamp.toISOString(),
      snapshot.processingId,
      snapshot.bankId || '',
      snapshot.transactionCount,
      snapshot.overallMetrics.score,
      snapshot.overallMetrics.completeness,
      snapshot.overallMetrics.accuracy,
      snapshot.overallMetrics.consistency,
      snapshot.performanceMetrics.processingTime.average,
      snapshot.performanceMetrics.memoryUsage.average,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
