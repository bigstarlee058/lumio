'use client';

import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { FilterRow } from '@/app/(main)/statements/components/filters/FilterRow';
import { FilterSection } from '@/app/(main)/statements/components/filters/FilterSection';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { CustomTableSortOrder, CustomTableSourceFilter } from '@/app/lib/custom-table-actions';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import { ChevronLeft } from 'lucide-react';

type FilterOption<T extends string> = {
  value: T;
  label: string;
};

type FiltersLabels = {
  title: string;
  resetFilters: string;
  viewResults: string;
  saveSearch: string;
  general: string;
  source: string;
  sort: string;
  any: string;
};

type CustomTableFilters = {
  source: CustomTableSourceFilter;
  sortOrder: CustomTableSortOrder;
};

type CustomTablesFiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: CustomTableFilters;
  screen: string;
  onBack: () => void;
  onSelect: (field: string) => void;
  onUpdateFilters: (next: Partial<CustomTableFilters>) => void;
  onResetAll: () => void;
  onViewResults: () => void;
  sourceOptions: FilterOption<CustomTableSourceFilter>[];
  sortOptions: FilterOption<CustomTableSortOrder>[];
  labels: FiltersLabels;
  activeCount: number;
};

export function CustomTablesFiltersDrawer({
  open,
  onClose,
  filters,
  screen,
  onBack,
  onSelect,
  onUpdateFilters,
  onResetAll,
  onViewResults,
  sourceOptions,
  sortOptions,
  labels,
  activeCount,
}: CustomTablesFiltersDrawerProps) {
  const isRoot = screen === 'root';
  const screenTitle = isRoot ? labels.title : screen === 'source' ? labels.source : labels.sort;

  const resolveOptionLabel = <T extends string>(
    options: FilterOption<T>[],
    value: T,
    fallback = labels.any,
  ) => options.find(option => option.value === value)?.label ?? fallback;

  const renderScreenContent = () => {
    if (screen === 'source') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={filters.source === 'all'}
            onClick={() => onUpdateFilters({ source: 'all' })}
            variant="radio"
          />
          {sourceOptions
            .filter(option => option.value !== 'all')
            .map(option => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.source === option.value}
                onClick={() => onUpdateFilters({ source: option.value })}
                variant="radio"
              />
            ))}
        </Box>
      );
    }

    if (screen === 'sort') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {sortOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.sortOrder === option.value}
              onClick={() => onUpdateFilters({ sortOrder: option.value })}
              variant="radio"
            />
          ))}
        </Box>
      );
    }

    return null;
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      title={
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <button
              type="button"
              onClick={isRoot ? onClose : onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                padding: 8,
                color: '#6b7280',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              aria-label={screenTitle}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              {screenTitle}
            </span>
          </Box>
          {isRoot ? (
            <button
              type="button"
              onClick={onResetAll}
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              {labels.resetFilters}
            </button>
          ) : null}
        </Box>
      }
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        {isRoot ? (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, pb: 7 }}>
            <FilterSection title={labels.general}>
              <FilterRow
                label={labels.source}
                value={
                  filters.source === 'all'
                    ? labels.any
                    : resolveOptionLabel(sourceOptions, filters.source)
                }
                onClick={() => onSelect('source')}
              />
              <FilterRow
                label={labels.sort}
                value={resolveOptionLabel(sortOptions, filters.sortOrder, '')}
                onClick={() => onSelect('sort')}
              />
            </FilterSection>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, pb: 5 }}>
            <Box sx={{ borderRadius: 4, bgcolor: 'transparent', p: 0 }}>{renderScreenContent()}</Box>
          </Box>
        )}

        {isRoot ? (
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              pt: 2,
              pb: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: 'background.paper',
            }}
          >
            <MuiButton
              variant="outlined"
              fullWidth
              size="large"
              disabled
              sx={{ borderRadius: 999 }}
            >
              {labels.saveSearch}
            </MuiButton>
            <MuiButton
              variant="contained"
              fullWidth
              size="large"
              onClick={onViewResults}
              sx={{ borderRadius: 999 }}
            >
              {labels.viewResults}
              {activeCount > 0 ? (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    display: 'inline-flex',
                    height: 24,
                    width: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {activeCount}
                </Box>
              ) : null}
            </MuiButton>
          </Box>
        ) : (
          <Box sx={{ position: 'sticky', bottom: 0, pt: 2, pb: 1, bgcolor: 'background.paper' }}>
            <MuiButton
              variant="contained"
              fullWidth
              size="large"
              onClick={onViewResults}
              sx={{ borderRadius: 999 }}
            >
              {labels.viewResults}
              {activeCount > 0 ? (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    display: 'inline-flex',
                    height: 24,
                    width: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {activeCount}
                </Box>
              ) : null}
            </MuiButton>
          </Box>
        )}
      </Box>
    </DrawerShell>
  );
}
