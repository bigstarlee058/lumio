// @vitest-environment jsdom
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chartPropsSpy = vi.hoisted(() => vi.fn<(props: Record<string, unknown>) => void>());

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    void loader;
    return (props: Record<string, unknown>) => {
      chartPropsSpy(props);
      return React.createElement('div', { 'data-testid': 'cash-flow-mini-chart' });
    };
  },
}));

describe('CashFlowMini', () => {
  beforeEach(() => {
    chartPropsSpy.mockClear();
  });

  it('hides y-axis labels to avoid tiny overlapping numbers', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    render(
      <CashFlowMini
        emptyLabel="No data"
        data={[
          { date: '2025-12-08', income: 500000, expense: 300000 },
          { date: '2025-12-09', income: 320000, expense: 180000 },
        ]}
      />,
    );

    expect(chartPropsSpy).toHaveBeenCalled();
    const [props] = chartPropsSpy.mock.calls.at(-1) ?? [];
    const option = props?.option as { yAxis?: { axisLabel?: { show?: boolean } } } | undefined;

    expect(option?.yAxis?.axisLabel?.show).toBe(false);
  });

  it('does not render a duplicate large chart title inside the card', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    const { container } = render(
      <CashFlowMini
        emptyLabel="No data"
        data={[
          { date: '2025-12-08', income: 500000, expense: 300000 },
          { date: '2025-12-09', income: 320000, expense: 180000 },
        ]}
      />,
    );

    expect(container.textContent).not.toContain('Cash Flow (30d)');
  });
});
