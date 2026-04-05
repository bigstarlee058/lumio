// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-setup';
import { DataHealthTab } from '../DataHealthTab';

type DataHealthTabData = React.ComponentProps<typeof DataHealthTab>['data'];

describe('DataHealthTab', () => {
  it('uses dark-safe metric card surfaces instead of translucent white panels', () => {
    render(
      <DataHealthTab
        data={{
          dataHealth: {
            uncategorizedTransactions: 2,
            statementsWithErrors: 1,
            statementsPendingReview: 3,
            statementsPendingSubmit: 2,
            receiptsPendingReview: 4,
            unapprovedCash: 0,
            lastUploadDate: '2025-05-31T00:00:00.000Z',
            parsingWarnings: 1,
          },
        } as DataHealthTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const heading = screen.getByText('DATA QUALITY METRICS');
    const metricCard = heading.parentElement?.querySelector('[class*="dark:bg-card"]');

    expect(metricCard).toBeInTheDocument();
    expect(metricCard?.className).toContain('dark:bg-card');
    expect(metricCard?.className).toContain('dark:border-border');
    expect(metricCard?.className).not.toContain('bg-white/40');
    expect(metricCard?.className).not.toContain('border-white/60');
  });

  it('renders receipts pending metric and action link', () => {
    render(
      <DataHealthTab
        data={{
          dataHealth: {
            uncategorizedTransactions: 0,
            statementsWithErrors: 0,
            statementsPendingReview: 0,
            statementsPendingSubmit: 0,
            receiptsPendingReview: 2,
            unapprovedCash: 0,
            lastUploadDate: '2025-05-31T00:00:00.000Z',
            parsingWarnings: 0,
          },
        } as DataHealthTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(screen.getByText('RECEIPTS PENDING')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review 2 receipts/i })).toBeInTheDocument();
  });
});
