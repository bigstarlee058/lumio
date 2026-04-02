'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Button } from '@/app/components/ui/button';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import { Check, ChevronDown, ChevronLeft, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EditableReceiptParsedData, ReceiptCategoryOption } from './receipt-types';

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

export interface ReceiptParsedDataFormProps {
  value: EditableReceiptParsedData;
  categories: ReceiptCategoryOption[];
  onChange: (value: EditableReceiptParsedData) => void;
  onCurrencyChange?: (value: EditableReceiptParsedData) => void | Promise<void>;
}

export function ReceiptParsedDataForm({
  value,
  categories,
  onChange,
  onCurrencyChange,
}: ReceiptParsedDataFormProps) {
  const enabledCategories = categories.filter(category => category.isEnabled !== false);
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);
  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item] as const)),
    [currencyItems],
  );
  const selectedCurrencyItem = value.currency ? currencyByCode.get(value.currency) : null;
  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== value.currency),
    [recentCurrencies, currencyByCode, value.currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== value.currency);
  }, [currencyItems, currencyQuery, value.currency]);

  const pushRecentCurrency = (currencyCode: string) => {
    setRecentCurrencies(prev => [currencyCode, ...prev.filter(item => item !== currencyCode)]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    const nextValue = { ...value, currency: currencyCode };

    onChange(nextValue);
    void onCurrencyChange?.(nextValue);
    pushRecentCurrency(currencyCode);
    setCurrencySearch('');
    setCurrencyDrawerOpen(false);
  };

  return (
    <>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="receipt-vendor" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor
          </label>
          <Input
            id="receipt-vendor"
            aria-label="Vendor"
            value={value.vendor}
            onChange={event => onChange({ ...value, vendor: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <CustomDatePicker
            value={value.date}
            onChange={date => onChange({ ...value, date })}
            label="Date"
            containerTestId="receipt-date-picker"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="receipt-amount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Amount
          </label>
          <Input
            id="receipt-amount"
            aria-label="Amount"
            type="number"
            value={value.amount}
            onChange={event =>
              onChange({
                ...value,
                amount: event.target.value === '' ? '' : Number(event.target.value),
              })
            }
          />
        </div>

          <div className="space-y-2">
            <label htmlFor="receipt-currency-trigger" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Currency
            </label>
            <button
              id="receipt-currency-trigger"
              aria-label="Currency"
              type="button"
              onClick={() => setCurrencyDrawerOpen(true)}
              className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="truncate">{selectedCurrencyItem?.code || value.currency || 'Select a currency'}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

        <div className="space-y-2">
          <label htmlFor="receipt-tax" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tax
          </label>
          <Input
            id="receipt-tax"
            aria-label="Tax"
            type="number"
            value={value.tax}
            onChange={event =>
              onChange({
                ...value,
                tax: event.target.value === '' ? '' : Number(event.target.value),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="receipt-payment-method" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Payment method
          </label>
          <Select
            id="receipt-payment-method"
            aria-label="Payment method"
            value={value.paymentMethod}
            onChange={event => onChange({ ...value, paymentMethod: event.target.value })}
          >
            <option value="">Select payment method</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="receipt-transaction-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Transaction type
          </label>
          <Select
            id="receipt-transaction-type"
            aria-label="Transaction type"
            value={value.transactionType}
            onChange={event =>
              onChange({
                ...value,
                transactionType: event.target.value as EditableReceiptParsedData['transactionType'],
              })
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="unknown">Unknown</option>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="receipt-category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Category
          </label>
          <Select
            id="receipt-category"
            aria-label="Category"
            value={value.categoryId}
            onChange={event => onChange({ ...value, categoryId: event.target.value })}
          >
            <option value="">Select category</option>
            {enabledCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Line items</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  lineItems: [
                    ...value.lineItems,
                    {
                      id: `line-${Date.now()}`,
                      description: '',
                      amount: 0,
                    },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
            {value.lineItems.map((lineItem, index) => (
              <div key={lineItem.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_44px]">
                <Input
                  aria-label={index === 0 ? 'Line item description' : undefined}
                  value={lineItem.description}
                  onChange={event =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.map(currentItem =>
                        currentItem.id === lineItem.id
                          ? { ...currentItem, description: event.target.value }
                          : currentItem,
                      ),
                    })
                  }
                />
                <Input
                  aria-label={index === 0 ? 'Line item amount' : undefined}
                  type="number"
                  value={lineItem.amount}
                  onChange={event =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.map(currentItem =>
                        currentItem.id === lineItem.id
                          ? { ...currentItem, amount: Number(event.target.value) }
                          : currentItem,
                      ),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line item ${lineItem.description || index + 1}`}
                  onClick={() =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.filter(currentItem => currentItem.id !== lineItem.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DrawerShell
        isOpen={currencyDrawerOpen}
        onClose={() => {
          setCurrencyDrawerOpen(false);
          setCurrencySearch('');
        }}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrencyDrawerOpen(false);
                setCurrencySearch('');
              }}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close currency drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">Select a currency</span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={currencySearch}
                onChange={event => setCurrencySearch(event.target.value)}
                placeholder="Search"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {selectedCurrencyItem && selectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                className="flex w-full items-center justify-between rounded-2xl bg-muted px-4 py-4 text-left"
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
                      <span className="text-base font-semibold text-foreground">{item.label}</span>
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
                      <span className="text-base font-semibold text-foreground">{item.label}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
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
