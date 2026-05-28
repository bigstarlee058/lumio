export function resolveLocale(locale: string): string {
  if (locale === 'ru') {
    return 'ru-RU';
  }
  if (locale === 'kk') {
    return 'kk-KZ';
  }
  return 'en-US';
}

export const statusHeadingFallback: Record<string, string> = {
  error: 'Data unavailable',
  loading: 'Loading...',
  empty: 'No data yet',
  overdue: 'Overdue payments',
  needsReview: 'Needs review',
  pendingSubmit: 'Pending submit',
  receiptsNeedReview: 'Receipts need review',
  parsingIssues: 'Parsing issues',
  uncategorized: 'Uncategorized items',
  stale: 'Data is stale',
  negativeFlow: 'Negative cash flow',
  positiveFlow: 'Positive cash flow',
  breakEven: 'Break-even period',
  allClear: 'All good',
};

export function text(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'value' in value) {
    const tokenValue = (value as { value?: string }).value;
    if (typeof tokenValue === 'string') {
      return tokenValue;
    }
  }
  return '';
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.split(`{${key}}`).join(value);
  }, template);
}

export type GreetingState = 'empty' | 'pendingReview' | 'stale' | 'upToDate';

export function resolveGreetingState(params: {
  isEmptyWorkspace: boolean;
  pendingReviewCount: number;
  isStaleImport: boolean;
}): GreetingState {
  const { isEmptyWorkspace, pendingReviewCount, isStaleImport } = params;
  if (isEmptyWorkspace) {
    return 'empty';
  }
  if (pendingReviewCount > 0) {
    return 'pendingReview';
  }
  if (isStaleImport) {
    return 'stale';
  }
  return 'upToDate';
}

export function resolveDashboardGreetingData(params: {
  lastUploadDate: string | null;
  pendingReviewCount: number;
}): { isEmptyWorkspace: boolean; pendingReviewCount: number; isStaleImport: boolean } {
  const { lastUploadDate, pendingReviewCount } = params;
  const isEmptyWorkspace = !lastUploadDate;
  const daysSinceUpload = lastUploadDate
    ? Math.floor((Date.now() - new Date(lastUploadDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isStaleImport = !isEmptyWorkspace && daysSinceUpload !== null && daysSinceUpload >= 14;
  return { isEmptyWorkspace, pendingReviewCount, isStaleImport };
}
