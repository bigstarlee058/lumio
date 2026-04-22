import type { AnalyticsFilterOptionLabels } from '@/app/(main)/statements/helpers/analytics-filter-labels';

type DrawerLabels = { title: string; viewResults: string; saveSearch: string; resetFilters: string; general: string; expenses: string; reports: string; type: string; from: string; groupBy: string; has: string; keywords: string; limit: string; status: string; to: string; amount: string; approved: string; billable: string; currency: string; date: string; exported: string; paid: string; any: string; yes: string; no: string };

/** Builds the labels object expected by FiltersDrawer from shared analytics labels. */
export const buildFiltersDrawerLabels = (
  labels: Record<string, string>,
  filterOptionLabels: AnalyticsFilterOptionLabels,
): DrawerLabels => ({
  title: filterOptionLabels.drawerTitle,
  viewResults: filterOptionLabels.viewResults,
  saveSearch: filterOptionLabels.saveSearch,
  resetFilters: filterOptionLabels.resetFilters,
  general: filterOptionLabels.drawerGeneral,
  expenses: filterOptionLabels.drawerExpenses,
  reports: filterOptionLabels.drawerReports,
  type: labels.type,
  from: labels.from,
  groupBy: filterOptionLabels.drawerGroupBy,
  has: filterOptionLabels.drawerHas,
  keywords: filterOptionLabels.drawerKeywords,
  limit: filterOptionLabels.drawerLimit,
  status: labels.status,
  to: filterOptionLabels.drawerTo,
  amount: filterOptionLabels.drawerAmount,
  approved: filterOptionLabels.drawerApproved,
  billable: filterOptionLabels.drawerBillable,
  currency: filterOptionLabels.hasCurrency,
  date: labels.date,
  exported: 'Exported',
  paid: 'Paid',
  any: filterOptionLabels.any,
  yes: filterOptionLabels.yes,
  no: filterOptionLabels.no,
});
