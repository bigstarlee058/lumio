'use client';

import { Filter, Search, X } from 'lucide-react';
import type { Category, FilterState } from './types';

type FilterTranslations = {
  searchPlaceholder: { value: string };
  filters: { value: string };
  statusFilter: { value: string };
  statusAll: { value: string };
  statusWarnings: { value: string };
  statusErrors: { value: string };
  statusUncategorized: { value: string };
  categoryFilter: { value: string };
  categoryAll: { value: string };
  clearFilters: { value: string };
};

interface TransactionFiltersBarProps {
  filters: FilterState;
  categories: Category[];
  hasActiveFilters: boolean;
  showFilters: boolean;
  onFilterChange: (f: FilterState) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  t: FilterTranslations;
}

const INPUT_CLS = 'w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10';

interface FilterToggleButtonProps {
  hasActiveFilters: boolean;
  activeCount: number;
  filterLabel: string;
  onClick: () => void;
}

function FilterToggleButton({ hasActiveFilters, activeCount, filterLabel, onClick }: FilterToggleButtonProps): React.ReactElement {
  const cls = hasActiveFilters
    ? 'border-primary bg-primary/10 text-primary'
    : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary';
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-none border px-4 py-2 text-sm font-semibold transition ${cls}`}>
      <Filter className="h-4 w-4" />
      {filterLabel}
      {hasActiveFilters && <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">{activeCount}</span>}
    </button>
  );
}

interface StatusSelectProps {
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  t: FilterTranslations;
}

function StatusSelect({ filters, onFilterChange, t }: StatusSelectProps): React.ReactElement {
  return (
    <div className="flex-1 min-w-[200px]">
      <label htmlFor="status-filter" className="mb-1 block text-xs font-semibold text-gray-700">{t.statusFilter.value}</label>
      <select id="status-filter" value={filters.status} onChange={e => onFilterChange({ ...filters, status: e.target.value as FilterState['status'] })} className={INPUT_CLS}>
        <option value="all">{t.statusAll.value}</option>
        <option value="warnings">{t.statusWarnings.value}</option>
        <option value="errors">{t.statusErrors.value}</option>
        <option value="uncategorized">{t.statusUncategorized.value}</option>
      </select>
    </div>
  );
}

interface CategorySelectProps {
  filters: FilterState;
  categories: Category[];
  onFilterChange: (f: FilterState) => void;
  t: FilterTranslations;
}

function CategorySelect({ filters, categories, onFilterChange, t }: CategorySelectProps): React.ReactElement {
  return (
    <div className="flex-1 min-w-[200px]">
      <label htmlFor="category-filter" className="mb-1 block text-xs font-semibold text-gray-700">{t.categoryFilter.value}</label>
      <select id="category-filter" value={filters.category ?? ''} onChange={e => onFilterChange({ ...filters, category: e.target.value || null })} className={INPUT_CLS}>
        <option value="">{t.categoryAll.value}</option>
        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
    </div>
  );
}

interface FilterPanelProps {
  filters: FilterState;
  categories: Category[];
  hasActiveFilters: boolean;
  onFilterChange: (f: FilterState) => void;
  onClearFilters: () => void;
  t: FilterTranslations;
}

function FilterPanel({ filters, categories, hasActiveFilters, onFilterChange, onClearFilters, t }: FilterPanelProps): React.ReactElement {
  return (
    <div className="rounded-none border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusSelect filters={filters} onFilterChange={onFilterChange} t={t} />
        <CategorySelect filters={filters} categories={categories} onFilterChange={onFilterChange} t={t} />
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className="mt-auto rounded-none border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary">
            {t.clearFilters.value}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionFiltersBar({ filters, categories, hasActiveFilters, showFilters, onFilterChange, onToggleFilters, onClearFilters, t }: TransactionFiltersBarProps): React.ReactElement {
  const activeCount = (filters.status !== 'all' ? 1 : 0) + (filters.category ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder={t.searchPlaceholder.value} value={filters.search} onChange={e => onFilterChange({ ...filters, search: e.target.value })} className="w-full rounded-none border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" />
          {filters.search && (
            <button type="button" onClick={() => onFilterChange({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <FilterToggleButton hasActiveFilters={hasActiveFilters} activeCount={activeCount} filterLabel={t.filters.value} onClick={onToggleFilters} />
      </div>
      {showFilters && <FilterPanel filters={filters} categories={categories} hasActiveFilters={hasActiveFilters} onFilterChange={onFilterChange} onClearFilters={onClearFilters} t={t} />}
    </div>
  );
}
