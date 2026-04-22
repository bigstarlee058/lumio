'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { ChevronLeft } from 'lucide-react';
import { FilterOptionRow } from './FilterOptionRow';
import { FilterRow } from './FilterRow';
import { FilterSection } from './FilterSection';
import type {
  StatementFilterDateMode,
  StatementFilterDatePreset,
  StatementFilters,
} from './statement-filters';

type FiltersDrawerLabels = {
  title: string;
  viewResults: string;
  saveSearch: string;
  resetFilters: string;
  general: string;
  expenses: string;
  reports: string;
  type: string;
  from: string;
  groupBy: string;
  has: string;
  keywords: string;
  limit: string;
  status: string;
  to: string;
  amount: string;
  approved: string;
  billable: string;
  currency: string;
  date: string;
  exported: string;
  paid: string;
  any: string;
  yes: string;
  no: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type FilterDatePresetOption = {
  value: StatementFilterDatePreset;
  label: string;
};

type FilterDateModeOption = {
  value: StatementFilterDateMode;
  label: string;
};

type FilterAvatarOption = {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
  bankName?: string | null;
};

type FiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: StatementFilters;
  screen: string;
  visibleScreens?: string[];
  onBack: () => void;
  onSelect: (field: string) => void;
  onUpdateFilters: (next: Partial<StatementFilters>) => void;
  onResetAll: () => void;
  onViewResults: () => void;
  typeOptions: FilterOption[];
  statusOptions: FilterOption[];
  datePresets: FilterDatePresetOption[];
  dateModes: FilterDateModeOption[];
  fromOptions: FilterAvatarOption[];
  toOptions: FilterAvatarOption[];
  groupByOptions: FilterOption[];
  hasOptions: FilterOption[];
  currencyOptions: string[];
  labels: FiltersDrawerLabels;
  activeCount: number;
};

