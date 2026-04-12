// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { DateFilterDropdown } from './DateFilterDropdown';

const mockUseIsMobile = vi.fn();
const mockFilterDropdown = vi.fn();

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock('@/app/(main)/statements/components/filters/FilterDropdown', () => ({
  FilterDropdown: ({ children, ...props }: { children: React.ReactNode }) => {
    mockFilterDropdown(props);
    return <div>{children}</div>;
  },
}));

vi.mock('@/app/(main)/statements/components/filters/FilterActions', () => ({
  FilterActions: () => null,
}));

vi.mock('@/app/(main)/statements/components/filters/FilterOptionRow', () => ({
  FilterOptionRow: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label }: { label: string }) => (
    <div data-testid="date-picker" data-label={label} />
  ),
}));

describe('DateFilterDropdown', () => {
  it('renders date pickers when mode is set', async () => {
    mockUseIsMobile.mockReturnValue(false);
    mockFilterDropdown.mockReset();

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DateFilterDropdown
          open={true}
          onOpenChange={() => undefined}
          presets={[{ value: 'thisMonth', label: 'This month' }]}
          modes={[{ value: 'on', label: 'On' }]}
          value={{ mode: 'on', date: '2026-03-17', dateTo: '2026-03-17' }}
          onChange={() => undefined}
          onApply={() => undefined}
          onReset={() => undefined}
          trigger={<button type="button">Date</button>}
          applyLabel="Apply"
          resetLabel="Reset"
        />,
      );
    });

    const pickers = container.querySelectorAll('[data-testid="date-picker"]');
    expect(pickers.length).toBeGreaterThanOrEqual(1);
    expect(mockFilterDropdown).toHaveBeenCalledWith(
      expect.not.objectContaining({
        contentClassName: expect.any(String),
      }),
    );
  });
});
