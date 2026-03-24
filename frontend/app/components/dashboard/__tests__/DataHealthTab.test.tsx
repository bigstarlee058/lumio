// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-setup';
import { DataHealthTab } from '../DataHealthTab';

describe('DataHealthTab', () => {
  it('uses dark-safe metric card surfaces instead of translucent white panels', () => {
    render(
      <DataHealthTab
        data={{
          dataHealth: {
            uncategorizedTransactions: 2,
            statementsWithErrors: 1,
            statementsPendingReview: 3,
            unapprovedCash: 0,
            lastUploadDate: '2025-05-31T00:00:00.000Z',
            parsingWarnings: 1,
          },
        } as any}
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
});
