// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.hoisted(() => vi.fn());
const createObjectURL = vi.hoisted(() => vi.fn(() => 'blob:report'));
const revokeObjectURL = vi.hoisted(() => vi.fn());
const clickSpy = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
  },
}));

vi.mock('@/app/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

describe('ReportHistory', () => {
  beforeEach(() => {
    apiGet.mockReset();
    clickSpy.mockReset();
    createObjectURL.mockReset();
    createObjectURL.mockReturnValue('blob:report');
    revokeObjectURL.mockReset();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL,
        revokeObjectURL,
      },
      writable: true,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: clickSpy });
      }
      return element;
    }) as typeof document.createElement);
  });

  it('renders a re-download icon button and downloads the stored file', async () => {
    apiGet
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'report-1',
              templateId: 'pnl',
              templateName: 'Profit & Loss (P&L)',
              dateFrom: '2025-12-11',
              dateTo: '2026-03-18',
              format: 'excel',
              generatedBy: 'user@example.com',
              generatedAt: '2026-03-18T10:00:00.000Z',
              fileName: 'pnl-2025-12-11-2026-03-18.xlsx',
              fileSize: 18100,
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: new Blob(['report']) });

    const { ReportHistory } = await import('./ReportHistory');
    render(<ReportHistory />);

    await waitFor(() => {
      expect(screen.getByText('Profit & Loss (P&L)')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: 'Re-download Profit & Loss (P&L)' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiGet).toHaveBeenNthCalledWith(2, '/reports/history/report-1/download', {
        responseType: 'blob',
      });
    });
    expect(clickSpy).toHaveBeenCalled();
  });
});
