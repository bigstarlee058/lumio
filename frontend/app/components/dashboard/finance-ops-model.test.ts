import { describe, expect, it } from 'vitest';
import type { DashboardData } from '@/app/hooks/useDashboard';

import { buildFinanceOpsModel } from './finance-ops-model';

const baseData: DashboardData = {
  snapshot: {
    totalBalance: 125000,
    income30d: 90000,
    expense30d: 65000,
    netFlow30d: 25000,
    totalPayable: 12000,
    totalOverdue: 3000,
    unapprovedCash: 5000,
    currency: 'KZT',
  },
  actions: [
    {
      type: 'transactions_uncategorized',
      count: 7,
      label: '7 transactions uncategorized',
      href: '/statements/submit?categoryId=uncategorized',
    },
    {
      type: 'statements_pending_review',
      count: 2,
      label: '2 statements need review',
      href: '/statements/approve',
    },
  ],
  cashFlow: [],
  topMerchants: [{ name: 'Acme Ltd', amount: 42000, count: 3 }],
  topCategories: [{ id: 'cat-1', name: 'Operations', amount: 33000, transactions: 4, percentage: 40 }],
  recentActivity: [],
  role: 'owner',
  range: '30d',
  dataHealth: {
    uncategorizedTransactions: 7,
    statementsWithErrors: 1,
    statementsPendingReview: 2,
    statementsPendingSubmit: 3,
    receiptsPendingReview: 4,
    unapprovedCash: 5000,
    lastUploadDate: '2026-05-01T00:00:00.000Z',
    parsingWarnings: 6,
  },
};

describe('buildFinanceOpsModel', () => {
  it('builds ten workflow features with pending counters from dashboard data', () => {
    const model = buildFinanceOpsModel(baseData, value => `${value} KZT`);

    expect(model.features).toHaveLength(10);
    expect(model.totalPending).toBeGreaterThan(0);
    expect(model.features.map(feature => feature.title)).toEqual([
      'Import Review Inbox',
      'Transaction Triage Mode',
      'Smart Category Suggestions',
      'Period Close Checklist',
      'Anomaly Detection Feed',
      'Reconciliation Dashboard',
      'Saved Views & Team Filters',
      'Receipt Matching Assistant',
      'Actionable Notifications',
      'Explain This Number',
    ]);
    expect(model.features[0].pendingCount).toBe(12);
    expect(model.features[1].pendingCount).toBe(7);
    expect(model.features[3].status).toBe('blocked');
  });

  it('marks period close ready when there is no pending work', () => {
    const model = buildFinanceOpsModel(
      {
        ...baseData,
        actions: [],
        snapshot: { ...baseData.snapshot, totalOverdue: 0, unapprovedCash: 0 },
        dataHealth: {
          uncategorizedTransactions: 0,
          statementsWithErrors: 0,
          statementsPendingReview: 0,
          statementsPendingSubmit: 0,
          receiptsPendingReview: 0,
          unapprovedCash: 0,
          lastUploadDate: '2026-05-01T00:00:00.000Z',
          parsingWarnings: 0,
        },
      },
      value => `${value} KZT`,
    );

    expect(model.totalPending).toBe(0);
    expect(model.features[3].status).toBe('ready');
    expect(model.closeChecklist.every(item => item.done)).toBe(true);
  });
});
