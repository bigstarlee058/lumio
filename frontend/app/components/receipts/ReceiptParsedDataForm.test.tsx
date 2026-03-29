import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptParsedDataForm } from './ReceiptParsedDataForm';
import type { EditableReceiptParsedData } from './receipt-types';

vi.mock('@/app/components/CustomDatePicker', () => ({
  default: ({ value, onChange, label, containerTestId }: any) => (
    <div data-testid={containerTestId ?? 'mock-custom-date-picker'}>
      <span>{label}</span>
      <button type="button" aria-label="HeroUI Date" onClick={() => onChange('2024-07-29')}>
        {value || 'Pick date'}
      </button>
    </div>
  ),
}));

const baseValue: EditableReceiptParsedData = {
  vendor: 'Magnum',
  amount: 15420,
  currency: 'KZT',
  date: '2014-07-29',
  tax: '',
  paymentMethod: '',
  transactionType: 'expense',
  categoryId: '',
  lineItems: [],
};

describe('ReceiptParsedDataForm', () => {
  it('uses the HeroUI date picker instead of a native date input', () => {
    render(
      <ReceiptParsedDataForm value={baseValue} categories={[]} onChange={vi.fn()} />,
    );

    expect(screen.queryByLabelText('Date')).toBeFalsy();
    expect(screen.queryByDisplayValue('2014-07-29')).toBeFalsy();
    expect(screen.getByTestId('receipt-date-picker')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HeroUI Date' })).toBeTruthy();
  });

  it('updates the receipt date when the HeroUI picker changes', () => {
    const onChange = vi.fn();

    render(<ReceiptParsedDataForm value={baseValue} categories={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HeroUI Date' }));

    expect(onChange).toHaveBeenCalledWith({
      ...baseValue,
      date: '2024-07-29',
    });
  });
});
