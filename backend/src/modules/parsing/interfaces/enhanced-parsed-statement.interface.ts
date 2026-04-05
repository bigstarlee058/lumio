import {
  ParsedStatement,
  ParsedStatementMetadata,
  ParsedTransaction,
} from './parsed-statement.interface';

// Enhanced metadata interfaces for better API response
export interface ExtractedMetadata {
  rawHeader: string;
  normalizedHeader: string;
  statementType: string;
  confidence: number;
  extractionMethod: 'regex' | 'heuristic' | 'ml' | 'hybrid';

  // Enhanced header information
  headerInfo?: {
    title?: string;
    subtitle?: string;
    documentType?: string;
    language?: string;
    locale?: string;
  };

  // Statement identification
  statementId?: string;
  sequenceNumber?: number;

  // Additional extracted fields
  customFields?: Record<string, unknown>;
}

type TransformationValue = string | number | boolean | Date | null | undefined | Record<string, unknown>;

export interface StatementPeriod {
  dateFrom: Date;
  dateTo: Date;
  label: string;
  days: number;
}

export interface AccountInfo {
  number: string;
  name?: string;
  type?: string;
  iban?: string;
  masked?: string; // For security: ****1234
}

export interface InstitutionInfo {
  name: string;
  displayName?: string;
  branch?: string;
  bic?: string;
  swift?: string;
  country?: string;
  city?: string;
}

export interface CurrencyInfo {
  code: string;
  symbol?: string;
  name?: string;
  isMultiCurrency: boolean;
  supportedCurrencies?: string[];
}

export interface ProcessingInfo {
  parser: string;
  format: string;
  encoding?: string;
  delimiter?: string;
  hasHeader: boolean;
  rowCount: number;
  processingTime: number;
  timestamp: Date;
}

export interface QualityMetrics {
  overallScore: number;
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  validationScore: number;
  issues: QualityIssue[];
  warnings: QualityWarning[];
}

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  rowNumber?: number;
  description: string;
  autoFixed: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface QualityWarning {
  type: string;
  message: string;
  recommendation?: string;
  affectedRows?: number;
}

export interface NormalizationInfo {
  applied: boolean;
  transformations: Transformation[];
  duplicatesRemoved: number;
  fieldsAdded: string[];
  fieldsCorrected: string[];
  confidence: number;
}

export interface Transformation {
  field: string;
  type: 'format' | 'type' | 'value' | 'extraction';
  before: TransformationValue;
  after: TransformationValue;
  confidence: number;
}

export interface ValidationInfo {
  passed: boolean;
  checks: ValidationCheck[];
  errors: ValidationError[];
  checksumValid: boolean;
  controlTotals: ControlTotal[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  threshold?: number;
  actual?: number;
}

export interface ValidationError {
  field?: string;
  row?: number;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  autoFixed: boolean;
}

export interface ControlTotal {
  type: 'debit_total' | 'credit_total' | 'balance_total' | 'turnover_total';
  expected?: number;
  actual?: number;
  difference?: number;
  source: string;
  valid: boolean;
}

export interface FeatureFlags {
  enabled: string[];
  disabled: string[];
  custom: Record<string, boolean>;
  fallbackStrategy: string;
}

export interface BankProfileInfo {
  id: string;
  name: string;
  displayName: string;
  country: string;
  currency: string;
  version: string;
  confidence: number;
  matchedPatterns: string[];
}

export interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errorRows: number;
  duplicatesRemoved: number;
  autoFixedRows: number;
  processingTime: number;
  memoryUsage?: number;
}

export interface EnhancedParsedStatementMetadata extends ParsedStatementMetadata {
  // Enhanced extracted metadata
  extractedMetadata: ExtractedMetadata;

  // Enhanced period information
  period: StatementPeriod;

  // Enhanced account information
  accountInfo: AccountInfo;

  // Enhanced institution information
  institutionInfo: InstitutionInfo;

