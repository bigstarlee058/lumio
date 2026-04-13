import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { buildCurrencySearchIndex } from '@/app/lib/statement-expense-drawer';
import type { CurrencySearchItem } from '@/app/lib/statement-expense-drawer';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { Check, ChevronLeft, Search, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface ParsingWarningsPanelProps {
  warnings: string[];
  droppedSamples?: Array<string | ParsingDroppedSample>;
  onConvertDroppedSample?: (
    sample: ParsingDroppedSample,
    index: number,
    warning?: string,
  ) => void | Promise<void>;
  onResolveWarning?: (warning: string, index: number) => void;
  fixTooltipLabel?: string;
  resolveBalanceTooltipLabel?: string;
  title?: string;
  helperText?: string;
}

export interface ParsingDroppedSampleTransaction {
  transactionDate?: string;
  counterpartyName?: string;
  paymentPurpose?: string;
  debit?: number;
  credit?: number;
  currency?: string;
  documentNumber?: string;
  counterpartyBin?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  article?: string;
  comments?: string;
  branchId?: string;
  walletId?: string;
  categoryId?: string;
  [key: string]: unknown;
}

export interface ParsingDroppedSample {
  reason: string;
  transaction?: ParsingDroppedSampleTransaction;
}

interface DroppedSampleDraft {
  transactionDate: string;
  counterpartyName: string;
  paymentPurpose: string;
  debit: string;
  credit: string;
  currency: string;
}

interface EditableWarningEntry {
  key: string;
  sample: ParsingDroppedSample;
  reason: string;
  txKey: string | null;
  action: 'convert' | 'resolve';
}

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

const isCurrencySearchItem = (item: CurrencySearchItem | undefined): item is CurrencySearchItem =>
  item !== undefined;

const toStringValue = (value: unknown) => (typeof value === 'string' ? value : '');

const toNumberString = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed;
  }

  return '';
};

const toDraft = (sample: string | ParsingDroppedSample): DroppedSampleDraft => {
  if (typeof sample === 'string') {
    return {
      transactionDate: '',
      counterpartyName: '',
      paymentPurpose: '',
      debit: '',
      credit: '',
      currency: '',
    };
  }

  return {
    transactionDate: toStringValue(sample.transaction?.transactionDate),
    counterpartyName: toStringValue(sample.transaction?.counterpartyName),
    paymentPurpose: toStringValue(sample.transaction?.paymentPurpose),
    debit: toNumberString(sample.transaction?.debit),
    credit: toNumberString(sample.transaction?.credit),
    currency: normalizeCurrencyCode(toStringValue(sample.transaction?.currency)),
  };
};

const parsePositiveNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const hasValidDate = (value: string) => {
  if (!value.trim()) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const canConvertDraft = (draft: DroppedSampleDraft) => {
  const debit = parsePositiveNumber(draft.debit);
  const credit = parsePositiveNumber(draft.credit);
  return hasValidDate(draft.transactionDate) && Boolean(debit || credit);
};

const extractTxKey = (value: string) => {
  const match = value.match(/tx#\d+/i);
  return match ? match[0].toLowerCase() : null;
};

const isRepairableWarning = (value: string) => /tx#\d+/i.test(value) && /\bskipped\b/i.test(value);

const isBalanceMismatchWarning = (value: string) => /^Balance mismatch:/i.test(value);

const toDroppedSample = (sample: string | ParsingDroppedSample): ParsingDroppedSample =>
  typeof sample === 'string' ? { reason: sample } : sample;

export const formatDroppedSample = (sample: string | ParsingDroppedSample) => {
  if (typeof sample === 'string') {
    return sample;
  }

  const counterpartyName =
    typeof sample.transaction?.counterpartyName === 'string'
      ? sample.transaction.counterpartyName.trim()
      : '';
  const paymentPurpose =
    typeof sample.transaction?.paymentPurpose === 'string'
      ? sample.transaction.paymentPurpose.trim()
      : '';

  const context = [counterpartyName, paymentPurpose].filter(Boolean).join(' - ');
  return context ? `${sample.reason}: ${context}` : sample.reason;
};

export function ParsingWarningsPanel({
  warnings,
  droppedSamples = [],
  onConvertDroppedSample,
  onResolveWarning,
  fixTooltipLabel = 'Fix',
  resolveBalanceTooltipLabel = 'Review balances',
  title = 'Parsing warnings',
  helperText = 'Review the flagged rows before submitting this statement.',
}: ParsingWarningsPanelProps) {
  const [draftsByKey, setDraftsByKey] = useState<Record<string, DroppedSampleDraft>>({});
  const [convertingKey, setConvertingKey] = useState<string | null>(null);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);
  const [selectedWarning, setSelectedWarning] = useState<{
    entryKey: string;
    warning: string;
    warningIndex: number;
  } | null>(null);
  const editableEntries = useMemo<EditableWarningEntry[]>(() => {
    const sampleEntries: EditableWarningEntry[] = droppedSamples.map((sample, index) => {
      const normalized = toDroppedSample(sample);
      return {
        key: `sample:${index}`,
        sample: normalized,
        reason: normalized.reason,
        txKey: extractTxKey(normalized.reason),
        action: 'convert',
      } satisfies EditableWarningEntry;
    });

    const sampleKeyByReason = new Map(
      sampleEntries.map(entry => [entry.reason, entry.key] as const),
    );
    const sampleKeyByTxKey = new Map(
      sampleEntries
        .filter((entry): entry is EditableWarningEntry & { txKey: string } => Boolean(entry.txKey))
        .map(entry => [entry.txKey, entry.key] as const),
    );

    const fallbackEntries = warnings.flatMap((warning, warningIndex) => {
      const warningTxKey = extractTxKey(warning);
      const matchedKey =
        sampleKeyByReason.get(warning) ??
        (warningTxKey ? sampleKeyByTxKey.get(warningTxKey) : undefined);

      if (matchedKey || (!isRepairableWarning(warning) && !isBalanceMismatchWarning(warning))) {
        return [];
      }

      return [
        {
          key: `warning:${warningIndex}`,
          sample: { reason: warning },
          reason: warning,
          txKey: warningTxKey,
          action: isBalanceMismatchWarning(warning) ? 'resolve' : 'convert',
        } satisfies EditableWarningEntry,
      ];
    });

    return [...sampleEntries, ...fallbackEntries];
  }, [droppedSamples, warnings]);
  const editableEntryByKey = useMemo(
    () => new Map(editableEntries.map(entry => [entry.key, entry] as const)),
    [editableEntries],
  );
  const editableEntryByReason = useMemo(
    () => new Map(editableEntries.map(entry => [entry.reason, entry] as const)),
    [editableEntries],
  );
  const editableEntryByTxKey = useMemo(
    () =>
      new Map(
        editableEntries
          .filter((entry): entry is EditableWarningEntry & { txKey: string } =>
            Boolean(entry.txKey),
          )
          .map(entry => [entry.txKey, entry] as const),
      ),
    [editableEntries],
  );

  useEffect(() => {
    setDraftsByKey(current => {
      const next: Record<string, DroppedSampleDraft> = {};

      editableEntries.forEach(entry => {
        next[entry.key] = current[entry.key] ?? toDraft(entry.sample);
      });

      return next;
    });
  }, [editableEntries]);

  useEffect(() => {
    if (!selectedWarning) return;

    const entry = editableEntryByKey.get(selectedWarning.entryKey);
    if (!entry || !warnings.includes(selectedWarning.warning)) {
      setSelectedWarning(null);
    }
  }, [editableEntryByKey, selectedWarning, warnings]);

  useEffect(() => {
    if (!selectedWarning) {
      setCurrencyPickerOpen(false);
      setCurrencySearch('');
    }
  }, [selectedWarning]);

  if (warnings.length === 0 && droppedSamples.length === 0) {
    return null;
  }

  const updateDraft = (key: string, field: keyof DroppedSampleDraft, value: string) => {
    setDraftsByKey(current => ({
      ...current,
      [key]: {
        ...(current[key] || toDraft('')),
        [field]: value,
      },
    }));
  };

  const handleConvert = async (
    entry: EditableWarningEntry,
    warningIndex: number,
    warning: string,
  ) => {
    if (!onConvertDroppedSample) {
      return;
    }

    const draft = draftsByKey[entry.key] || toDraft(entry.sample);
    if (!canConvertDraft(draft)) {
      return;
    }

    const debit = parsePositiveNumber(draft.debit);
    const credit = parsePositiveNumber(draft.credit);
    const nextSample: ParsingDroppedSample = {
      ...entry.sample,
      transaction: {
        ...entry.sample.transaction,
        transactionDate: draft.transactionDate,
        counterpartyName: draft.counterpartyName.trim(),
        paymentPurpose: draft.paymentPurpose.trim(),
        debit: debit ?? undefined,
        credit: credit ?? undefined,
        currency: normalizeCurrencyCode(draft.currency) || undefined,
      },
    };

    setConvertingKey(entry.key);

    try {
      await Promise.resolve(onConvertDroppedSample(nextSample, warningIndex, warning));
      setSelectedWarning(current => (current?.entryKey === entry.key ? null : current));
    } finally {
      setConvertingKey(current => (current === entry.key ? null : current));
    }
  };

  const handleResolve = (warning: string, warningIndex: number) => {
    onResolveWarning?.(warning, warningIndex);
  };

  const selectedEntry = selectedWarning
    ? editableEntryByKey.get(selectedWarning.entryKey) || null
    : null;
  const selectedDraft = selectedEntry
    ? draftsByKey[selectedEntry.key] || toDraft(selectedEntry.sample)
    : null;
  const selectedCanConvert = selectedDraft ? canConvertDraft(selectedDraft) : false;
  const selectedIsConverting = selectedEntry !== null && convertingKey === selectedEntry.key;
  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);
  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item] as const)),
    [currencyItems],
  );
  const selectedCurrencyCode = normalizeCurrencyCode(selectedDraft?.currency || '');
  const selectedCurrencyItem = selectedCurrencyCode
    ? currencyByCode.get(selectedCurrencyCode) || null
    : null;
  const currencyQuery = currencySearch.trim().toLowerCase();
  const selectedMatchesSearch =
    !selectedCurrencyItem || !currencyQuery
      ? Boolean(selectedCurrencyItem)
      : selectedCurrencyItem.searchText.includes(currencyQuery);
  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter(isCurrencySearchItem)
        .filter(item => item.code !== selectedCurrencyCode),
    [currencyByCode, recentCurrencies, selectedCurrencyCode],
  );
  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== selectedCurrencyCode);
  }, [currencyItems, currencyQuery, selectedCurrencyCode]);

  const handleCloseCurrencyPicker = () => {
    setCurrencyPickerOpen(false);
    setCurrencySearch('');
  };

  const handleSelectCurrency = (currencyCode: string) => {
    if (!selectedEntry) {
      return;
    }

    updateDraft(selectedEntry.key, 'currency', currencyCode);
    setRecentCurrencies(current => [
      currencyCode,
      ...current.filter(item => item !== currencyCode),
    ]);
    handleCloseCurrencyPicker();
  };

  return (
    <>
      <Alert
        severity="warning"
        variant="outlined"
        sx={{ mt: 3, alignItems: 'flex-start' }}
      >
        <AlertTitle sx={{ mb: 0.5 }}>{title}</AlertTitle>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {helperText}
        </Typography>
        {warnings.length > 0 && (
          <Box sx={{ bgcolor: 'warning.50', px: 1.5, py: 0.5 }}>
            <List dense disablePadding>
              {warnings.map((warning, index) => (
                <ListItem key={`${index}-${warning}`} disableGutters alignItems="flex-start">
                  {(() => {
                    const warningTxKey = extractTxKey(warning);
                    const matchedEntry =
                      editableEntryByReason.get(warning) ??
                      (warningTxKey ? editableEntryByTxKey.get(warningTxKey) : undefined);

                    return matchedEntry ? (
                      <Tooltip
                        title={
                          matchedEntry.action === 'resolve'
                            ? resolveBalanceTooltipLabel
                            : fixTooltipLabel
                        }
                        placement="top"
                        enterDelay={150}
                      >
                        <Button
                          variant="text"
                          onClick={() => {
                            if (matchedEntry.action === 'resolve') {
                              handleResolve(warning, index);
                              return;
                            }

                            setSelectedWarning({
                              entryKey: matchedEntry.key,
                              warning,
                              warningIndex: index,
                            });
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            alignItems: 'flex-start',
                            gap: 1,
                            px: 1,
                            py: 1,
                            mx: -1,
                            minWidth: 0,
                            width: 'calc(100% + 16px)',
                            color: 'warning.dark',
                            textTransform: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 150ms ease',
                            '&:hover': {
                              bgcolor: 'rgba(25, 118, 210, 0.08)',
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: '1px',
                            },
                          }}
                        >
                          <TriangleAlert size={16} style={{ color: '#ed6c02', marginTop: 2, flexShrink: 0 }} />
                          <Typography variant="body2">{warning}</Typography>
                        </Button>
                      </Tooltip>
                    ) : (
                      <>
                        <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                          <TriangleAlert size={16} style={{ color: '#ed6c02' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={warning}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </>
                    );
                  })()}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        <Dialog
          open={selectedWarning !== null && selectedEntry !== null && selectedDraft !== null}
          onClose={() => setSelectedWarning(null)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Convert dropped row</DialogTitle>
          {selectedWarning !== null && selectedEntry !== null && selectedDraft !== null ? (
            <>
              <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedWarning.warning}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    type="date"
                    label="Date"
                    name={`droppedSamples.${selectedEntry.key}.transactionDate`}
                    value={selectedDraft.transactionDate}
                    onChange={event =>
                      updateDraft(selectedEntry.key, 'transactionDate', event.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    label="Counterparty"
                    name={`droppedSamples.${selectedEntry.key}.counterpartyName`}
                    value={selectedDraft.counterpartyName}
                    onChange={event =>
                      updateDraft(selectedEntry.key, 'counterpartyName', event.target.value)
                    }
                  />
                  <TextField
                    size="small"
                    label="Payment purpose"
                    name={`droppedSamples.${selectedEntry.key}.paymentPurpose`}
                    value={selectedDraft.paymentPurpose}
                    onChange={event =>
                      updateDraft(selectedEntry.key, 'paymentPurpose', event.target.value)
                    }
                  />
                  <TextField
                    size="small"
                    label="Currency"
                    name={`droppedSamples.${selectedEntry.key}.currency`}
                    value={selectedDraft.currency}
                    onClick={() => setCurrencyPickerOpen(true)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        setCurrencyPickerOpen(true);
                      }
                    }}
                    InputProps={{ readOnly: true }}
                    sx={{
                      '& .MuiInputBase-input': {
                        cursor: 'pointer',
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Debit"
                    name={`droppedSamples.${selectedEntry.key}.debit`}
                    value={selectedDraft.debit}
                    onChange={event => updateDraft(selectedEntry.key, 'debit', event.target.value)}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Credit"
                    name={`droppedSamples.${selectedEntry.key}.credit`}
                    value={selectedDraft.credit}
                    onChange={event => updateDraft(selectedEntry.key, 'credit', event.target.value)}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: 'block' }}
                >
                  Fill in a valid date and either debit or credit to convert this row.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedWarning(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  disabled={!selectedCanConvert || selectedIsConverting}
                  onClick={() => {
                    void handleConvert(
                      selectedEntry,
                      selectedWarning.warningIndex,
                      selectedWarning.warning,
                    );
                  }}
                >
                  Convert to transaction
                </Button>
              </DialogActions>
            </>
          ) : null}
        </Dialog>
      </Alert>

      <DrawerShell
        isOpen={currencyPickerOpen && selectedEntry !== null && selectedDraft !== null}
        onClose={handleCloseCurrencyPicker}
        position="right"
        width="sm"
        showCloseButton={false}
        title={
          <div className="lumio-payable-drawer__title-wrap">
            <button
              type="button"
              onClick={handleCloseCurrencyPicker}
              className="lumio-col-drawer__back-btn"
              aria-label="Select a currency"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Select a currency</span>
          </div>
        }
      >
        <div className="lumio-cat-drawer">
          <div className="lumio-cat-drawer__search">
            <label className="lumio-cat-drawer__search-label">
              <Search size={20} className="lumio-cat-drawer__search-icon" />
              <input
                type="text"
                value={currencySearch}
                onChange={event => setCurrencySearch(event.target.value)}
                placeholder="Search"
                className="lumio-cat-drawer__search-input"
              />
            </label>
          </div>

          <div className="lumio-cat-drawer__list">
            {selectedCurrencyItem && selectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                style={{ marginTop: 20, display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, background: '#ebe8e2', padding: '16px', textAlign: 'left', border: 'none', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f3428' }}>
                  {selectedCurrencyItem.label}
                </span>
                <Check size={20} color="var(--primary)" />
              </button>
            ) : null}

            {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p style={{ padding: '0 4px', fontSize: 14, color: '#6b7280' }}>Recents</p>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentCurrencyItems.map(item => (
                    <button
                      key={`recent-${item.code}`}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, padding: '12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#0f3428' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 24 }}>
              <p style={{ padding: '0 4px', fontSize: 14, color: '#6b7280' }}>All</p>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allCurrencyItems.length > 0 ? (
                  allCurrencyItems.map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, padding: '12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#0f3428' }}>{item.label}</span>
                    </button>
                  ))
                ) : (
                  <p style={{ borderRadius: 0, background: 'var(--card-bg)', padding: '12px', fontSize: 14, color: '#6b7280' }}>
                    No currencies found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
