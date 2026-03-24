// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('./components/BalanceSheet', () => ({
  default: () => <div>Balance Sheet</div>,
}));

vi.mock('./components/ReportGenerator', () => ({
  ReportGenerator: () => <div>Report Generator</div>,
}));

vi.mock('./components/ReportHistory', () => ({
  ReportHistory: () => <div>Report History</div>,
}));

describe('ReportsPage', () => {
  it('uses dark-safe page and card surfaces for templates', async () => {
    const { default: ReportsPage } = await import('./page');
    const { container } = render(<ReportsPage />);

    const reportsHeading = screen.getByText('Reports');
    const templateTitle = screen.getByText('Profit & Loss (P&L)');
    const templateCard = templateTitle.closest('[class*="bg-card"]');

    expect(reportsHeading.className).toContain('text-foreground');
    expect(container.firstElementChild?.className).toContain('bg-background');
    expect(templateCard?.className).toContain('bg-card');
    expect(templateCard?.className).not.toContain('bg-white');
  });
});