  // Enhanced currency information
  currencyInfo: CurrencyInfo;

  // Processing information
  processingInfo: ProcessingInfo;

  // Quality metrics
  qualityMetrics: QualityMetrics;

  // Normalization information
  normalizationInfo: NormalizationInfo;

  // Validation information
  validationInfo: ValidationInfo;

  // Feature flags used
  featureFlags: FeatureFlags;

  // Bank profile information
  bankProfileInfo: BankProfileInfo;

  // Processing statistics
  processingStats: ProcessingStats;
}

// Enhanced parsed statement interface for API responses
export interface EnhancedParsedStatement {
  // Original data
  id?: string;
  metadata: EnhancedParsedStatementMetadata;
  transactions: ParsedTransaction[];

  // Additional API response fields
  success: boolean;
  message?: string;
  requestId?: string;
  processingVersion: string;

  // Optional additional data
  rawPreview?: string;
  debugInfo?: DebugInfo;
  recommendations?: ProcessingRecommendation[];
}

export interface DebugInfo {
  parserSteps: ParserStep[];
  featureFlags: Record<string, unknown>;
  intermediateResults: unknown;
  errors: unknown[];
  warnings: unknown[];
  performance: PerformanceInfo;
}

export interface ParserStep {
  step: string;
  status: 'success' | 'warning' | 'error';
  duration: number;
  input?: unknown;
  output?: unknown;
  details?: unknown;
}

export interface PerformanceInfo {
  totalTime: number;
  parsingTime: number;
  extractionTime: number;
  normalizationTime: number;
  validationTime: number;
  memoryPeak: number;
  timestamp: Date;
}

export interface ProcessingRecommendation {
  type: 'data_quality' | 'format' | 'configuration' | 'user_action';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action?: string;
  impact?: string;
  autoApplicable: boolean;
}

// Response DTOs for different API endpoints
export interface StatementParsingResponse {
  success: boolean;
  data: EnhancedParsedStatement;
  message?: string;
  warnings?: string[];
  requestId?: string;
}

export interface StatementValidationResponse {
  valid: boolean;
  qualityScore: number;
  issues: QualityIssue[];
  recommendations: ProcessingRecommendation[];
  summary: {
    totalTransactions: number;
    validTransactions: number;
    issuesBySeverity: Record<string, number>;
  };
}

export interface StatementNormalizationResponse {
  normalized: boolean;
  originalCount: number;
  normalizedCount: number;
  duplicatesRemoved: number;
  fieldsAdded: number;
  fieldsCorrected: number;
  qualityScore: number;
  transformations: Transformation[];
}

export interface StatementMetadataResponse {
  success: boolean;
  metadata: EnhancedParsedStatementMetadata;
  confidence: number;
  extractionMethod: string;
  appliedRules: string[];
  unmatchedFields: string[];
}

export interface StatementQualityResponse {
  overallScore: number;
  breakdown: {
    completeness: number;
    accuracy: number;
    consistency: number;
    validation: number;
  };
  issues: QualityIssue[];
  trends: QualityTrend[];
  recommendations: ProcessingRecommendation[];
}

export interface QualityTrend {
  date: string;
  score: number;
  category: string;
  change?: number;
}

export interface BankProfileDetectionResponse {
  detected: boolean;
  profile: BankProfileInfo;
  confidence: number;
  matchedPatterns: string[];
  alternativeProfiles: BankProfileInfo[];
}

// Utility interfaces for request/response mapping
export interface ParsingRequest {
  file?: Express.Multer.File;
  content?: string;
  format?: string;
  bankId?: string;
  locale?: string;
  options?: ParsingOptions;
}

export interface ParsingOptions {
  strictMode?: boolean;
  autoFix?: boolean;
  validateChecksums?: boolean;
  removeDuplicates?: boolean;
  extractMetadata?: boolean;
  useML?: boolean;
  fallbackMode?: string;
  customFlags?: Record<string, boolean>;
}

