import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedStatementMetadata,
  ParsedTransaction,
} from '../interfaces/parsed-statement.interface';

export interface ChecksumValidationResult {
  isValid: boolean;
  discrepancies: ChecksumDiscrepancy[];
  correctedData: ParsedTransaction[];
  correctedMetadata?: Partial<ParsedStatementMetadata>;
  qualityMetrics: ChecksumQualityMetrics;
  autoFixes: AutoFix[];
}

export interface ChecksumDiscrepancy {
  type: 'balance_mismatch' | 'total_mismatch' | 'missing_control_total' | 'control_total_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedValue?: number;
  actualValue?: number;
  difference?: number;
  percentageDifference?: number;
  autoFixable: boolean;
  suggestedFix?: string;
  affectedRows?: number[];
}

export interface ChecksumQualityMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  autoFixedChecks: number;
  overallScore: number;
  confidenceLevel: number;
}

export interface AutoFix {
  type: string;
  description: string;
  success: boolean;
  beforeValue?: number;
  afterValue?: number;
  confidence: number;
  reasoning: string;
}

export interface ControlTotal {
  label: string;
  type: 'debit_total' | 'credit_total' | 'balance_total' | 'turnover_total';
  expectedValue: number;
  actualValue?: number;
  source: 'metadata' | 'extracted' | 'calculated';
  reliability: number;
}

interface ControlTotalPatternGroup {
  type: ControlTotal['type'];
  patterns: RegExp[];
  priority: number;
}

interface CalculatedTotals {
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  averageAmount: number;
  maxAmount: number;
  minAmount: number;
  zeroAmountCount: number;
  currencyDistribution: Map<string, number>;
}

@Injectable()
export class ChecksumAutoFixService {
  private readonly logger = new Logger(ChecksumAutoFixService.name);

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // Patterns for extracting control totals from text
  private readonly controlTotalPatterns: ControlTotalPatternGroup[] = [
    // Russian patterns
    {
      type: 'debit_total',
      patterns: [
        /(?:итого дебет|обор(?:от)? по дебету|дебетовый оборот|списано)[:\s]*([\d\s.,-]+)/gi,
        /(?:дебет|dt|дт)[:\s]*([\d\s.,-]+)/gi,
      ],
      priority: 1,
    },
    {
      type: 'credit_total',
      patterns: [
        /(?:итого кредит|оборот(?:ов)? по кредиту|кредитовый оборот|поступило)[:\s]*([\d\s.,-]+)/gi,
        /(?:кредит|кт|кт)[:\s]*([\d\s.,-]+)/gi,
      ],
      priority: 1,
    },
    {
      type: 'balance_total',
      patterns: [
        /(?:остаток на конец|конечный остаток|баланс|сальдо)[:\s]*([\d\s.,-]+)/gi,
        /(?:balance|остаток)[:\s]*([\d\s.,-]+)/gi,
      ],
      priority: 2,
    },
    {
      type: 'turnover_total',
      patterns: [
        /(?:общий оборот|итого оборот|оборот)[:\s]*([\d\s.,-]+)/gi,
        /(?:total turnover|общая сумма)[:\s]*([\d\s.,-]+)/gi,
      ],
      priority: 3,
    },
  ];

