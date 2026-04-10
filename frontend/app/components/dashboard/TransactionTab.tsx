'use client';

import { useIntlayer } from '@/app/i18n';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import DetailsDrawer from '@/app/components/transactions/DetailsDrawer';
import TransactionsTable from '@/app/components/transactions/TransactionsTable';
import { useTransactionData } from '@/app/components/transactions/hooks/useTransactionData';
import type { FilterState, Transaction } from '@/app/components/transactions/types';
import { CurrencyDisplayToggle } from '@/app/components/ui/CurrencyDisplayToggle';
import { CurrencyFilterDropdown } from '@/app/components/ui/CurrencyFilterDropdown';
import { Spinner } from '@/app/components/ui/spinner';
import { useCurrencyDisplay } from '@/app/contexts/CurrencyDisplayContext';
import api from '@/app/lib/api';

export function TransactionTab() {
  const t = useIntlayer('transactionsPageView');
  const { showConverted, workspaceCurrency } = useCurrencyDisplay();

  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const { transactions, categories, loading, error, refetch } = useTransactionData({
    showConverted,
    workspaceCurrency,
    currencyFilter,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    category: null,
  });

  const availableCurrencies = useMemo(
    () => [...new Set(transactions.map(tx => tx.currency).filter(Boolean) as string[])].sort(),
    [transactions],
  );

  const handleRowClick = (transaction: Transaction) => {
    setDetailsTransaction(transaction);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDetailsTransaction(null), 300);
  };

  const handleUpdateCategory = async (txIds: string[], categoryId: string) => {
    try {
      await api.patch('/transactions/bulk-update-category', {
        transactionIds: txIds,
        categoryId,
      });
      await refetch();
      toast.success(t.categoriesUpdated?.value || `Category updated successfully`);
    } catch (err) {
      console.error('Failed to update category:', err);
      toast.error(t.bulkUpdateFailed?.value || 'Failed to update category');
      throw err;
    }
  };

  const handleSingleUpdateCategory = async (txId: string, categoryId: string) => {
    try {
      await handleUpdateCategory([txId], categoryId);
      handleCloseDrawer();
    } catch (error) {
      // Error handled in handleUpdateCategory
    }
  };

  const handleBulkAssignCategory = async () => {
    if (!bulkCategoryId || selectedIds.length === 0) return;
    try {
      await handleUpdateCategory(selectedIds, bulkCategoryId);
      setSelectedIds([]);
      setBulkCategoryId('');
    } catch (error) {
      // Error handled in handleUpdateCategory
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="rounded-none border border-red-200 bg-red-50 p-4 text-red-600 mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <CurrencyDisplayToggle />
        <CurrencyFilterDropdown
          currencies={availableCurrencies}
          value={currencyFilter}
          onChange={setCurrencyFilter}
        />
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-none border border-primary/30 bg-primary/5 p-4 transition-all duration-300">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {t.selected?.value || 'selected'}
            </span>
          </div>

          <div className="flex flex-1 items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={e => setBulkCategoryId(e.target.value)}
              className="flex-1 max-w-xs rounded-none border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t.selectCategory?.value || 'Select category...'}</option>
              {categories
                .filter(cat => cat.isEnabled !== false)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>

            <button
              type="button"
              onClick={handleBulkAssignCategory}
              disabled={!bulkCategoryId}
              className="rounded-none bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.apply?.value || 'Apply'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-none border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t.clearSelection?.value || 'Clear selection'}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionsTable
        transactions={transactions}
        categories={categories}
        selectedIds={selectedIds}
        onSelectRows={setSelectedIds}
        onRowClick={handleRowClick}
        onUpdateCategory={handleSingleUpdateCategory}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Details Drawer */}
      <DetailsDrawer
        open={drawerOpen}
        transaction={detailsTransaction}
        categories={categories}
        onClose={handleCloseDrawer}
        onUpdateCategory={handleSingleUpdateCategory}
      />
    </div>
  );
}
