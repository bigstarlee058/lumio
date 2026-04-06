'use client';

import { useCurrencyDisplay } from '@/app/contexts/CurrencyDisplayContext';
import { useIntlayer } from '@/app/i18n';
import { FilterChipButton } from './filter-chip-button';

/**
 * Toggle chip for switching between workspace-currency conversion and original amounts.
 * Reads/writes `CurrencyDisplayContext`.
 */
export function CurrencyDisplayToggle() {
  const { showConverted, toggleShowConverted, workspaceCurrency } = useCurrencyDisplay();
  const t = useIntlayer('currencyDisplayToggle');

  const label = showConverted
    ? `${t.showOriginal.value}`
    : `${t.showInCurrency.value} ${workspaceCurrency}`;

  return (
    <FilterChipButton active={showConverted} onClick={toggleShowConverted} aria-pressed={showConverted}>
      {label}
    </FilterChipButton>
  );
}