export function FiltersDrawer({
  open,
  onClose,
  filters,
  screen,
  visibleScreens,
  onBack,
  onSelect,
  onUpdateFilters,
  onResetAll,
  onViewResults,
  typeOptions,
  statusOptions,
  datePresets,
  dateModes,
  fromOptions,
  toOptions,
  groupByOptions,
  hasOptions,
  currencyOptions,
  labels,
  activeCount,
}: FiltersDrawerProps) {
  const summaryValue = (value?: string | null, fallback?: string) =>
    value && value.length > 0 ? value : fallback || labels.any;

  const isRoot = screen === 'root';
  const allowedScreens = new Set(visibleScreens || []);
  const isScreenVisible = (screenId: string) =>
    visibleScreens === undefined || allowedScreens.has(screenId);
  const screenTitle = isRoot
    ? labels.title
    : {
        type: labels.type,
        status: labels.status,
        date: labels.date,
        from: labels.from,
        to: labels.to,
        keywords: labels.keywords,
        amount: labels.amount,
        approved: labels.approved,
        billable: labels.billable,
        groupBy: labels.groupBy,
        has: labels.has,
        limit: labels.limit,
        currency: labels.currency,
        exported: labels.exported,
        paid: labels.paid,
      }[screen] || labels.title;

  const toggleValue = (values: string[], value: string) =>
    values.includes(value) ? values.filter(item => item !== value) : [...values, value];

  const parseNumberInput = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--lumio-radius-md)',
    border: '1px solid #e5e7eb',
    background: 'var(--card-bg)',
    padding: '8px 12px',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const renderScreenContent = () => {
    if (screen === 'type') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={!filters.type}
            onClick={() => onUpdateFilters({ type: null })}
            variant="radio"
          />
          {typeOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.type === option.value}
              onClick={() => onUpdateFilters({ type: option.value })}
              variant="radio"
            />
          ))}
        </Box>
      );
    }

    if (screen === 'status') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={filters.statuses.length === 0}
            onClick={() => onUpdateFilters({ statuses: [] })}
            variant="checkbox"
          />
          {statusOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.statuses.includes(option.value)}
              onClick={() =>
                onUpdateFilters({
                  statuses: toggleValue(filters.statuses, option.value),
                })
              }
              variant="checkbox"
            />
          ))}
        </Box>
      );
    }

    if (screen === 'date') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FilterOptionRow
              label={labels.any}
              selected={!filters.date}
              onClick={() => onUpdateFilters({ date: null })}
              variant="radio"
            />
            {datePresets.map(option => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.date?.preset === option.value}
                onClick={() => onUpdateFilters({ date: { preset: option.value } })}
                variant="radio"
              />
            ))}
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {dateModes.map(option => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.date?.mode === option.value}
                onClick={() =>
                  onUpdateFilters({
                    date: {
                      mode: option.value,
                      date: filters.date?.date || new Date().toISOString().slice(0, 10),
                    },
                  })
                }
                variant="radio"
              />
            ))}
            {filters.date?.mode ? (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(249,250,251,0.6)',
                  px: 1.5,
                  py: 1.5,
                }}
              >
                <input
                  type="date"
                  value={filters.date?.date || ''}
                  onChange={event =>
                    onUpdateFilters({
                      date: {
                        mode: filters.date?.mode,
                        date: event.target.value,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </Box>
            ) : null}
          </Box>
        </Box>
      );
    }

    if (screen === 'from' || screen === 'to') {
      const values = screen === 'from' ? filters.from : filters.to;
      const options = screen === 'from' ? fromOptions : toOptions;
      if (options.length === 0) {
        return (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
              fontSize: 14,
              color: 'text.secondary',
            }}
          >
            {labels.any}
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {options.map(option => (
            <FilterOptionRow
              key={option.id}
              label={option.label}
              description={option.description}
              avatarUrl={option.avatarUrl}
              bankName={option.bankName}
              selected={values.includes(option.id)}
              onClick={() =>
                screen === 'from'
                  ? onUpdateFilters({
                      from: toggleValue(values, option.id),
                    })
                  : onUpdateFilters({
                      to: toggleValue(values, option.id),
                    })
              }
            />
          ))}
        </Box>
      );
    }

    if (screen === 'keywords') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            {labels.keywords}
          </Typography>
          <input
            value={filters.keywords}
            onChange={event => onUpdateFilters({ keywords: event.target.value })}
            placeholder={labels.keywords}
            style={inputStyle}
          />
        </Box>
      );
    }

    if (screen === 'amount') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary">Min</Typography>
            <input
              inputMode="decimal"
              value={filters.amountMin !== null ? String(filters.amountMin) : ''}
              onChange={event =>
                onUpdateFilters({ amountMin: parseNumberInput(event.target.value) })
              }
              placeholder="0"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary">Max</Typography>
            <input
              inputMode="decimal"
              value={filters.amountMax !== null ? String(filters.amountMax) : ''}
              onChange={event =>
                onUpdateFilters({ amountMax: parseNumberInput(event.target.value) })
              }
              placeholder="0"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </Box>
        </Box>
      );
    }

    if (
      screen === 'approved' ||
      screen === 'billable' ||
      screen === 'exported' ||
      screen === 'paid'
    ) {
      const currentValue =
        screen === 'approved'
          ? filters.approved
          : screen === 'billable'
            ? filters.billable
            : screen === 'exported'
              ? filters.exported
              : filters.paid;
      const updateBooleanFilter = (value: boolean | null) => {
        if (screen === 'approved') {
          onUpdateFilters({ approved: value });
          return;
        }
        if (screen === 'billable') {
          onUpdateFilters({ billable: value });
          return;
        }
        if (screen === 'exported') {
          onUpdateFilters({ exported: value });
          return;
        }
        onUpdateFilters({ paid: value });
      };
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={currentValue === null}
            onClick={() => updateBooleanFilter(null)}
            variant="radio"
          />
          <FilterOptionRow
            label={labels.yes}
            selected={currentValue === true}
            onClick={() => updateBooleanFilter(true)}
            variant="radio"
          />
          <FilterOptionRow
            label={labels.no}
            selected={currentValue === false}
            onClick={() => updateBooleanFilter(false)}
            variant="radio"
          />
        </Box>
      );
    }

    if (screen === 'groupBy') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={!filters.groupBy}
            onClick={() => onUpdateFilters({ groupBy: null })}
            variant="radio"
          />
          {groupByOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.groupBy === option.value}
              onClick={() => onUpdateFilters({ groupBy: option.value })}
              variant="radio"
            />
          ))}
        </Box>
      );
    }

    if (screen === 'has') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={filters.has.length === 0}
            onClick={() => onUpdateFilters({ has: [] })}
            variant="checkbox"
          />
          {hasOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.has.includes(option.value)}
              onClick={() =>
                onUpdateFilters({
                  has: toggleValue(filters.has, option.value),
                })
              }
              variant="checkbox"
            />
          ))}
        </Box>
      );
    }

    if (screen === 'limit') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            {labels.limit}
          </Typography>
          <input
            inputMode="numeric"
            value={filters.limit !== null ? String(filters.limit) : ''}
            onChange={event => onUpdateFilters({ limit: parseNumberInput(event.target.value) })}
            placeholder="0"
            style={inputStyle}
          />
        </Box>
      );
    }

    if (screen === 'currency') {
      if (currencyOptions.length === 0) {
        return (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
              fontSize: 14,
              color: 'text.secondary',
            }}
          >
            {labels.any}
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FilterOptionRow
            label={labels.any}
            selected={filters.currencies.length === 0}
            onClick={() => onUpdateFilters({ currencies: [] })}
            variant="checkbox"
          />
          {currencyOptions.map(currency => (
            <FilterOptionRow
              key={currency}
              label={currency}
              selected={filters.currencies.includes(currency)}
              onClick={() =>
                onUpdateFilters({
                  currencies: toggleValue(filters.currencies, currency),
                })
              }
              variant="checkbox"
            />
          ))}
        </Box>
      );
    }

    return null;
  };

  const viewResultsButton = (
    <MuiButton variant="contained" sx={{ width: '100%' }} size="large" onClick={onViewResults}>
      {labels.viewResults}
      {activeCount > 0 ? (
        <Box
          component="span"
          sx={{
            ml: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 'var(--lumio-radius-full)',
            bgcolor: 'rgba(255,255,255,0.2)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {activeCount}
        </Box>
      ) : null}
    </MuiButton>
  );

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
            <IconButton
              type="button"
              onClick={isRoot ? onClose : onBack}
              aria-label={screenTitle}
              size="small"
            >
              <ChevronLeft size={20} />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              {screenTitle}
            </Typography>
          </Box>
          {isRoot ? (
            <button
              type="button"
              onClick={onResetAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--primary)',
              }}
            >
              {labels.resetFilters}
            </button>
          ) : null}
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {isRoot ? (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, pb: 14 }}>
            <FilterSection title={labels.general}>
              {isScreenVisible('type') ? (
                <FilterRow
                  label={labels.type}
                  value={summaryValue(filters.type)}
                  onClick={() => onSelect('type')}
                />
              ) : null}
              {isScreenVisible('from') ? (
                <FilterRow
                  label={labels.from}
                  value={summaryValue(filters.from.length ? `${filters.from.length}` : '')}
                  onClick={() => onSelect('from')}
                />
              ) : null}
              {isScreenVisible('keywords') ? (
                <FilterRow
                  label={labels.keywords}
                  value={summaryValue(filters.keywords)}
                  onClick={() => onSelect('keywords')}
                />
              ) : null}
              {isScreenVisible('status') ? (
                <FilterRow
                  label={labels.status}
                  value={summaryValue(filters.statuses.length ? `${filters.statuses.length}` : '')}
                  onClick={() => onSelect('status')}
                />
              ) : null}
              {isScreenVisible('to') ? (
                <FilterRow
                  label={labels.to}
                  value={summaryValue(filters.to.length ? `${filters.to.length}` : '')}
                  onClick={() => onSelect('to')}
                />
              ) : null}
              {isScreenVisible('groupBy') ? (
                <FilterRow
                  label={labels.groupBy}
                  value={summaryValue(filters.groupBy)}
                  onClick={() => onSelect('groupBy')}
                />
              ) : null}
              {isScreenVisible('has') ? (
                <FilterRow
                  label={labels.has}
                  value={summaryValue(filters.has.length ? `${filters.has.length}` : '')}
                  onClick={() => onSelect('has')}
                />
              ) : null}
              {isScreenVisible('limit') ? (
                <FilterRow
                  label={labels.limit}
                  value={summaryValue(filters.limit ? `${filters.limit}` : '')}
                  onClick={() => onSelect('limit')}
                />
              ) : null}
            </FilterSection>

            <FilterSection title={labels.expenses}>
              {isScreenVisible('amount') ? (
                <FilterRow
                  label={labels.amount}
                  value={summaryValue(filters.amountMin || filters.amountMax ? 'set' : '')}
                  onClick={() => onSelect('amount')}
                />
              ) : null}
              {isScreenVisible('billable') ? (
                <FilterRow
                  label={labels.billable}
                  value={
                    filters.billable === null
                      ? labels.any
                      : filters.billable
                        ? labels.yes
                        : labels.no
                  }
                  onClick={() => onSelect('billable')}
                />
              ) : null}
            </FilterSection>

            <FilterSection title={labels.reports}>
              {isScreenVisible('approved') ? (
                <FilterRow
                  label={labels.approved}
                  value={
                    filters.approved === null
                      ? labels.any
                      : filters.approved
                        ? labels.yes
                        : labels.no
                  }
                  onClick={() => onSelect('approved')}
                />
              ) : null}
              {isScreenVisible('currency') ? (
                <FilterRow
                  label={labels.currency}
                  value={summaryValue(
                    filters.currencies.length > 0 ? `${filters.currencies.length}` : '',
                  )}
                  onClick={() => onSelect('currency')}
                />
              ) : null}
              {isScreenVisible('date') ? (
                <FilterRow
                  label={labels.date}
                  value={summaryValue(filters.date ? 'set' : '')}
                  onClick={() => onSelect('date')}
                />
              ) : null}
              {isScreenVisible('exported') ? (
                <FilterRow
                  label={labels.exported}
                  value={
                    filters.exported === null
                      ? labels.any
                      : filters.exported
                        ? labels.yes
                        : labels.no
                  }
                  onClick={() => onSelect('exported')}
                />
              ) : null}
              {isScreenVisible('paid') ? (
                <FilterRow
                  label={labels.paid}
                  value={filters.paid === null ? labels.any : filters.paid ? labels.yes : labels.no}
                  onClick={() => onSelect('paid')}
                />
              ) : null}
            </FilterSection>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10 }}>
            <Box sx={{ bgcolor: 'transparent', p: 0 }}>{renderScreenContent()}</Box>
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
            <MuiButton variant="outlined" sx={{ width: '100%' }} size="large" disabled>
              {labels.saveSearch}
            </MuiButton>
            {viewResultsButton}
          </Box>
        ) : (
          <Box sx={{ position: 'sticky', bottom: 0, pt: 2, pb: 1, bgcolor: 'background.paper' }}>
            {viewResultsButton}
          </Box>
        )}
      </Box>
    </DrawerShell>
  );
}