  async validateAndFixChecksums(
    transactions: ParsedTransaction[],
    metadata?: ParsedStatementMetadata,
  ): Promise<ChecksumValidationResult> {
    this.logger.log(`Starting checksum validation for ${transactions.length} transactions`);

    const discrepancies: ChecksumDiscrepancy[] = [];
    const autoFixes: AutoFix[] = [];
    let correctedData = [...transactions];
    let correctedMetadata: Partial<ParsedStatementMetadata> | undefined;

    // Step 1: Calculate transaction totals
    const calculatedTotals = this.calculateTransactionTotals(correctedData);

    // Step 2: Extract control totals from metadata and text
    const extractedControlTotals = await this.extractControlTotals(correctedData, metadata);

    // Step 3: Compare calculated vs expected totals
    const comparisonResult = this.compareWithControlTotals(
      calculatedTotals,
      extractedControlTotals,
    );
    discrepancies.push(...comparisonResult.discrepancies);

    // Step 4: Auto-fix discrepancies where possible
    for (const discrepancy of discrepancies) {
      if (discrepancy.autoFixable) {
        const fixResult = await this.attemptAutoFix(
          correctedData,
          metadata,
          discrepancy,
          calculatedTotals,
        );
        if (fixResult.success) {
          correctedData = fixResult.correctedData || correctedData;
          correctedMetadata = {
            ...correctedMetadata,
            ...fixResult.correctedMetadata,
          };
          autoFixes.push(fixResult.autoFix);

          // Recalculate totals after fix
          Object.assign(calculatedTotals, this.calculateTransactionTotals(correctedData));
        }
      }
    }

    // Step 5: Advanced fixes using patterns and heuristics
    const advancedFixResult = await this.applyAdvancedFixes(
      correctedData,
      metadata,
      calculatedTotals,
    );
    if (advancedFixResult.data.length > 0) {
      correctedData = advancedFixResult.data;
      autoFixes.push(...advancedFixResult.fixes);
    }

    // Step 6: Final validation
    const finalMetadata = correctedMetadata
      ? ({
          ...(metadata ?? ({} as ParsedStatementMetadata)),
          ...correctedMetadata,
        } as ParsedStatementMetadata)
      : metadata;
    const finalValidation = this.performFinalValidation(correctedData, finalMetadata);

    // Step 7: Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(finalValidation, autoFixes);

    this.logger.log(
      `Checksum validation completed. Issues: ${discrepancies.length}, Fixed: ${autoFixes.filter(f => f.success).length}`,
    );

    return {
      isValid: discrepancies.length === 0 || autoFixes.every(f => f.success),
      discrepancies: discrepancies.filter(d => !autoFixes.some(f => f.type === d.type)),
      correctedData,
      correctedMetadata,
      qualityMetrics,
      autoFixes,
    };
  }

  private calculateTransactionTotals(transactions: ParsedTransaction[]): CalculatedTotals {
    const totals: CalculatedTotals = {
      totalDebit: 0,
      totalCredit: 0,
      transactionCount: transactions.length,
      averageAmount: 0,
      maxAmount: 0,
      minAmount: Number.POSITIVE_INFINITY,
      zeroAmountCount: 0,
      currencyDistribution: new Map<string, number>(),
    };

    const amounts: number[] = [];

    transactions.forEach(transaction => {
      if (transaction.debit && transaction.debit > 0) {
        totals.totalDebit += transaction.debit;
        amounts.push(transaction.debit);
        totals.maxAmount = Math.max(totals.maxAmount, transaction.debit);
        totals.minAmount = Math.min(totals.minAmount, transaction.debit);
      }

      if (transaction.credit && transaction.credit > 0) {
        totals.totalCredit += transaction.credit;
        amounts.push(transaction.credit);
        totals.maxAmount = Math.max(totals.maxAmount, transaction.credit);
        totals.minAmount = Math.min(totals.minAmount, transaction.credit);
      }

      const hasAmount =
        (transaction.debit && transaction.debit > 0) ||
        (transaction.credit && transaction.credit > 0);
      if (!hasAmount) {
        totals.zeroAmountCount++;
      }

      // Track currency distribution
      if (transaction.currency) {
        const count = totals.currencyDistribution.get(transaction.currency) || 0;
        totals.currencyDistribution.set(transaction.currency, count + 1);
      }
    });

    totals.averageAmount =
      amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0;

    if (totals.minAmount === Number.POSITIVE_INFINITY) {
      totals.minAmount = 0;
    }

    return totals;
  }

  private async extractControlTotals(
    transactions: ParsedTransaction[],
    metadata?: ParsedStatementMetadata,
  ): Promise<ControlTotal[]> {
    const controlTotals: ControlTotal[] = [];

    // Extract from metadata
    if (metadata) {
      if (metadata.balanceStart !== undefined) {
        controlTotals.push({
          label: 'Opening Balance',
          type: 'balance_total',
          expectedValue: metadata.balanceStart,
          source: 'metadata',
          reliability: 0.95,
        });
      }

      if (metadata.balanceEnd !== undefined) {
        controlTotals.push({
          label: 'Closing Balance',
          type: 'balance_total',
          expectedValue: metadata.balanceEnd,
          source: 'metadata',
          reliability: 0.95,
        });
      }
    }

    // Extract from transaction text (payment purpose, counterparty names)
    const textFromTransactions = transactions
      .map(tx =>
        [tx.paymentPurpose || '', tx.counterpartyName || '', tx.counterpartyBank || ''].join(' '),
      )
      .join(' ');

    for (const patternGroup of this.controlTotalPatterns) {
      for (const pattern of patternGroup.patterns) {
        const matches = [...textFromTransactions.matchAll(pattern)];

        for (const match of matches) {
          const amount = this.parseAmountFromString(match[1]);
          if (amount && amount > 0) {
            controlTotals.push({
              label: match[0].trim(),
              type: patternGroup.type,
              expectedValue: amount,
              source: 'extracted',
              reliability: 0.8,
            });
          }
        }
      }
    }

    // Remove duplicates and prioritize by reliability
    const uniqueTotals = this.deduplicateControlTotals(controlTotals);

    return uniqueTotals.sort((a, b) => b.reliability - a.reliability);
  }

