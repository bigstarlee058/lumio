// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { TrendsTab } from '../TrendsTab';

type TrendsTabData = React.ComponentProps<typeof TrendsTab>['data'];

const hooksMock = vi.hoisted(() => ({
  useDashboardTrends: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-echarts" />,
}));

vi.mock('@/app/hooks/useDashboard', async () => {
  const actual = await vi.importActual('@/app/hooks/useDashboard');
  return {
    ...actual,
    useDashboardTrends: hooksMock.useDashboardTrends,
  };
});

describe('TrendsTab', () => {
  it('shows the effective period banner when trends use an auto-shifted window', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
        categories: [{ name: 'Office', amount: 40, count: 1 }],
        counterparties: [{ name: 'Client', amount: 100, count: 1 }],
        sources: {
          statements: { income: 100, expense: 40, rows: 2 },
        },
        effectiveSince: '2025-05-01',
        effectiveEndDate: '2025-05-31',
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{} as TrendsTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(
      screen.getByText('Showing latest available period: 2025-05-01 - 2025-05-31'),
    ).toBeInTheDocument();
  });

  it('uses dark-safe surface classes instead of translucent white cards', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
        categories: [{ name: 'Office', amount: 40, count: 1 }],
        counterparties: [{ name: 'Client', amount: 100, count: 1 }],
        sources: {
          statements: { income: 100, expense: 40, rows: 2 },
        },
        effectiveSince: '2025-05-01',
        effectiveEndDate: '2025-05-31',
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{} as TrendsTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const spendTrendHeading = screen.getByText('SPEND TREND');
    const spendTrendCard = spendTrendHeading.closest('[class*="dark:bg-card"]');

    expect(spendTrendCard?.className).toContain('dark:bg-card');
    expect(spendTrendCard?.className).toContain('dark:border-border');
    expect(spendTrendCard?.className).not.toContain('bg-white/40');
    expect(spendTrendCard?.className).not.toContain('border-white/60');
  });
});
