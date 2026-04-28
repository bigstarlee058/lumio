import type { Transaction } from './editHelpers';
import { isIdEmpty } from './editHelpers';

interface ReadinessLabels {
  alertNeedsFixTitle?: { value?: string };
  alertReviewTitle?: { value?: string };
  alertReadyTitle?: { value?: string };
  alertStatementCategoryMissing?: { value?: string };
  alertStatementCategoryDisabled?: { value?: string };
  alertTransactionsCategoryMissing?: { value?: string };
  alertParsingErrors?: { value?: string };
  alertParsingWarnings?: { value?: string };
  alertNoTransactions?: { value?: string };
  alertReadyBody?: { value?: string };
  [key: string]: { value?: string } | undefined;
}

export interface ReadinessResult {
  severity: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  missingCategoryCount: number;
}

interface ReadinessInput {
  transactions: Transaction[];
  hasStatementCategory: boolean;
  hasDisabledStatementCategory: boolean;
  parsingErrorCount: number;
  parsingWarningCount: number;
  labels: ReadinessLabels;
}

function getReadinessSeverity(
  hasCategoryIssues: boolean,
  parsingErrorCount: number,
  parsingWarningCount: number,
): 'success' | 'warning' | 'error' {
  if (hasCategoryIssues) { return 'error'; }
  if (parsingErrorCount > 0 || parsingWarningCount > 0) { return 'warning'; }
  return 'success';
}

const severityTitles: Record<'success' | 'warning' | 'error', { labelKey: keyof ReadinessLabels; fallback: string }> = {
  error: { labelKey: 'alertNeedsFixTitle', fallback: 'Fix required before submit' },
  warning: { labelKey: 'alertReviewTitle', fallback: 'Review statement before submit' },
  success: { labelKey: 'alertReadyTitle', fallback: 'Statement is ready to submit' },
};

function buildReadinessDetails(input: ReadinessInput): string[] {
  const { transactions, hasStatementCategory, hasDisabledStatementCategory, parsingErrorCount, parsingWarningCount, labels } = input;
  const details: string[] = [];

  const missingCategoryCount = transactions.filter(tx => {
    const noCategory = isIdEmpty(tx.categoryId) && isIdEmpty(tx.category?.id);
    return noCategory || tx.category?.isEnabled === false;
  }).length;

  if (!hasStatementCategory) {
    details.push(labels.alertStatementCategoryMissing?.value || 'Statement category is not selected.');
  }
  if (hasDisabledStatementCategory) {
    details.push(labels.alertStatementCategoryDisabled?.value || 'Selected statement category is disabled. Choose an active category.');
  }
  if (missingCategoryCount > 0) {
    details.push(
      (labels.alertTransactionsCategoryMissing?.value || '{count} transactions require a category. Assign categories for all rows.')
        .replace('{count}', String(missingCategoryCount)),
    );
  }
  if (parsingErrorCount > 0) {
    details.push(
      (labels.alertParsingErrors?.value || '{count} parsing errors found. Review parsing details and statement data.')
        .replace('{count}', String(parsingErrorCount)),
    );
  }
  if (parsingWarningCount > 0) {
    details.push(
      (labels.alertParsingWarnings?.value || '{count} parsing warnings found. It is recommended to review flagged rows.')
        .replace('{count}', String(parsingWarningCount)),
    );
  }
  if (!transactions.length) {
    details.push(labels.alertNoTransactions?.value || 'No transactions found in this statement. Check file or import settings.');
  }

  return details;
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { hasStatementCategory, hasDisabledStatementCategory, parsingErrorCount, parsingWarningCount, labels, transactions } = input;

  const missingCategoryCount = transactions.filter(tx => {
    const noCategory = isIdEmpty(tx.categoryId) && isIdEmpty(tx.category?.id);
    return noCategory || tx.category?.isEnabled === false;
  }).length;

  const hasCategoryIssues = !hasStatementCategory || hasDisabledStatementCategory || missingCategoryCount > 0;
  const severity = getReadinessSeverity(hasCategoryIssues, parsingErrorCount, parsingWarningCount);

  const titleConfig = severityTitles[severity];
  const title = labels[titleConfig.labelKey]?.value || titleConfig.fallback;

  const details = buildReadinessDetails(input);
  const message = details.length > 0
    ? details.join(' · ')
    : labels.alertReadyBody?.value || 'All required categories are assigned. The data looks good and ready to submit.';

  return { severity, title, message, missingCategoryCount };
}