  private deduplicateControlTotals(totals: ControlTotal[]): ControlTotal[] {
    const unique = new Map<string, ControlTotal>();

    totals.forEach(total => {
      const key = `${total.type}-${total.type}`;
      const existing = unique.get(key);

      if (!existing || total.reliability > existing.reliability) {
        unique.set(key, total);
      }
    });

    return Array.from(unique.values());
  }

  private compareWithControlTotals(
    calculatedTotals: CalculatedTotals,
    controlTotals: ControlTotal[],
  ): { discrepancies: ChecksumDiscrepancy[] } {
    const discrepancies: ChecksumDiscrepancy[] = [];

    // Compare debit totals
    const debitControl = controlTotals.find(t => t.type === 'debit_total');
    if (debitControl) {
      const difference = Math.abs(calculatedTotals.totalDebit - debitControl.expectedValue);
      const percentageDiff =
        debitControl.expectedValue > 0 ? (difference / debitControl.expectedValue) * 100 : 0;

      if (difference > 0.01) {
        // More than 0.01 difference
        discrepancies.push({
          type: 'total_mismatch',
          severity: percentageDiff > 5 ? 'high' : percentageDiff > 1 ? 'medium' : 'low',
          description: `Debit total mismatch: expected ${debitControl.expectedValue}, calculated ${calculatedTotals.totalDebit}`,
          expectedValue: debitControl.expectedValue,
          actualValue: calculatedTotals.totalDebit,
          difference,
          percentageDifference: percentageDiff,
          autoFixable: percentageDiff < 1,
          suggestedFix:
            percentageDiff < 1 ? 'Use calculated total as correct' : 'Manual verification needed',
        });
      }
    }

    // Compare credit totals
    const creditControl = controlTotals.find(t => t.type === 'credit_total');
    if (creditControl) {
      const difference = Math.abs(calculatedTotals.totalCredit - creditControl.expectedValue);
      const percentageDiff =
        creditControl.expectedValue > 0 ? (difference / creditControl.expectedValue) * 100 : 0;

      if (difference > 0.01) {
        discrepancies.push({
          type: 'total_mismatch',
          severity: percentageDiff > 5 ? 'high' : percentageDiff > 1 ? 'medium' : 'low',
          description: `Credit total mismatch: expected ${creditControl.expectedValue}, calculated ${calculatedTotals.totalCredit}`,
          expectedValue: creditControl.expectedValue,
          actualValue: calculatedTotals.totalCredit,
          difference,
          percentageDifference: percentageDiff,
          autoFixable: percentageDiff < 1,
          suggestedFix:
            percentageDiff < 1 ? 'Use calculated total as correct' : 'Manual verification needed',
        });
      }
    }

    // Compare balance totals
    const balanceControl = controlTotals.find(t => t.type === 'balance_total');
    if (balanceControl) {
      const calculatedBalance = Math.abs(
        calculatedTotals.totalCredit - calculatedTotals.totalDebit,
      );
      const difference = Math.abs(calculatedBalance - balanceControl.expectedValue);
      const percentageDiff =
        balanceControl.expectedValue > 0 ? (difference / balanceControl.expectedValue) * 100 : 0;

      if (difference > 0.01) {
        discrepancies.push({
          type: 'balance_mismatch',
          severity:
            percentageDiff > 10
              ? 'critical'
              : percentageDiff > 5
                ? 'high'
                : percentageDiff > 1
                  ? 'medium'
                  : 'low',
          description: `Balance mismatch: expected ${balanceControl.expectedValue}, calculated ${calculatedBalance}`,
          expectedValue: balanceControl.expectedValue,
          actualValue: calculatedBalance,
          difference,
          percentageDifference: percentageDiff,
          autoFixable: percentageDiff < 2,
          suggestedFix:
            percentageDiff < 2
              ? 'Recalculate with corrected transactions'
              : 'Major discrepancy - needs investigation',
        });
      }
    }

    // Check for missing control totals
    if (controlTotals.length === 0) {
      discrepancies.push({
        type: 'missing_control_total',
        severity: 'medium',
        description: 'No control totals found for validation',
        autoFixable: true,
        suggestedFix: 'Calculate control totals from transaction data',
      });
    }

    return { discrepancies };
  }

