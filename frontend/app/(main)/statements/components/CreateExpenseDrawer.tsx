'use client';

import StatementCategoryDrawer from '@/app/(main)/statements/[id]/edit/StatementCategoryDrawer';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useLocale } from '@/app/i18n';
import {
  type StatementCategoryNode,
  flattenStatementCategories,
} from '@/app/lib/statement-categories';
import {
  ALWAYS_ALLOW_STATEMENT_DUPLICATES,
  type CurrencySearchItem,
  type ManualExpenseDraft,
  type StatementExpenseMode,
  type TaxRateOption,
  buildCurrencySearchIndex,
  computeManualAmountFontSize,
  hasPositiveManualAmount,
  resolveExpenseDrawerMode,
  sanitizeManualAmountInput,
  validateManualExpenseDraft,
} from '@/app/lib/statement-expense-drawer';
import { cn } from '@/app/lib/utils';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  PencilLine,
  Plus,
  ScanLine,
  Search,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  open: boolean;
  initialMode: StatementExpenseMode;
  defaultCurrency?: string | null;
  categories: StatementCategoryNode[];
  taxRates: TaxRateOption[];
  onClose: () => void;
  onSubmitScan: (payload: {
    files: File[];
    allowDuplicates: boolean;
    requireManualCategorySelection: boolean;
  }) => Promise<void>;
  onSubmitManual: (payload: {
    draft: ManualExpenseDraft;
    date: string;
    files: File[];
    allowDuplicates: boolean;
  }) => Promise<void>;
};

const resolveDefaultCurrency = (currency: string | null | undefined): string => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();

  return normalized.length > 0 ? normalized : 'KZT';
};

const createDefaultManualDraft = (currency: string): ManualExpenseDraft => ({
  amount: '',
  currency,
  description: '',
  merchant: '',
  categoryId: '',
  taxRateId: '',
});

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

type ManualStep = 'amount' | 'details';

