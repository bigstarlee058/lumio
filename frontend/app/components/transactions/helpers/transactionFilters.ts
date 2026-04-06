import type { FilterState, SortState, Transaction } from '../types';

// Extract amount from a transaction for sorting — avoids repeated || chains
// that would push sort callback complexity over the limit.
function extractSortAmount(tx: Transaction): number {
  return Math.abs(Number(tx.debit) || Number(tx.credit) || 0);
}

// Checks all searchable text fields against a lowercase query.
// Uses Array.some to avoid || chains in the filter predicate (each || adds +1 complexity).
function matchesSearch(tx: Transaction, q: string): boolean {
  const fields = [
    tx.counterpartyName,
    tx.paymentPurpose,
    tx.counterpartyBin,
    tx.documentNumber,
  ];
  return fields.some(field => field != null && field.toLowerCase().includes(q));
}

export function applySearchFilter(transactions: Transaction[], search: string): Transaction[] {
  const q = search.toLowerCase();
  return transactions.filter(tx => matchesSearch(tx, q));
}

export function applyStatusFilter(
  transactions: Transaction[],
  status: FilterState['status'],
): Transaction[] {
  if (status === 'warnings') return transactions.filter(tx => tx.hasWarnings);
  if (status === 'errors') return transactions.filter(tx => tx.hasErrors);
  if (status === 'uncategorized') return transactions.filter(tx => !tx.category);
  return transactions;
}

export function applyCategoryFilter(transactions: Transaction[], category: string | null): Transaction[] {
  if (!category) return transactions;
  return transactions.filter(tx => tx.category?.id === category);
}

export function sortTransactions(transactions: Transaction[], sort: SortState): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (sort.by === 'date') {
      const diff = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      return sort.order === 'asc' ? diff : -diff;
    }
    const diff = extractSortAmount(a) - extractSortAmount(b);
    return sort.order === 'asc' ? diff : -diff;
  });
}

export function buildFilteredAndSorted(
  transactions: Transaction[],
  filters: FilterState,
  sort: SortState,
): Transaction[] {
  let result = transactions;
  if (filters.search) result = applySearchFilter(result, filters.search);
  if (filters.status !== 'all') result = applyStatusFilter(result, filters.status);
  if (filters.category) result = applyCategoryFilter(result, filters.category);
  return sortTransactions(result, sort);
}
