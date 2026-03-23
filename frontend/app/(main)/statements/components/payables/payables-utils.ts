import type {
  Payable,
  PayableSource,
  PayableStatus,
  PayablesSummary,
} from '@/app/lib/payables-api';

export type PayablesSortOption = 'dueDateAsc' | 'dueDateDesc' | 'amountDesc' | 'vendorAsc';

export interface PayablesFiltersState {
  search: string;
  status: PayableStatus | 'all';
  source: PayableSource | 'all';
  dueDateFrom: string;
  dueDateTo: string;
  sort: PayablesSortOption;
}

export const DEFAULT_PAYABLES_FILTERS: PayablesFiltersState = {
  search: '',
  status: 'all',
  source: 'all',
  dueDateFrom: '',
  dueDateTo: '',
  sort: 'dueDateAsc',
};

export const resolveLocale = (locale?: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parsePayableDate = (value?: string | null) => {
  if (!value) return null;

  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (
  value: number | string | null | undefined,
  currency = 'KZT',
  locale = 'en',
) =>
  new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export const formatPayableDate = (value?: string | null, locale = 'en') => {
  const date = parsePayableDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(resolveLocale(locale));
};

export const isPayableOverdue = (payable: Pick<Payable, 'status' | 'dueDate'>) => {
  if (!payable.dueDate) return false;
  if (payable.status === 'paid' || payable.status === 'archived') return false;

  const dueDate = parsePayableDate(payable.dueDate);
  if (!dueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

export const getPayableStatusVariant = (status: PayableStatus, overdue: boolean) => {
  if (overdue || status === 'overdue') return 'destructive' as const;
  if (status === 'paid') return 'success' as const;
  if (status === 'scheduled') return 'info' as const;
  if (status === 'archived') return 'outline' as const;
  return 'warning' as const;
};

export const buildPayablesListParams = (
  filters: PayablesFiltersState,
  pagination?: { page?: number; limit?: number },
) => ({
  page: pagination?.page,
  limit: pagination?.limit,
  search: filters.search || undefined,
  status: filters.status === 'all' ? undefined : filters.status,
  source: filters.source === 'all' ? undefined : filters.source,
  dueDateFrom: filters.dueDateFrom || undefined,
  dueDateTo: filters.dueDateTo || undefined,
  sort: filters.sort,
});

export const sortPayables = (payables: Payable[], sort: PayablesSortOption) => {
  const copy = [...payables];

  copy.sort((left, right) => {
    if (sort === 'amountDesc') {
      return toNumber(right.amount) - toNumber(left.amount);
    }

    if (sort === 'vendorAsc') {
      return left.vendor.localeCompare(right.vendor);
    }

    const leftTime = parsePayableDate(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = parsePayableDate(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;

    if (sort === 'dueDateDesc') {
      return rightTime - leftTime;
    }

    return leftTime - rightTime;
  });

  return copy;
};

export const getSummaryCardItems = (summary: PayablesSummary) =>
  [
    { key: 'toPay', value: summary.toPay, count: summary.toPayCount },
    { key: 'overdue', value: summary.overdue, count: summary.overdueCount },
    { key: 'dueThisWeek', value: summary.dueThisWeek },
    { key: 'paidThisMonth', value: summary.paidThisMonth },
  ] as const;
