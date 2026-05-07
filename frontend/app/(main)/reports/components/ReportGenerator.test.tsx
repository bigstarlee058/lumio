import { Circle } from '@/app/components/icons';
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const EmptyIcon = Circle;

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    labels: {
      dateFrom: { value: 'Date de debut' },
      dateTo: { value: 'Date de fin' },
      format: { value: 'Format localise' },
      generating: { value: 'Generation...' },
      generateAndDownload: { value: 'Generer et telecharger' },
      cancel: { value: 'Annuler' },
    },
  }),
}));

describe('ReportGenerator', () => {
  it('renders localized form labels and actions', async () => {
    const onGenerate = vi.fn(async () => undefined);
    const onClose = vi.fn();
    const { ReportGenerator } = await import('./ReportGenerator');

    render(
      <ReportGenerator
        template={{
          id: 'pnl',
          name: 'PnL localise',
          description: 'Description locale',
          icon: EmptyIcon,
          category: 'financial',
          formats: ['excel', 'pdf'],
        }}
        onClose={onClose}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByText('Date de debut')).toBeInTheDocument();
    expect(screen.getByText('Date de fin')).toBeInTheDocument();
    expect(screen.getByText('Format localise')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generer et telecharger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
