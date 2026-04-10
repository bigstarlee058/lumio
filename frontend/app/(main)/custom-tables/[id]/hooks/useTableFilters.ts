'use client';

import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { useMemo, useState } from 'react';
import type { ColumnFilterState, RowFilterOp } from './useColumnConfig';
import type { RowFilter } from '../utils/stylingUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface UseTableFiltersParams {
  orderedColumns: CustomTablePageColumn[];
  columnFilters: Record<string, ColumnFilterState>;
  gridFiltersParam: string | undefined;
  activeTabFilter: RowFilter | null;
  searchQuery: string;
  dateFnsLocale: Locale;
}

export interface UseTableFiltersReturn {
  dateFrom: string | null;
  setDateFrom: React.Dispatch<React.SetStateAction<string | null>>;
  dateTo: string | null;
  setDateTo: React.Dispatch<React.SetStateAction<string | null>>;
  combinedFiltersParam: string | undefined;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const raw = typeof value === 'string' ? value : String(value);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseFiltersParam(raw: string | undefined): RowFilter[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RowFilter[]) : [];
  } catch {
    return [];
  }
}

export function useTableFilters({
  orderedColumns,
  columnFilters,
  gridFiltersParam,
  activeTabFilter,
  searchQuery,
  dateFnsLocale,
}: UseTableFiltersParams): UseTableFiltersReturn {
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const requestFilters = useMemo<RowFilter[]>(() => {
    const result: RowFilter[] = [];
    const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd', { locale: dateFnsLocale });

    for (const col of orderedColumns) {
      const state = columnFilters[col.key];
      if (!state) continue;

      if (col.type === 'number') {
        const min = state?.min !== undefined && state?.min !== '' ? Number(state.min) : undefined;
        const max = state?.max !== undefined && state?.max !== '' ? Number(state.max) : undefined;
        if (min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max)) {
          result.push({ col: col.key, op: 'between', value: [min, max] });
        } else if (min !== undefined && Number.isFinite(min)) {
          result.push({ col: col.key, op: 'gte', value: min });
        } else if (max !== undefined && Number.isFinite(max)) {
          result.push({ col: col.key, op: 'lte', value: max });
        }
        continue;
      }

      if (col.type === 'date') {
        const from = state?.from ? new Date(`${state.from}T00:00:00`) : undefined;
        const to = state?.to ? new Date(`${state.to}T00:00:00`) : undefined;
        const fromOk = from && !Number.isNaN(from.getTime());
        const toOk = to && !Number.isNaN(to.getTime());
        if (fromOk && toOk && from && to) {
          result.push({ col: col.key, op: 'between', value: [toIsoDate(from), toIsoDate(to)] });
        } else if (fromOk && from) {
          result.push({ col: col.key, op: 'gte', value: toIsoDate(from) });
        } else if (toOk && to) {
          result.push({ col: col.key, op: 'lte', value: toIsoDate(to) });
        }
        continue;
      }

      const op: RowFilterOp = state?.op || 'contains';
      if (op === 'isEmpty' || op === 'isNotEmpty') {
        result.push({ col: col.key, op });
        continue;
      }
      const rawValue = typeof state?.value === 'string' ? state.value : String(state?.value ?? '');
      const value = rawValue.trim();
      if (!value) continue;
      result.push({ col: col.key, op, value });
    }
    return result;
  }, [orderedColumns, columnFilters, dateFnsLocale]);

  const dateFilterColKey = useMemo(() => {
    const firstDateCol = orderedColumns.find(c => c.type === 'date');
    return firstDateCol?.key || null;
  }, [orderedColumns]);

  const dateFilters = useMemo<RowFilter[]>(() => {
    if (!dateFilterColKey) return [];
    const from = parseDateValue(dateFrom);
    const to = parseDateValue(dateTo);
    const fromOk = from && !Number.isNaN(from.getTime());
    const toOk = to && !Number.isNaN(to.getTime());
    if (!fromOk && !toOk) return [];
    const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd', { locale: dateFnsLocale });
    if (fromOk && toOk && from && to) {
      return [{ col: dateFilterColKey, op: 'between', value: [toIsoDate(from), toIsoDate(to)] }];
    }
    if (fromOk && from) return [{ col: dateFilterColKey, op: 'gte', value: toIsoDate(from) }];
    if (toOk && to) return [{ col: dateFilterColKey, op: 'lte', value: toIsoDate(to) }];
    return [];
  }, [dateFilterColKey, dateFrom, dateTo, dateFnsLocale]);

  const searchFilter = useMemo<RowFilter | null>(() => {
    const value = searchQuery.trim();
    if (!value) return null;
    return { col: '__search__', op: 'search', value };
  }, [searchQuery]);

  const combinedFiltersParam = useMemo(() => {
    const base = parseFiltersParam(gridFiltersParam);
    const tabFilters = activeTabFilter ? [activeTabFilter] : [];
    const searchFilters = searchFilter ? [searchFilter] : [];
    const overrideCols = new Set<string>([
      ...requestFilters.map(f => f.col),
      ...dateFilters.map(f => f.col),
      ...tabFilters.map(f => f.col),
      ...searchFilters.map(f => f.col),
    ]);
    const baseWithoutOverrides = base.filter(f => !overrideCols.has(f.col));
    const merged = [
      ...baseWithoutOverrides,
      ...requestFilters,
      ...dateFilters,
      ...tabFilters,
      ...searchFilters,
    ];
    return merged.length ? JSON.stringify(merged) : undefined;
  }, [gridFiltersParam, requestFilters, dateFilters, activeTabFilter, searchFilter]);

  return { dateFrom, setDateFrom, dateTo, setDateTo, combinedFiltersParam };
}