export default function CreateExpenseDrawer({
  open,
  initialMode,
  defaultCurrency,
  categories,
  taxRates,
  onClose,
  onSubmitScan,
  onSubmitManual,
}: Props) {
  const { locale } = useLocale();
  const resolvedDefaultCurrency = resolveDefaultCurrency(defaultCurrency);
  const [mode, setMode] = useState<StatementExpenseMode>('scan');
  const [manualStep, setManualStep] = useState<ManualStep>('amount');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [taxRateDrawerOpen, setTaxRateDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [manualRecentCurrencies, setManualRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [manualDraft, setManualDraft] = useState<ManualExpenseDraft>(() =>
    createDefaultManualDraft(resolvedDefaultCurrency),
  );
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualAmountInputRef = useRef<HTMLInputElement | null>(null);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);

  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );

  const selectedCurrencyItem = currencyByCode.get(manualDraft.currency);
  const selectedCurrencySymbol = selectedCurrencyItem?.symbol ?? manualDraft.currency;
  const manualAmountFontSize = useMemo(
    () => computeManualAmountFontSize(manualDraft.amount),
    [manualDraft.amount],
  );
  const flatCategories = useMemo(
    () => flattenStatementCategories(categories, '', locale),
    [categories, locale],
  );
  const selectedCategoryName = useMemo(
    () => flatCategories.find(category => category.id === manualDraft.categoryId)?.name ?? '',
    [flatCategories, manualDraft.categoryId],
  );
  const defaultTaxRate = useMemo(
    () =>
      taxRates.find(taxRate => taxRate.isEnabled && taxRate.isDefault) ||
      taxRates.find(taxRate => taxRate.isEnabled) ||
      null,
    [taxRates],
  );
  const selectedTaxRate = useMemo(() => {
    if (!manualDraft.taxRateId) {
      return defaultTaxRate;
    }

    return taxRates.find(taxRate => taxRate.id === manualDraft.taxRateId) || null;
  }, [manualDraft.taxRateId, taxRates, defaultTaxRate]);
  const enabledTaxRates = useMemo(() => taxRates.filter(taxRate => taxRate.isEnabled), [taxRates]);

  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      manualRecentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== manualDraft.currency),
    [manualRecentCurrencies, currencyByCode, manualDraft.currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== manualDraft.currency);
  }, [currencyItems, currencyQuery, manualDraft.currency]);

  const hasManualAmount = useMemo(
    () => hasPositiveManualAmount(manualDraft.amount),
    [manualDraft.amount],
  );

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      return;
    }

    const resolvedMode = resolveExpenseDrawerMode(initialMode);
    setMode(resolvedMode);
    setManualStep('amount');
    setCurrencyPickerOpen(false);
    setCategoryDrawerOpen(false);
    setTaxRateDrawerOpen(false);
    setCurrencySearch('');
    setManualDraft(createDefaultManualDraft(resolvedDefaultCurrency));
  }, [open, initialMode, resolvedDefaultCurrency]);

  useEffect(() => {
    if (!open || mode !== 'manual' || manualStep !== 'amount' || currencyPickerOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      manualAmountInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, mode, manualStep, currencyPickerOpen]);

  const manualValidation = useMemo(() => validateManualExpenseDraft(manualDraft), [manualDraft]);

  const pushRecentCurrency = (currencyCode: string) => {
    setManualRecentCurrencies(prev => [
      currencyCode,
      ...prev.filter(item => item !== currencyCode),
    ]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    setManualDraft(prev => ({ ...prev, currency: currencyCode }));
    pushRecentCurrency(currencyCode);
    setCurrencySearch('');
    setCurrencyPickerOpen(false);
  };

  const handleClose = () => {
    setMode('scan');
    setManualStep('amount');
    setCurrencyPickerOpen(false);
    setCategoryDrawerOpen(false);
    setTaxRateDrawerOpen(false);
    setCurrencySearch('');
    setFiles([]);
    setManualDraft(createDefaultManualDraft(resolvedDefaultCurrency));
    setManualDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleBackClick = () => {
    if (categoryDrawerOpen) {
      setCategoryDrawerOpen(false);
      return;
    }

    if (taxRateDrawerOpen) {
      setTaxRateDrawerOpen(false);
      return;
    }

    if (mode === 'manual' && currencyPickerOpen) {
      setCurrencyPickerOpen(false);
      setCurrencySearch('');
      return;
    }

    if (mode === 'manual' && manualStep === 'details') {
      setManualStep('amount');
      return;
    }

    handleClose();
  };

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    setFiles(Array.from(selected));
    setError(null);
  };

  const handleManualNext = () => {
    if (!hasManualAmount) {
      setError('Enter a valid amount');
      return;
    }

    setError(null);
    setManualStep('details');
  };

  const handleSubmitScan = async () => {
    if (files.length === 0) {
      setError('Choose at least one file');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmitScan({
        files,
        allowDuplicates: ALWAYS_ALLOW_STATEMENT_DUPLICATES,
        requireManualCategorySelection: false,
      });
      handleClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to upload files');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!manualValidation.amount || !manualValidation.merchant || !manualValidation.category) {
      setError('Amount, merchant, and category are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmitManual({
        draft: manualDraft,
        date: manualDate,
        files,
        allowDuplicates: ALWAYS_ALLOW_STATEMENT_DUPLICATES,
      });
      handleClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit manual expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DrawerShell
        isOpen={open}
        onClose={handleClose}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close create expense drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">
              {currencyPickerOpen
                ? 'Select a currency'
                : mode === 'manual' && manualStep === 'details'
                  ? 'Confirm details'
                  : 'Create expense'}
            </span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          {!currencyPickerOpen ? (
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-full border border-border bg-muted/60 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('manual');
                  setManualStep('amount');
                  setCurrencyPickerOpen(false);
                }}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                  mode === 'manual'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <PencilLine className="h-4 w-4" />
                Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('scan');
                  setCurrencyPickerOpen(false);
                }}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                  mode === 'scan'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <ScanLine className="h-4 w-4" />
                Scan
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {currencyPickerOpen ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={currencySearch}
                    onChange={event => setCurrencySearch(event.target.value)}
                    placeholder="Search"
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                {selectedCurrencyItem && selectedMatchesSearch ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted px-4 py-4 text-left"
                  >
                    <span className="text-base font-semibold text-foreground">
                      {selectedCurrencyItem.label}
                    </span>
                    <Check className="h-5 w-5 text-primary" />
                  </button>
                ) : null}

                {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
                  <div>
                    <p className="px-1 text-sm text-muted-foreground">Recents</p>
                    <div className="mt-2 space-y-2">
                      {recentCurrencyItems.map(item => (
                        <button
                          key={`recent-${item.code}`}
                          type="button"
                          onClick={() => handleSelectCurrency(item.code)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                        >
                          <span className="text-base font-semibold text-foreground">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="px-1 text-sm text-muted-foreground">All</p>
                  <div className="mt-2 space-y-1">
                    {allCurrencyItems.length > 0 ? (
                      allCurrencyItems.map(item => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectCurrency(item.code)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                        >
                          <span className="text-base font-semibold text-foreground">
                            {item.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                        No currencies found
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : mode === 'scan' ? (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-muted/60 px-6 py-12 text-center">
                  <ReceiptLongIcon className="text-muted-foreground" sx={{ fontSize: 56 }} />
                  <p className="mt-6 text-[30px] font-semibold leading-none text-foreground">
                    Upload receipts
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">or drag and drop them here</p>
                  <span className="mt-6 inline-flex rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-white">
                    Choose files
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    capture="environment"
                    className="hidden"
                    multiple
                    onChange={event => handleFilesSelected(event.target.files)}
                  />
                </label>
              </>
            ) : manualStep === 'amount' ? (
              <div className="flex min-h-full flex-col justify-between">
                <div className="flex flex-1 flex-col items-center justify-center">
                  <label htmlFor="expense-manual-amount" className="sr-only">
                    Amount
                  </label>
                  <div className="mx-auto w-[290px] max-w-full">
                    <div className="flex h-24 w-full items-end justify-center gap-2">
                      <span
                        className="shrink-0 leading-none font-semibold text-foreground"
                        style={{ fontSize: manualAmountFontSize }}
                      >
                        {selectedCurrencySymbol}
                      </span>
                      <input
                        ref={manualAmountInputRef}
                        id="expense-manual-amount"
                        inputMode="decimal"
                        value={manualDraft.amount}
                        onChange={event =>
                          setManualDraft(prev => ({
                            ...prev,
                            amount: sanitizeManualAmountInput(event.target.value),
                          }))
                        }
                        placeholder="0"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 leading-none font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                        style={{ fontSize: manualAmountFontSize }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrencyPickerOpen(true)}
                      className="mt-12 inline-flex h-16 w-full items-center justify-center gap-2 rounded-full border border-border bg-muted px-6 text-lg font-semibold text-foreground"
                    >
                      {manualDraft.currency}
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label className="relative flex cursor-pointer items-center justify-center rounded-3xl border border-border bg-muted/60 px-6 py-8 text-center">
                  <FileText className="h-14 w-14 text-muted-foreground/60" />
                  <span className="absolute left-1/2 top-1/2 flex h-10 w-10 translate-x-2 translate-y-1 items-center justify-center rounded-full bg-primary text-white">
                    <Plus className="h-5 w-5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.csv,.xlsx,.xls"
                    capture="environment"
                    className="hidden"
                    multiple
                    onChange={event => handleFilesSelected(event.target.files)}
                  />
                </label>

                <div className="overflow-hidden rounded-3xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setManualStep('amount')}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="mt-1 text-[30px] leading-none font-semibold text-foreground">
                        {selectedCurrencySymbol}
                        {manualDraft.amount || '0.00'}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </button>

                  <div className="h-px bg-border" />

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="expense-manual-description"
                        className="text-sm text-muted-foreground"
                      >
                        Description
                      </label>
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <input
                      id="expense-manual-description"
                      value={manualDraft.description}
                      onChange={event =>
                        setManualDraft(prev => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className="mt-1.5 w-full border-0 bg-transparent p-0 text-[24px] leading-none text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>

                  <div className="h-px bg-border" />

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="expense-manual-merchant"
                        className="text-sm text-muted-foreground"
                      >
                        Merchant
                      </label>
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <input
                      id="expense-manual-merchant"
                      value={manualDraft.merchant}
                      onChange={event =>
                        setManualDraft(prev => ({
                          ...prev,
                          merchant: event.target.value,
                        }))
                      }
                      placeholder="Required"
                      className="mt-1.5 w-full border-0 bg-transparent p-0 text-[24px] leading-none text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    {!manualValidation.merchant ? (
                      <p className="mt-1 text-xs text-red-500">This field is required</p>
                    ) : null}
                  </div>

                  <div className="h-px bg-border" />

                  <button
                    type="button"
                    onClick={() => setCategoryDrawerOpen(true)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="mt-1.5 truncate text-[24px] leading-none text-foreground">
                        {selectedCategoryName || 'Required'}
                      </p>
                      {!manualValidation.category ? (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </button>

                  <div className="h-px bg-border" />

                  <div className="px-4 py-3">
                    <label htmlFor="expense-manual-date" className="text-sm text-muted-foreground">
                      Date
                    </label>
                    <div className="mt-1.5 flex items-center justify-between">
                      <input
                        id="expense-manual-date"
                        type="date"
                        value={manualDate}
                        onChange={event => setManualDate(event.target.value)}
                        className="border-0 bg-transparent p-0 text-[24px] leading-none text-foreground focus:outline-none"
                      />
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <button
                    type="button"
                    onClick={() => setTaxRateDrawerOpen(true)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Tax</p>
                      <p className="mt-1.5 truncate text-[24px] leading-none text-foreground">
                        {selectedTaxRate
                          ? `${selectedTaxRate.name} (${Number(selectedTaxRate.rate || 0).toFixed(0)}%)${selectedTaxRate.isDefault ? ' - Default' : ''}`
                          : 'Optional'}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </button>
                </div>
              </>
            )}

            {files.length > 0 && !currencyPickerOpen ? (
              <div className="rounded-2xl border border-border bg-card px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Selected files
                </p>
                <div className="mt-2 space-y-2">
                  {files.map(file => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="pt-4">
            <Button
              type="button"
              size="lg"
              className={cn(
                'w-full rounded-full',
                mode === 'manual' ? 'bg-primary hover:bg-primary-hover' : '',
              )}
              disabled={
                submitting ||
                currencyPickerOpen ||
                categoryDrawerOpen ||
                taxRateDrawerOpen ||
                (mode === 'manual' && manualStep === 'amount' && !hasManualAmount)
              }
              onClick={
                mode === 'scan'
                  ? handleSubmitScan
                  : manualStep === 'amount'
                    ? handleManualNext
                    : handleSubmitManual
              }
            >
              {submitting
                ? 'Saving...'
                : mode === 'scan'
                  ? 'Upload receipt'
                  : manualStep === 'amount'
                    ? 'Next'
                    : `Create ${selectedCurrencySymbol}${manualDraft.amount || '0.00'} expense`}
            </Button>
          </div>
        </div>
      </DrawerShell>

      <StatementCategoryDrawer
        open={open && mode === 'manual' && manualStep === 'details' && categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        categories={categories}
        selectedCategoryId={manualDraft.categoryId}
        selecting={false}
        onSelect={categoryId => {
          setManualDraft(prev => ({
            ...prev,
            categoryId,
          }));
          setCategoryDrawerOpen(false);
          setError(null);
        }}
        labels={{
          title: 'Category',
          searchPlaceholder: 'Search categories',
          allOption: 'No category',
          noResults: 'No categories found',
        }}
        width="lg"
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        showAllOption={false}
      />

      <DrawerShell
        isOpen={open && mode === 'manual' && manualStep === 'details' && taxRateDrawerOpen}
        onClose={() => setTaxRateDrawerOpen(false)}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTaxRateDrawerOpen(false)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close tax rate drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">Tax rate</span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-transparent">
              {enabledTaxRates.map(taxRate => {
                const isSelected = manualDraft.taxRateId
                  ? manualDraft.taxRateId === taxRate.id
                  : defaultTaxRate?.id === taxRate.id;

                return (
                  <button
                    key={taxRate.id}
                    type="button"
                    onClick={() => {
                      setManualDraft(prev => ({
                        ...prev,
                        taxRateId: taxRate.id,
                      }));
                      setTaxRateDrawerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>
                      {taxRate.name} ({Number(taxRate.rate || 0).toFixed(0)}%)
                      {taxRate.isDefault ? ' - Default' : ''}
                    </span>
                    {isSelected ? <Check className="h-6 w-6 text-primary" /> : null}
                  </button>
                );
              })}
              {enabledTaxRates.length === 0 ? (
                <div className="px-4 py-8 text-base text-muted-foreground">No tax rates found</div>
              ) : null}
            </div>
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
