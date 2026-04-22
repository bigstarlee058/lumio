'use client';

import apiClient from '@/app/lib/api';
import type { StatementCategoryNode } from '@/app/lib/statement-categories';
import type { TaxRateOption } from '@/app/lib/statement-expense-drawer';
import { useState } from 'react';
import { type StatementCategoryWithEnabled, filterEnabledCategories } from '../StatementsListView.utils';

interface UseManualExpenseOptionsReturn {
  manualExpenseCategories: StatementCategoryNode[];
  manualExpenseTaxRates: TaxRateOption[];
  loadManualExpenseOptions: () => Promise<void>;
}

export function useManualExpenseOptions(): UseManualExpenseOptionsReturn {
  const [manualExpenseCategories, setManualExpenseCategories] = useState<StatementCategoryNode[]>(
    [],
  );
  const [manualExpenseTaxRates, setManualExpenseTaxRates] = useState<TaxRateOption[]>([]);

  const loadManualExpenseOptions = async (): Promise<void> => {
    try {
      const [categoriesResponse, taxRatesResponse] = await Promise.all([
        apiClient.get('/categories', { params: { type: 'expense' } }),
        apiClient.get('/tax-rates'),
      ]);

      const rawCategories = (categoriesResponse.data?.data ??
        categoriesResponse.data ??
        []) as StatementCategoryWithEnabled[];
      setManualExpenseCategories(filterEnabledCategories(rawCategories));

      const rawTaxRates = (taxRatesResponse.data?.data ?? taxRatesResponse.data ?? []) as Array<
        TaxRateOption & { rate: number | string }
      >;

      setManualExpenseTaxRates(
        rawTaxRates.map(taxRate => ({
          ...taxRate,
          rate: Number(taxRate.rate ?? 0),
          isEnabled: taxRate.isEnabled !== false,
        })),
      );
    } catch (error) {
      console.error('Failed to load manual expense options:', error);
      setManualExpenseCategories([]);
      setManualExpenseTaxRates([]);
    }
  };

  return { manualExpenseCategories, manualExpenseTaxRates, loadManualExpenseOptions };
}