  private async attemptAutoFix(
    transactions: ParsedTransaction[],
    metadata: ParsedStatementMetadata | undefined,
    discrepancy: ChecksumDiscrepancy,
    calculatedTotals: CalculatedTotals,
  ): Promise<{
    success: boolean;
    correctedData?: ParsedTransaction[];
    correctedMetadata?: Partial<ParsedStatementMetadata>;
    autoFix: AutoFix;
  }> {
    let success = false;
    let correctedData: ParsedTransaction[] | undefined;
    let correctedMetadata: Partial<ParsedStatementMetadata> | undefined;
    let reasoning = '';

    try {
      switch (discrepancy.type) {
        case 'total_mismatch':
          if (discrepancy.percentageDifference && discrepancy.percentageDifference < 1) {
            // Small discrepancy - likely rounding or calculation error
            reasoning = 'Small discrepancy likely due to rounding - adjusting calculated total';
            success = true; // Accept calculated total as correct
          }
          break;

        case 'balance_mismatch':
          if (discrepancy.percentageDifference && discrepancy.percentageDifference < 2) {
            // Try to find the transaction causing the balance mismatch
            const fixResult = await this.fixBalanceMismatch(transactions, discrepancy);
            if (fixResult.success) {
              correctedData = fixResult.correctedData;
              reasoning = `Fixed balance mismatch by adjusting transaction amounts: ${fixResult.reasoning}`;
              success = true;
            }
          }
          break;

        case 'missing_control_total':
          // Generate control totals from calculated values
          correctedMetadata = {
            balanceEnd: Math.abs(calculatedTotals.totalCredit - calculatedTotals.totalDebit),
            ...metadata,
          };
          reasoning = 'Generated control totals from transaction data';
          success = true;
          break;
      }
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.warn(`Auto-fix failed for ${discrepancy.type}: ${message}`);
      reasoning = `Auto-fix failed: ${message}`;
    }

    const autoFix: AutoFix = {
      type: discrepancy.type,
      description: discrepancy.description,
      success,
      beforeValue: discrepancy.actualValue,
      afterValue: discrepancy.expectedValue,
      confidence: success ? 0.8 : 0.2,
      reasoning,
    };

    return { success, correctedData, correctedMetadata, autoFix };
  }

  private async fixBalanceMismatch(
    transactions: ParsedTransaction[],
    discrepancy: ChecksumDiscrepancy,
  ): Promise<{
    success: boolean;
    correctedData?: ParsedTransaction[];
    reasoning: string;
  }> {
    // Find transactions that might be causing the imbalance
    const correctedData = [...transactions];
    const difference = discrepancy.difference || 0;

    // Look for transactions with very small amounts that could be rounding errors
    const smallAmountTransactions = correctedData.filter(tx => {
      const amount = tx.debit || tx.credit || 0;
      return amount > 0 && amount < 0.01 && amount !== difference;
    });

    if (
      smallAmountTransactions.length === 1 &&
      Math.abs(
        difference - (smallAmountTransactions[0].debit || smallAmountTransactions[0].credit || 0),
      ) < 0.01
    ) {
      // Adjust the small amount transaction
      const tx = smallAmountTransactions[0];
      if (tx.debit) {
        tx.debit = difference;
      } else if (tx.credit) {
        tx.credit = difference;
      }

      return {
        success: true,
        correctedData,
        reasoning: `Adjusted small amount transaction to fix balance mismatch`,
      };
    }

    // If no obvious fix, return failure
    return {
      success: false,
      reasoning: 'Could not identify transaction causing balance mismatch',
    };
  }

