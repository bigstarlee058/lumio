// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    labels: {
      title: { value: 'Rapports' },
      subtitle: { value: 'Genere des rapports localises' },
      tabTemplates: { value: 'Modeles' },
      tabHistory: { value: 'Historique' },
      backToTemplates: { value: 'Retour aux modeles' },
      balanceSheetTitle: { value: 'Bilan localise' },
      templatePnlName: { value: 'PnL localise' },
      templatePnlDescription: { value: 'Description PnL localisee' },
      templateBalanceName: { value: 'Balance locale' },
      templateBalanceDescription: { value: 'Description balance localisee' },
      templateCashFlowName: { value: 'Flux de tresorerie' },
      templateCashFlowDescription: { value: 'Description cash flow localisee' },
      templateExpenseByCategoryName: { value: 'Depenses par categorie' },
      templateExpenseByCategoryDescription: { value: 'Description depenses localisee' },
    },
  }),
}));

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

    const reportsHeading = screen.getByText('Rapports');
    const templateTitle = screen.getByText('PnL localise');
    const templateCard = templateTitle.closest('[class*="bg-card"]');

    expect(reportsHeading.className).toContain('text-foreground');
    expect(container.firstElementChild?.className).toContain('bg-background');
    expect(templateCard?.className).toContain('bg-card');
    expect(templateCard?.className).not.toContain('bg-white');
  });

  it('renders localized page copy and tab labels from i18n', async () => {
    const { default: ReportsPage } = await import('./page');
    render(<ReportsPage />);

    expect(screen.getByText('Rapports')).toBeInTheDocument();
    expect(screen.getByText('Genere des rapports localises')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Modeles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historique' })).toBeInTheDocument();
    expect(screen.getByText('Balance locale')).toBeInTheDocument();
    expect(screen.getByText('Description balance localisee')).toBeInTheDocument();
  });
});
