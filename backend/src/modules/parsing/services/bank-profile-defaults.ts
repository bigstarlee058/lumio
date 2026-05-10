type ColumnType = 'date' | 'amount' | 'string' | 'number' | 'currency' | 'boolean';

type StatementColumn = {
  name: string;
  type: ColumnType;
  required: boolean;
  index: number;
};

type AmountFormat = {
  decimalSeparator: string;
  thousandsSeparator: string;
  currencyPosition: 'before' | 'after';
  currencySymbol?: string;
};

type StatementParsing = {
  format: 'csv' | 'excel' | 'pdf' | 'html' | 'auto';
  columns: StatementColumn[];
  dateFormat?: string;
  amountFormat?: AmountFormat;
  delimiter?: string;
  hasHeader?: boolean;
  skipRows?: number;
  reverseDebitCredit?: boolean;
  negativeInParentheses?: boolean;
};

type ProfileValidation = {
  requiredFields?: string[];
};

type ProfileQuality = {
  expectedColumns?: number;
  toleranceLevels?: {
    amount: number;
    date: number;
    balance: number;
  };
  checksumValidation?: boolean;
  duplicateDetection?: boolean;
};

type ProfileFeatures = {
  useMLClassification?: boolean;
  useAdvancedExtraction?: boolean;
  useAutoFix?: boolean;
  useChecksumValidation?: boolean;
  fallbackMode?: string;
};

type SharedProfileSections = {
  validation: ProfileValidation;
  quality: ProfileQuality;
  features: ProfileFeatures;
};

export interface StatementColumnOptions {
  includeDocumentNumber?: boolean;
  includeCounterpartyBin?: boolean;
  includeCurrency?: boolean;
}

export interface SharedProfileSectionOptions {
  expectedColumns: number;
  useMLClassification: boolean;
  fallbackMode: string;
}

export interface StatementParsingOptions {
  format: 'csv' | 'excel' | 'pdf' | 'html' | 'auto';
  columns: StatementColumn[];
  dateFormat?: string;
  amountFormat?: AmountFormat;
  delimiter?: string;
  hasHeader?: boolean;
  skipRows?: number;
  reverseDebitCredit?: boolean;
  negativeInParentheses?: boolean;
}

export const createStatementColumns = ({
  includeDocumentNumber = false,
  includeCounterpartyBin = false,
  includeCurrency = false,
}: StatementColumnOptions): StatementColumn[] => {
  const columns: StatementColumn[] = [
    { name: 'transactionDate', type: 'date', required: true, index: 0 },
  ];

  if (includeDocumentNumber) {
    columns.push({
      name: 'documentNumber',
      type: 'string',
      required: false,
      index: columns.length,
    });
  }

  columns.push({ name: 'counterpartyName', type: 'string', required: true, index: columns.length });

  if (includeCounterpartyBin) {
    columns.push({
      name: 'counterpartyBin',
      type: 'string',
      required: false,
      index: columns.length,
    });
  }

  columns.push(
    { name: 'debit', type: 'amount', required: false, index: columns.length },
    { name: 'credit', type: 'amount', required: false, index: columns.length + 1 },
    { name: 'paymentPurpose', type: 'string', required: true, index: columns.length + 2 },
  );

  if (includeCurrency) {
    columns.push({ name: 'currency', type: 'currency', required: false, index: columns.length });
  }

  return columns;
};

export const createStatementParsing = ({
  format,
  columns,
  dateFormat,
  amountFormat,
  delimiter,
  hasHeader,
  skipRows,
  reverseDebitCredit,
  negativeInParentheses,
}: StatementParsingOptions): StatementParsing => ({
  format,
  columns,
  dateFormat,
  amountFormat,
  delimiter,
  hasHeader,
  skipRows,
  reverseDebitCredit,
  negativeInParentheses,
});

export const createSharedProfileSections = ({
  expectedColumns,
  useMLClassification,
  fallbackMode,
}: SharedProfileSectionOptions): SharedProfileSections => ({
  validation: {
    requiredFields: ['transactionDate', 'counterpartyName', 'paymentPurpose'],
  },
  quality: {
    expectedColumns,
    toleranceLevels: {
      amount: 0.01,
      date: 1,
      balance: 0.02,
    },
    checksumValidation: true,
    duplicateDetection: true,
  },
  features: {
    useMLClassification,
    useAdvancedExtraction: true,
    useAutoFix: true,
    useChecksumValidation: true,
    fallbackMode,
  },
});

export const createAmountFormat = (
  decimalSeparator: string,
  thousandsSeparator: string,
  currencySymbol?: string,
): AmountFormat => ({
  decimalSeparator,
  thousandsSeparator,
  currencyPosition: 'after',
  currencySymbol,
});
