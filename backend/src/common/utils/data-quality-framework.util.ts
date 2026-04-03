/**
 * Data quality framework for validation and auto-correction.
 * Rewritten with strict typing, safer fixes, and self-contained helpers.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal feature flag interface (replace with actual implementation if available).
 */
interface FeatureFlagService {
  isEnabled(flag: string): boolean;
}

/**
 * Lightweight helpers to normalize dates and numbers.
 * Replace with project-level utilities if present.
 */
function normalizeDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNumberAdvanced(value: string, locale = 'en'): number | null {
  const sanitized = value
    .replace(/[^\d.,-]/g, '')
    .replace(/\s+/g, '')
    .replace(locale === 'de' ? '.' : ',', locale === 'de' ? '' : '.');

  const num = Number(sanitized);
  return Number.isFinite(num) ? num : null;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type IssueType =
  | 'missing_data'
  | 'invalid_format'
  | 'inconsistent_columns'
  | 'duplicate_rows'
  | 'currency_mismatch'
  | 'date_parse_error'
  | 'amount_parse_error'
  | 'missing_columns'
  | 'empty_rows';

export type FixType =
  | 'column_added'
  | 'column_removed'
  | 'row_removed'
  | 'data_corrected'
  | 'format_normalized';

export interface QualityIssue {
  type: IssueType;
  severity: Severity;
  description: string;
  row?: number;
  column?: string;
  suggestion?: string;
  autoFixed?: boolean;
}

export interface QualityFix {
  type: FixType;
  description: string;
  before: string[][];
  after: string[][];
  row?: number;
  column?: string;
}

export interface QualityMetrics {
  // Row-level metrics
  totalRows: number;
  validRows: number;
  emptyRows: number;
  duplicateRows: number;
  completeness: number; // 0-1

  // Column-level metrics
  columnConsistency: number; // 0-1
  expectedColumns: number;
  missingColumns: string[];
  extraColumns: number;

  // Data-level metrics
  dataAccuracy: number; // 0-1
  currencyConsistency: number; // 0-1
  dateAccuracy: number; // 0-1
  amountAccuracy: number; // 0-1

  // Overall quality score
  overallQuality: number; // 0-1

  // Optional snapshot of issues considered while computing metrics
  issues?: QualityIssue[];
}

export interface QualityReport {
  metrics: QualityMetrics;
  issues: QualityIssue[];
  fixes: QualityFix[];
  summary: string;
  recommendations: string[];
}

type RowMetrics = Pick<
  QualityMetrics,
  'totalRows' | 'validRows' | 'emptyRows' | 'duplicateRows' | 'completeness'
>;

type ColumnMetrics = Pick<
  QualityMetrics,
  'columnConsistency' | 'expectedColumns' | 'missingColumns' | 'extraColumns'
>;

type DataValidationMetrics = Pick<
  QualityMetrics,
  'dataAccuracy' | 'currencyConsistency' | 'dateAccuracy' | 'amountAccuracy'
>;

@Injectable()
export class DataQualityFramework {
  private readonly logger = new Logger(DataQualityFramework.name);

  async analyzeQuality(
    data: string[][],
    options: {
      expectedColumns?: number;
      columnTypes?: string[];
      strictMode?: boolean;
      autoFix?: boolean;
      language?: string;
    } = {},
  ): Promise<QualityReport> {
    const strictMode = options.strictMode ?? false;
    const autoFix = options.autoFix && !strictMode;

    this.logger.log(
      `Starting quality analysis: ${data.length} rows, strict: ${strictMode}, auto-fix: ${autoFix}`,
    );

    // Step 1: Basic validation
    const structure = this.validateDataStructure(data);
    if (!structure.isValid) {
      this.logger.warn(`Structure validation failed: ${structure.errors.join('; ')}`);
    }

    // Step 2: Row-level analysis
    const rowMetrics = this.analyzeRowQuality(data);

    // Step 3: Column-level analysis
    const columnMetrics = this.analyzeColumnConsistency(data, options.expectedColumns);

    // Step 4: Data-level validation
    const dataValidation = this.validateDataContent(
      data,
      options.columnTypes,
      options.language ?? 'en',
    );

    // Step 5: Detect issues
    const issues = this.detectQualityIssues(data, {
      rowMetrics,
      columnMetrics,
      dataValidation,
      strictMode,
    });

    // Step 6: Auto-fix issues if enabled
    let fixes: QualityFix[] = [];
    let fixedData = data;

    if (autoFix) {
      const fixResult = await this.autoFixIssues(data, issues);
      fixedData = fixResult.data;
      fixes = fixResult.fixes;
    }

    // Step 7: Calculate metrics
    const metrics = this.calculateMetrics(data, fixedData, {
      rowMetrics,
      columnMetrics,
      dataValidation,
      issues,
    });

    // Step 8: Generate report
    const report: QualityReport = {
      metrics,
      issues,
      fixes,
      summary: this.generateSummary(metrics),
      recommendations: this.generateRecommendations(metrics, issues),
    };

    this.logger.log(
      `Quality analysis completed: ${metrics.overallQuality.toFixed(
        3,
      )} overall quality, ${issues.length} issues, ${fixes.length} fixes applied`,
    );

    return report;
  }

  private validateDataStructure(data: string[][]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data is not an array');
    }

    if (data.length === 0) {
      errors.push('Data array is empty');
    }

    data.forEach((row, i) => {
      if (!Array.isArray(row)) {
        errors.push(`Row ${i} is not an array`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private analyzeRowQuality(data: string[][]): RowMetrics {
    const totalRows = data.length;
    let validRows = 0;
    let emptyRows = 0;
    const seenRows = new Set<string>();
    let duplicateRows = 0;

    for (const row of data) {
      if (!Array.isArray(row)) continue;

      const rowString = row.join('').trim();

      if (rowString.length === 0) {
        emptyRows++;
      } else {
        validRows++;
      }

      const rowKey = rowString.toLowerCase().replace(/\s+/g, ' ');
      if (seenRows.has(rowKey)) {
        duplicateRows++;
      }
      seenRows.add(rowKey);
    }

    const completeness = totalRows > 0 ? validRows / totalRows : 0;

    return {
      totalRows,
      validRows,
      emptyRows,
      duplicateRows,
      completeness,
    };
  }

  private analyzeColumnConsistency(data: string[][], expectedColumns?: number): ColumnMetrics {
    const columnCounts = data.map(row => (Array.isArray(row) ? row.length : 0));
    const avgColumns =
      columnCounts.reduce((sum, count) => sum + count, 0) / Math.max(columnCounts.length, 1);

    let columnConsistency = 1.0;
    if (data.length > 1 && avgColumns > 0) {
      const variance =
        columnCounts.reduce((sum, count) => sum + (count - avgColumns) ** 2, 0) /
        columnCounts.length;
      columnConsistency = Math.max(0, 1 - variance / avgColumns);
    }

    const missingColumns: string[] = [];
    if (expectedColumns && avgColumns < expectedColumns) {
      for (let i = avgColumns; i < expectedColumns; i++) {
        missingColumns.push(`column_${i + 1}`);
      }
    }

    const extraColumns =
      avgColumns > (expectedColumns ?? avgColumns)
        ? avgColumns - (expectedColumns ?? avgColumns)
        : 0;

    return {
      columnConsistency,
      expectedColumns: expectedColumns ?? Math.round(avgColumns),
      missingColumns,
      extraColumns,
    };
  }

  private validateDataContent(
    data: string[][],
    columnTypes?: string[],
    language = 'en',
  ): DataValidationMetrics {
    let totalDataPoints = 0;
    let validDataPoints = 0;
    let dateAccuracy = 0;
    let amountAccuracy = 0;
    let currencyConsistency = 0;

    const sampleSize = Math.min(100, data.length);
    const sample = data.slice(0, sampleSize);

    for (const row of sample) {
      if (!Array.isArray(row) || row.length === 0) continue;

      for (let i = 0; i < row.length && i < 10; i++) {
        const cell = row[i]?.toString().trim();
        if (!cell) continue;

        totalDataPoints++;

        if (columnTypes?.[i]) {
          const columnType = columnTypes[i];

          if (columnType === 'date') {
            const dateResult = normalizeDate(cell);
            if (dateResult) {
              dateAccuracy++;
              validDataPoints++;
            }
          } else if (columnType === 'amount') {
            const amountResult = normalizeNumberAdvanced(cell, language);
            if (amountResult !== null) {
              amountAccuracy++;
              validDataPoints++;
            }
          }
        }

        if (/[A-Z]{3}/.test(cell)) {
          currencyConsistency++;
          validDataPoints++;
        }
      }
    }

    return {
      dataAccuracy: totalDataPoints > 0 ? validDataPoints / totalDataPoints : 0,
      currencyConsistency,
      dateAccuracy,
      amountAccuracy,
    };
  }

  private detectQualityIssues(
    data: string[][],
    context: {
      rowMetrics: RowMetrics;
      columnMetrics: ColumnMetrics;
      dataValidation: DataValidationMetrics;
      strictMode: boolean;
    },
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Row-level issues
    if (context.rowMetrics.emptyRows > context.rowMetrics.totalRows * 0.1) {
      issues.push({
        type: 'missing_data',
        severity: 'medium',
        description: `${context.rowMetrics.emptyRows} empty rows detected (${(
          (context.rowMetrics.emptyRows / Math.max(context.rowMetrics.totalRows, 1)) * 100
        ).toFixed(1)}%)`,
        suggestion: 'Remove empty rows or add placeholder data',
      });
    }

    if (context.rowMetrics.duplicateRows > 0) {
      issues.push({
        type: 'duplicate_rows',
        severity: 'medium',
        description: `${context.rowMetrics.duplicateRows} duplicate rows detected`,
        suggestion: 'Remove duplicate rows or deduplicate based on key columns',
      });
    }

    // Column-level issues
    if (context.columnMetrics.columnConsistency < 0.8) {
      issues.push({
        type: 'inconsistent_columns',
        severity: 'high',
        description: `Column count varies significantly (consistency: ${(context.columnMetrics.columnConsistency * 100).toFixed(1)}%)`,
        suggestion: 'Standardize column structure or use flexible column detection',
      });
    }

    if (context.columnMetrics.missingColumns.length > 0) {
      issues.push({
        type: 'missing_columns',
        severity: 'high',
        description: `Missing expected columns: ${context.columnMetrics.missingColumns.join(', ')}`,
        suggestion: 'Add missing columns or adjust column detection rules',
      });
    }

    // Data-level issues
    if (context.dataValidation.dateAccuracy < 0.9) {
      issues.push({
        type: 'date_parse_error',
        severity: 'medium',
        description: `Date parsing accuracy: ${(context.dataValidation.dateAccuracy * 100).toFixed(1)}%`,
        suggestion: 'Improve date format detection or use flexible date parser',
      });
    }

    if (context.dataValidation.amountAccuracy < 0.9) {
      issues.push({
        type: 'amount_parse_error',
        severity: 'medium',
        description: `Amount parsing accuracy: ${(context.dataValidation.amountAccuracy * 100).toFixed(1)}%`,
        suggestion: 'Improve number format detection or handle multiple currency symbols',
      });
    }

    if (context.dataValidation.currencyConsistency < 0.8) {
      issues.push({
        type: 'currency_mismatch',
        severity: 'low',
        description: `Currency symbol inconsistency detected`,
        suggestion: 'Standardize currency symbols or extract currency to separate field',
      });
    }

    if (context.strictMode) {
      issues.forEach(issue => {
        if (issue.severity === 'medium') issue.severity = 'high';
        if (issue.severity === 'low') issue.severity = 'medium';
      });
    }

    return issues;
  }

  private async autoFixIssues(
    data: string[][],
    issues: QualityIssue[],
  ): Promise<{ data: string[][]; fixes: QualityFix[] }> {
    const fixes: QualityFix[] = [];
    let fixedData: string[][] = [...data];

    for (const issue of issues) {
      const fix = await this.fixIssue(fixedData, issue);
      if (fix) {
        fixes.push(fix);
        fixedData = fix.after;
      }
    }

    return { data: fixedData, fixes };
  }

  private async fixIssue(data: string[][], issue: QualityIssue): Promise<QualityFix | null> {
    switch (issue.type) {
      case 'missing_columns':
        return this.fixMissingColumns(data, issue);
      case 'inconsistent_columns':
        return this.fixColumnInconsistency(data);
      case 'empty_rows':
      case 'missing_data':
        return this.fixEmptyRows(data);
      case 'duplicate_rows':
        return this.fixDuplicateRows(data);
      default:
        return null; // placeholders for other issue types
    }
  }

  private async fixMissingColumns(
    data: string[][],
    issue: QualityIssue,
  ): Promise<QualityFix | null> {
    const missingColumns = issue.suggestion
      ? issue.suggestion
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];

    if (missingColumns.length === 0) return null;

    const fixedData = data.map(row => {
      if (!Array.isArray(row)) return row;
      const fixedRow = [...row];
      for (let i = 0; i < missingColumns.length; i++) {
        fixedRow.push('');
      }
      return fixedRow;
    });

    return {
      type: 'column_added',
      description: `Added ${missingColumns.length} missing columns`,
      before: data,
      after: fixedData,
    };
  }

  private async fixColumnInconsistency(data: string[][]): Promise<QualityFix | null> {
    const columnCounts = data.map(row => (Array.isArray(row) ? row.length : 0));
    if (columnCounts.length === 0) return null;

    const modeCount = this.calculateMode(columnCounts);
    const fixedData = data.map(row => {
      if (!Array.isArray(row)) return row;
      const currentLength = row.length;
      if (currentLength < modeCount) {
        return [...row, ...Array(modeCount - currentLength).fill('')];
      }
      if (currentLength > modeCount) {
        return row.slice(0, modeCount);
      }
      return row;
    });

    const adjusted = fixedData.filter(
      (row, idx) => Array.isArray(data[idx]) && row.length !== data[idx].length,
    ).length;

    return {
      type: 'data_corrected',
      description: `Adjusted ${adjusted} rows to match mode of ${modeCount} columns`,
      before: data,
      after: fixedData,
    };
  }

  private async fixEmptyRows(data: string[][]): Promise<QualityFix> {
    const fixedData = data.filter(row => {
      if (!Array.isArray(row)) return true;
      return row.join('').trim().length > 0;
    });

    return {
      type: 'row_removed',
      description: `Removed ${data.length - fixedData.length} empty rows`,
      before: data,
      after: fixedData,
    };
  }

  private async fixDuplicateRows(data: string[][]): Promise<QualityFix> {
    const seenRows = new Set<string>();
    const fixedData: string[][] = [];

    for (const row of data) {
      if (!Array.isArray(row)) {
        fixedData.push(row);
        continue;
      }

      const rowKey = row.join('').toLowerCase().replace(/\s+/g, ' ');
      if (!seenRows.has(rowKey)) {
        fixedData.push(row);
        seenRows.add(rowKey);
      }
    }

    return {
      type: 'row_removed',
      description: `Removed ${data.length - fixedData.length} duplicate rows`,
      before: data,
      after: fixedData,
    };
  }

  private calculateMode(values: number[]): number {
    const frequency: Record<number, number> = {};
    for (const value of values) {
      frequency[value] = (frequency[value] ?? 0) + 1;
    }

    let mode = values[0] ?? 0;
    let maxFrequency = 0;
    for (const [key, freq] of Object.entries(frequency)) {
      const numericKey = Number(key);
      if (freq > maxFrequency) {
        maxFrequency = freq;
        mode = numericKey;
      }
    }
    return mode;
  }

  private calculateMetrics(
    originalData: string[][],
    fixedData: string[][],
    context: {
      rowMetrics: RowMetrics;
      columnMetrics: ColumnMetrics;
      dataValidation: DataValidationMetrics;
      issues: QualityIssue[];
    },
  ): QualityMetrics {
    const improvementFactor =
      fixedData.length > 0 ? fixedData.length / Math.max(originalData.length, 1) : 1;

    const fixedRowMetrics = this.analyzeRowQuality(fixedData);
    const fixedColumnMetrics = this.analyzeColumnConsistency(
      fixedData,
      context.columnMetrics.expectedColumns,
    );
    const fixedDataValidation = this.validateDataContent(fixedData);

    const overallQuality =
      fixedRowMetrics.completeness * 0.3 +
      fixedColumnMetrics.columnConsistency * 0.3 +
      fixedDataValidation.dataAccuracy * 0.2 +
      improvementFactor * 0.2;

    return {
      totalRows: fixedData.length,
      validRows: fixedRowMetrics.validRows,
      emptyRows: fixedRowMetrics.emptyRows,
      duplicateRows: fixedRowMetrics.duplicateRows,
      completeness: fixedRowMetrics.completeness,
      columnConsistency: fixedColumnMetrics.columnConsistency,
      expectedColumns: fixedColumnMetrics.expectedColumns,
      missingColumns: fixedColumnMetrics.missingColumns,
      extraColumns: fixedColumnMetrics.extraColumns,
      dataAccuracy: fixedDataValidation.dataAccuracy,
      currencyConsistency: fixedDataValidation.currencyConsistency,
      dateAccuracy: fixedDataValidation.dateAccuracy,
      amountAccuracy: fixedDataValidation.amountAccuracy,
      overallQuality: Math.min(1, overallQuality),
      issues: context.issues,
    };
  }

  private generateSummary(metrics: QualityMetrics): string {
    const { overallQuality } = metrics;

    if (overallQuality >= 0.9) return 'Excellent data quality';
    if (overallQuality >= 0.8) return 'Good data quality';
    if (overallQuality >= 0.7) return 'Fair data quality';
    if (overallQuality >= 0.5) return 'Poor data quality';
    return 'Very poor data quality';
  }

  private generateRecommendations(metrics: QualityMetrics, issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];

    if (metrics.columnConsistency < 0.8) {
      recommendations.push('Consider standardizing column structure across all data sources');
    }

    if (metrics.completeness < 0.9) {
      recommendations.push('Improve data completeness by reducing empty or invalid rows');
    }

    if (metrics.dataAccuracy < 0.9) {
      recommendations.push('Enhance format detection and validation rules');
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical data quality issues before processing');
    }

    return recommendations;
  }
}