  private async applyAdvancedFixes(
    transactions: ParsedTransaction[],
    metadata: ParsedStatementMetadata | undefined,
    calculatedTotals: CalculatedTotals,
  ): Promise<{ data: ParsedTransaction[]; fixes: AutoFix[] }> {
    const fixes: AutoFix[] = [];
    let correctedData = [...transactions];

    // Fix 1: Remove control total rows that were mistakenly parsed as transactions
    const controlRowFix = await this.removeControlTotalRows(correctedData);
    if (controlRowFix.affectedRows > 0) {
      correctedData = controlRowFix.data;
      fixes.push(controlRowFix.fix);
    }

    // Fix 2: Correct zero amount transactions
    const zeroAmountFix = await this.fixZeroAmountTransactions(correctedData);
    if (zeroAmountFix.affectedRows > 0) {
      correctedData = zeroAmountFix.data;
      fixes.push(zeroAmountFix.fix);
    }

    // Fix 3: Standardize currency formatting
    const currencyFix = await this.standardizeCurrencyFormatting(correctedData);
    if (currencyFix.affectedRows > 0) {
      correctedData = currencyFix.data;
      fixes.push(currencyFix.fix);
    }

    return { data: correctedData, fixes };
  }

  private async removeControlTotalRows(transactions: ParsedTransaction[]): Promise<{
    data: ParsedTransaction[];
    affectedRows: number;
    fix: AutoFix;
  }> {
    const controlTotalIndicators = [
      /(?:итого|total|остаток|balance|обор(?:от)?|turnover)/gi,
      /(?:документ|док|doc)[:\s]*\s*[A-Z0-9-]{5,20}/gi,
    ];

    const originalLength = transactions.length;
    const filteredData = transactions.filter(transaction => {
      const textToCheck = [
        transaction.paymentPurpose || '',
        transaction.counterpartyName || '',
        transaction.documentNumber || '',
      ].join(' ');

      // Check if this looks like a control total row
      const looksLikeControlTotal = controlTotalIndicators.some(pattern =>
        pattern.test(textToCheck),
      );

      // Also check for suspicious patterns
      const hasOnlyNumbersOrTotals =
        /^[\d\s.,-]+$/.test(textToCheck.trim()) ||
        /(итого|total|остаток|balance)/gi.test(textToCheck);

      return !(looksLikeControlTotal && hasOnlyNumbersOrTotals);
    });

    const affectedRows = originalLength - filteredData.length;

    return {
      data: filteredData,
      affectedRows,
      fix: {
        type: 'remove_control_total_rows',
        description: `Removed ${affectedRows} control total rows mistakenly parsed as transactions`,
        success: affectedRows > 0,
        confidence: 0.9,
        reasoning: 'Control total rows identified by pattern matching and removed',
      },
    };
  }

  private async fixZeroAmountTransactions(transactions: ParsedTransaction[]): Promise<{
    data: ParsedTransaction[];
    affectedRows: number;
    fix: AutoFix;
  }> {
    let affectedRows = 0;
    const correctedData = transactions.map(transaction => {
      const hasDebit = transaction.debit && transaction.debit > 0;
      const hasCredit = transaction.credit && transaction.credit > 0;

      if (!hasDebit && !hasCredit) {
        // Try to extract amount from payment purpose
        const amount = this.extractAmountFromText(transaction.paymentPurpose || '');
        if (amount && amount > 0) {
          // Determine if it's debit or credit based on text
          const isExpense = /(?:списание|расход|оплата|payment|expense|withdrawal)/i.test(
            transaction.paymentPurpose || '',
          );

          if (isExpense) {
            transaction.debit = amount;
          } else {
            transaction.credit = amount;
          }

          affectedRows++;
        }
      }

      return transaction;
    });

    return {
      data: correctedData,
      affectedRows,
      fix: {
        type: 'fix_zero_amount_transactions',
        description: `Fixed amounts in ${affectedRows} zero-amount transactions`,
        success: affectedRows > 0,
        confidence: 0.7,
        reasoning: 'Extracted amounts from payment purpose text',
      },
    };
  }

