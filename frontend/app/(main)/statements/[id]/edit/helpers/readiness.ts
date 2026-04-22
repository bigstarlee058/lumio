import { formatLabel, labelValue } from '../editHelpers';

type Labels = Record<string, { value?: string } | undefined>;

export type ReadinessMessageParams = {
  hasStatementCategory: boolean;
  hasDisabledStatementCategory: boolean;
  missingCategoryCount: number;
  parsingErrorCount: number;
  parsingWarningCount: number;
  transactionsCount: number;
  labels: Labels;
};

export function buildReadinessTitle(
  severity: 'success' | 'warning' | 'error',
  labels: Labels,
): string {
  if (severity === 'error') return labelValue(labels.alertNeedsFixTitle, 'Fix required before submit');
  if (severity === 'warning') return labelValue(labels.alertReviewTitle, 'Review statement before submit');
  return labelValue(labels.alertReadyTitle, 'Statement is ready to submit');
}

function buildCategoryMsgs(p: ReadinessMessageParams): string[] {
  const msgs: string[] = [];
  if (!p.hasStatementCategory) msgs.push(labelValue(p.labels.alertStatementCategoryMissing, 'Statement category is not selected.'));
  if (p.hasDisabledStatementCategory) msgs.push(labelValue(p.labels.alertStatementCategoryDisabled, 'Selected statement category is disabled. Choose an active category.'));
  if (p.missingCategoryCount > 0) msgs.push(formatLabel(labelValue(p.labels.alertTransactionsCategoryMissing, '{count} transactions require a category.'), { count: p.missingCategoryCount }));
  return msgs;
}

function buildParsingMsgs(p: ReadinessMessageParams): string[] {
  const msgs: string[] = [];
  if (p.parsingErrorCount > 0) msgs.push(formatLabel(labelValue(p.labels.alertParsingErrors, '{count} parsing errors found.'), { count: p.parsingErrorCount }));
  if (p.parsingWarningCount > 0) msgs.push(formatLabel(labelValue(p.labels.alertParsingWarnings, '{count} parsing warnings found.'), { count: p.parsingWarningCount }));
  if (!p.transactionsCount) msgs.push(labelValue(p.labels.alertNoTransactions, 'No transactions found in this statement.'));
  return msgs;
}

export function buildReadinessMessage(params: ReadinessMessageParams): string {
  const details = [...buildCategoryMsgs(params), ...buildParsingMsgs(params)];
  const fallback = labelValue(params.labels.alertReadyBody, 'All required categories are assigned. The data looks good and ready to submit.');
  return details.length > 0 ? details.join(' · ') : fallback;
}