export interface BatchParsingRequest extends ParsingRequest {
  files: Express.Multer.File[];
  parallelProcessing?: boolean;
  maxConcurrency?: number;
}

export interface BatchParsingResponse {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: StatementParsingResponse[];
  summary: BatchProcessingSummary;
  warnings?: string[];
}

export interface BatchProcessingSummary {
  averageQualityScore: number;
  averageProcessingTime: number;
  totalTransactions: number;
  totalDuplicatesRemoved: number;
  commonIssues: string[];
  processingErrors: string[];
}

// Export and import interfaces
export interface StatementExportRequest {
  format: 'json' | 'csv' | 'excel' | 'xml' | 'yaml';
  includeMetadata?: boolean;
  includeQualityMetrics?: boolean;
  filter?: ExportFilter;
  options?: ExportOptions;
}

export interface ExportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  counterparty?: string;
  type?: 'debit' | 'credit';
  currency?: string;
}

export interface ExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  encoding?: string;
  delimiter?: string;
  prettyPrint?: boolean;
}

export interface StatementExportResponse {
  success: boolean;
  format: string;
  data?: string | Buffer;
  filename?: string;
  mimeType?: string;
  size?: number;
  exportedAt: Date;
  recordCount?: number;
}

// Real-time processing interfaces
export interface ProcessingUpdate {
  id: string;
  status:
    | 'started'
    | 'parsing'
    | 'extracting'
    | 'normalizing'
    | 'validating'
    | 'completed'
    | 'error';
  progress: number; // 0-100
  step?: string;
  details?: unknown;
  timestamp: Date;
}

export interface ProcessingWebSocketMessage {
  type: 'status' | 'progress' | 'result' | 'error';
  id: string;
  data: ProcessingUpdate | EnhancedParsedStatement | Error;
}

// Quality thresholds and scoring
export interface QualityThresholds {
  excellent: number; // 95+
  good: number; // 85-94
  fair: number; // 70-84
  poor: number; // <70
}

export interface ScoringWeights {
  completeness: number; // 0.3
  accuracy: number; // 0.3
  consistency: number; // 0.2
  validation: number; // 0.2
}

// Constants for scoring
const QUALITY_THRESHOLDS: QualityThresholds = {
  excellent: 95,
  good: 85,
  fair: 70,
  poor: 0,
};

const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  completeness: 0.3,
  accuracy: 0.3,
  consistency: 0.2,
  validation: 0.2,
};

// Helper types for type guards
export type StatementField = keyof ParsedTransaction;
export type MetadataField = keyof EnhancedParsedStatementMetadata;
export type QualityCategory = 'completeness' | 'accuracy' | 'consistency' | 'validation';
export type ProcessingPhase = 'parsing' | 'extraction' | 'normalization' | 'validation' | 'export';

// Utility functions for DTO validation
function isValidParsedStatement(obj: unknown): obj is EnhancedParsedStatement {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'metadata' in obj &&
    'transactions' in obj &&
    'success' in obj &&
    Array.isArray(obj.transactions) &&
    typeof obj.success === 'boolean'
  );
}

function isValidProcessingRequest(obj: unknown): obj is ParsingRequest {
  return !!obj && typeof obj === 'object' && ('file' in obj || 'content' in obj);
}

function calculateOverallQuality(
  completeness: number,
  accuracy: number,
  consistency: number,
  validation: number,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): number {
  return Math.round(
    completeness * weights.completeness +
      accuracy * weights.accuracy +
      consistency * weights.consistency +
      validation * weights.validation,
  );
}

function getQualityCategory(
  score: number,
  thresholds: QualityThresholds = QUALITY_THRESHOLDS,
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= thresholds.excellent) return 'excellent';
  if (score >= thresholds.good) return 'good';
  if (score >= thresholds.fair) return 'fair';
  return 'poor';
}

function formatAmountForDisplay(
  amount: number,
  currency?: string,
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateForDisplay(
  date: Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }).format(date);
}
