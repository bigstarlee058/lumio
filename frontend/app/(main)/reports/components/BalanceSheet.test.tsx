// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/api', () => ({
  default: {
    get: apiGet,
  },
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    labels: {
      assets: { value: 'Actifs' },
      liabilities: { value: 'Passifs' },
      asOfNow: { value: 'Maintenant' },
      asOfDate: { value: 'A la date' },
      savingBalance: { value: 'Enregistrement...' },
      balanceSaved: { value: 'Balance enregistree' },
      exportBalance: { value: 'Exporter le bilan' },
      exportExcel: { value: 'Excel localise' },
      exportPdf: { value: 'PDF localise' },
      balanceDifference: { value: 'Difference' },
      loadingEllipsis: { value: 'Chargement...' },
      noData: { value: 'Pas de donnees' },
      refresh: { value: 'Actualiser' },
    },
    errors: {
      loadReport: { value: 'Erreur de chargement' },
    },
  }),
  useLocale: () => ({ locale: 'kk' }),
}));

describe('BalanceSheet', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('passes locale to sheet and export API calls', async () => {
    apiGet
      .mockResolvedValueOnce({
        data: {
          date: '2026-04-02',
          currency: 'KZT',
          assets: { total: 100, sections: [] },
          liabilities: { total: 100, sections: [] },
          difference: 0,
          isBalanced: true,
        },
      })
      .mockResolvedValueOnce({
        data: new Blob(['sheet']),
        headers: {
          'content-disposition': 'attachment; filename="balance-sheet-2026-04-02.xlsx"',
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

    const createObjectURL = vi.fn(() => 'blob:balance');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: vi.fn() });
      }
      return element;
    }) as typeof document.createElement);

    const { default: BalanceSheet } = await import('./BalanceSheet');
    render(<BalanceSheet />);

    await waitFor(() => {
      expect(apiGet).toHaveBeenNthCalledWith(1, '/reports/balance/sheet', {
        params: { locale: 'kk' },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exporter le bilan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excel localise' }));

    await waitFor(() => {
      expect(apiGet).toHaveBeenNthCalledWith(2, '/reports/balance/export', {
        params: { format: 'excel', locale: 'kk' },
        responseType: 'blob',
      });
    });
  });
});
