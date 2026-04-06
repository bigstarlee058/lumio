import { useCallback, useMemo, useState } from 'react';
import { buildFilteredAndSorted } from '../helpers/transactionFilters';
import type { FilterState, SortState, Transaction } from '../types';
import { useTransactionExpansion } from './useTransactionExpansion';

interface Options {
  transactions: Transaction[];
  filters: FilterState;
  selectedIds: string[];
  onSelectRows: (ids: string[]) => void;
  onFilterChange: (filters: FilterState) => void;
}

export interface TransactionsTableState {
  page: number; setPage: (p: number) => void;
  rowsPerPage: number; setRowsPerPage: (r: number) => void;
  totalPages: number;
  sort: SortState; toggleSort: (by: SortState['by']) => void;
  showFilters: boolean; setShowFilters: (v: boolean) => void;
  clearFilters: () => void; hasActiveFilters: boolean;
  allSelected: boolean; someSelected: boolean;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRow: (txId: string) => (checked: boolean) => void;
  expandedIds: Set<string>;
  toggleExpansion: (id: string) => (e: React.SyntheticEvent) => void;
  filteredAndSortedTransactions: Transaction[];
  paginatedTransactions: Transaction[];
}

export function useTransactionsTable(options: Options): TransactionsTableState {
  const { transactions, filters, selectedIds, onSelectRows, onFilterChange } = options;
  const [sort, setSort] = useState<SortState>({ by: 'date', order: 'desc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const { expandedIds, toggleExpansion } = useTransactionExpansion();

  const filteredAndSortedTransactions = useMemo(() => buildFilteredAndSorted(transactions, filters, sort), [transactions, filters, sort]);
  const paginatedTransactions = useMemo(() => filteredAndSortedTransactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredAndSortedTransactions, page, rowsPerPage]);

  const handleSelectAll = useCallback((checked: boolean): void => {
    onSelectRows(checked ? filteredAndSortedTransactions.map(tx => tx.id) : []);
  }, [filteredAndSortedTransactions, onSelectRows]);
  const handleSelectRow = useCallback(
    (txId: string) => (checked: boolean): void => {
      onSelectRows(checked ? [...selectedIds, txId] : selectedIds.filter(id => id !== txId));
    },
    [selectedIds, onSelectRows],
  );
  const toggleSort = useCallback((by: SortState['by']): void => {
    setSort(prev => ({ by, order: prev.by === by && prev.order === 'desc' ? 'asc' : 'desc' }));
  }, []);
  const clearFilters = useCallback((): void => { onFilterChange({ search: '', status: 'all', category: null }); }, [onFilterChange]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTransactions.length / rowsPerPage));
  const hasActiveFilters = Boolean(filters.search || filters.status !== 'all' || filters.category);
  const allSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(tx => selectedIds.includes(tx.id));
  const someSelected = paginatedTransactions.some(tx => selectedIds.includes(tx.id));

  return {
    page, setPage, rowsPerPage, setRowsPerPage, totalPages, sort, toggleSort,
    showFilters, setShowFilters, clearFilters, hasActiveFilters,
    allSelected, someSelected, handleSelectAll, handleSelectRow,
    expandedIds, toggleExpansion, filteredAndSortedTransactions, paginatedTransactions,
  };
}
