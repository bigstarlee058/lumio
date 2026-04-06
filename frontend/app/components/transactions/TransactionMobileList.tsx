'use client';

import { Checkbox } from '../ui/checkbox';
import { TransactionMobileCard } from './TransactionMobileCard';
import type { TransactionRowFormatters, TransactionRowHandlers } from './TransactionRow';
import type { Category, SortState, Transaction } from './types';

interface TransactionMobileListProps {
  transactions: Transaction[];
  allTransactionsCount: number;
  categories: Category[];
  selectedIds: string[];
  expandedIds: Set<string>;
  sort: SortState;
  allSelected: boolean;
  someSelected: boolean;
  handlers: TransactionRowHandlers;
  formatters: TransactionRowFormatters;
  onSelectAll: (checked: boolean) => void;
  onToggleSort: (by: SortState['by']) => void;
  noResultsLabel: string;
  uncategorizedLabel: string;
  columnBinLabel: string;
  columnDateLabel: string;
  columnDateSortLabel: string;
}

export function TransactionMobileList({
  transactions, allTransactionsCount, categories, selectedIds, expandedIds,
  allSelected, someSelected, handlers, formatters,
  onSelectAll, onToggleSort,
  noResultsLabel, uncategorizedLabel, columnBinLabel, columnDateLabel, columnDateSortLabel,
}: TransactionMobileListProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-none border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="inline-flex items-center gap-2">
          <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={onSelectAll} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20" aria-label="Select all rows" />
          <span className="text-sm text-gray-700">{selectedIds.length}/{allTransactionsCount}</span>
        </div>
        <button type="button" onClick={() => onToggleSort('date')} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700">
          {columnDateSortLabel}
        </button>
      </div>
      <div className="space-y-3 p-3">
        {transactions.length === 0
          ? <div className="rounded-none border border-gray-200 px-4 py-10 text-center text-sm text-gray-500">{noResultsLabel}</div>
          : transactions.map(tx => (
            <TransactionMobileCard key={tx.id} tx={tx} isExpanded={expandedIds.has(tx.id)} isSelected={selectedIds.includes(tx.id)} categories={categories} handlers={handlers} formatters={formatters} uncategorizedLabel={uncategorizedLabel} columnBinLabel={columnBinLabel} columnDateLabel={columnDateLabel} />
          ))}
      </div>
    </div>
  );
}
