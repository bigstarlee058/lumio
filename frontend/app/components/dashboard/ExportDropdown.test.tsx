// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiPost = vi.fn();
const toastLoading = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/app/lib/api', () => ({
  default: {
    post: apiPost,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: toastLoading,
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock('@heroui/react', () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenu: ({ children, onAction }: { children: React.ReactNode; onAction?: (key: React.Key) => void }) => (
    <div>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        const key = child.key == null ? undefined : String(child.key);
        return React.cloneElement(child as React.ReactElement<any>, {
          itemKey: key,
          onPress: () => {
            if (key) {
              onAction?.(key);
            }
          },
        });
      })}
    </div>
  ),
  DropdownItem: ({ children, onPress, itemKey }: { children: React.ReactNode; onPress?: () => void; itemKey?: string }) => (
    <button type="button" data-testid={`dropdown-item-${itemKey}`} onClick={onPress}>
      {children}
    </button>
  ),
}));

describe('ExportDropdown', () => {
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  let anchorElement: HTMLAnchorElement | null = null;
  let clickSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    apiPost.mockReset();
    toastLoading.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastLoading.mockReturnValue('toast-id');
    createObjectURL.mockReset();
    createObjectURL.mockReturnValue('blob:url');
    revokeObjectURL.mockReset();
    clickSpy = vi.fn();
    removeSpy = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'a') {
        anchorElement = originalCreateElement('a');
        anchorElement.click = clickSpy;
        anchorElement.remove = removeSpy;

        return anchorElement;
      }

      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    anchorElement = null;
  });

  it('exports the workspace in the selected format', async () => {
    apiPost.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      headers: {
        'content-disposition': 'attachment; filename="workspace-transactions-2026-04-01.pdf"',
      },
    });

    const { ExportDropdown } = await import('./ExportDropdown');

    render(
      <ExportDropdown
        t={{
          button: { value: 'Export' },
          title: { value: 'Export data' },
          excel: { value: 'Excel (.xlsx)' },
          pdf: { value: 'PDF' },
          csv: { value: 'CSV' },
          docx: { value: 'Word (.docx)' },
          downloading: { value: 'Downloading...' },
          success: { value: 'File downloaded successfully' },
          error: { value: 'Download failed' },
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('dropdown-item-pdf'));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/reports/workspace-export',
        { format: 'pdf' },
        { responseType: 'blob' },
      );
    });

    expect(toastLoading).toHaveBeenCalledWith('Downloading...');
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(anchorElement?.href).toBe('blob:url');
    expect(anchorElement?.download).toBe('workspace-transactions-2026-04-01.pdf');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('File downloaded successfully', { id: 'toast-id' });
  });

  it('shows an error toast when export fails', async () => {
    apiPost.mockRejectedValue(new Error('boom'));

    const { ExportDropdown } = await import('./ExportDropdown');

    render(
      <ExportDropdown
        t={{
          button: { value: 'Export' },
          title: { value: 'Export data' },
          excel: { value: 'Excel (.xlsx)' },
          pdf: { value: 'PDF' },
          csv: { value: 'CSV' },
          docx: { value: 'Word (.docx)' },
          downloading: { value: 'Downloading...' },
          success: { value: 'File downloaded successfully' },
          error: { value: 'Download failed' },
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('dropdown-item-docx'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Download failed', { id: 'toast-id' });
    });
  });

  it('falls back to built-in labels when i18n tokens are missing', async () => {
    const { ExportDropdown } = await import('./ExportDropdown');

    render(
      <ExportDropdown
        t={{
          title: { value: 'Export data' },
          excel: { value: 'Excel (.xlsx)' },
          pdf: { value: 'PDF' },
          csv: { value: 'CSV' },
          docx: { value: 'Word (.docx)' },
          downloading: { value: 'Downloading...' },
          success: { value: 'File downloaded successfully' },
          error: { value: 'Download failed' },
        } as any}
      />,
    );

    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