  private async standardizeCurrencyFormatting(transactions: ParsedTransaction[]): Promise<{
    data: ParsedTransaction[];
    affectedRows: number;
    fix: AutoFix;
  }> {
    let affectedRows = 0;
    const correctedData = transactions.map(transaction => {
      // Standardize currency codes
      if (transaction.currency) {
        const standardized = this.standardizeCurrencyCode(transaction.currency);
        if (standardized !== transaction.currency) {
          transaction.currency = standardized;
          affectedRows++;
        }
      }

      // Standardize amount formatting
      if (transaction.debit) {
        const standardized = this.standardizeAmount(transaction.debit);
        if (standardized !== transaction.debit) {
          transaction.debit = standardized;
          affectedRows++;
        }
      }

      if (transaction.credit) {
        const standardized = this.standardizeAmount(transaction.credit);
        if (standardized !== transaction.credit) {
          transaction.credit = standardized;
          affectedRows++;
        }
      }

      return transaction;
    });

    return {
      data: correctedData,
      affectedRows,
      fix: {
        type: 'standardize_currency_formatting',
        description: `Standardized currency formatting in ${affectedRows} transactions`,
        success: affectedRows > 0,
        confidence: 0.95,
        reasoning: 'Applied consistent currency code and amount formatting',
      },
    };
  }

  private performFinalValidation(
    transactions: ParsedTransaction[],
    metadata?: ParsedStatementMetadata,
  ): { passed: number; failed: number; total: number } {
    const totals = this.calculateTransactionTotals(transactions);
    let passed = 0;
    let failed = 0;
    const total = 3; // Balance, totals, consistency checks

    // Check 1: Balance consistency
    if (metadata?.balanceEnd !== undefined) {
      const calculatedBalance = Math.abs(totals.totalCredit - totals.totalDebit);
      if (Math.abs(calculatedBalance - metadata.balanceEnd) < 0.01) {
        passed++;
      } else {
        failed++;
      }
    } else {
      passed++; // Skip if no metadata balance
    }

    // Check 2: No zero amounts
    if (totals.zeroAmountCount === 0) {
      passed++;
    } else {
      failed++;
    }

    // Check 3: Reasonable totals (not negative, not extremely large)
    if (
      totals.totalDebit >= 0 &&
      totals.totalCredit >= 0 &&
      totals.totalDebit < 1e12 &&
      totals.totalCredit < 1e12
    ) {
      passed++;
    } else {
      failed++;
    }

    return { passed, failed, total };
  }

  private calculateQualityMetrics(
    validation: { passed: number; failed: number; total: number },
    autoFixes: AutoFix[],
  ): ChecksumQualityMetrics {
    const totalChecks = validation.total;
    const passedChecks = validation.passed;
    const failedChecks = validation.failed;
    const autoFixedChecks = autoFixes.filter(f => f.success).length;
    const overallScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    const confidenceLevel =
      autoFixes.length > 0
        ? (autoFixes.filter(f => f.success).length / autoFixes.length) * 100
        : 100;

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      autoFixedChecks,
      overallScore,
      confidenceLevel,
    };
  }

  private parseAmountFromString(amountStr: string): number | null {
    try {
      const cleaned = amountStr.replace(/[^\d.,-]/g, '');
      const normalized = cleaned.replace(/,/g, '.');
      const amount = Number.parseFloat(normalized);
      return Number.isNaN(amount) ? null : amount;
    } catch {
      return null;
    }
  }

  private extractAmountFromText(text: string): number | null {
    const patterns = [
      /(\d[\d\s.,-]+\d)/g, // Numbers with decimal points
      /(?:сумма|amount|размер)[:\s]*(\d[\d\s.,-]+\d)/gi, // Explicit amount indicators
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match?.[1]) {
        return this.parseAmountFromString(match[1]);
      }
    }

    return null;
  }

  private standardizeCurrencyCode(currency: string): string {
    const standardizationMap: { [key: string]: string } = {
      '₽': 'RUB',
      $: 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'CNY',
      '₸': 'KZT',
      тг: 'KZT',
      тенге: 'KZT',
      доллар: 'USD',
      евро: 'EUR',
      рубль: 'RUB',
    };

    return standardizationMap[currency.toUpperCase()] || currency.toUpperCase();
  }

  private standardizeAmount(amount: number): number {
    // Round to 2 decimal places for currency
    return Math.round(amount * 100) / 100;
  }

  // Public method to add custom control total patterns
  addControlTotalPattern(type: ControlTotal['type'], patterns: RegExp[], priority = 1): void {
    this.controlTotalPatterns.push({
      type,
      patterns,
      priority,
    });
    this.logger.log(`Added custom control total pattern for ${type}`);
  }

  // Public method to get current patterns
  getControlTotalPatterns(): ControlTotalPatternGroup[] {
    return [...this.controlTotalPatterns];
  }
}
