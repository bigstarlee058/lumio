'use client';

import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Input } from '@/app/components/ui/input';
import type {
  CreatePayableInput,
  Payable,
  PayableSource,
  PayableStatus,
  UpdatePayableInput,
} from '@/app/lib/payables-api';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CreatePayableDrawerProps {
  open: boolean;
  payable?: Payable | null;
  initialValues?: CreatePayableInput | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePayableInput | UpdatePayableInput) => Promise<void>;
  labels: {
    createTitle: string;
    editTitle: string;
    vendor: string;
    amount: string;
    currency: string;
    dueDate: string;
    source: string;
    status: string;
    comment: string;
    save: string;
    saving: string;
    cancel: string;
    sourceOptions: Record<PayableSource, string>;
    statusOptions: Record<PayableStatus, string>;
  };
}

interface PayableFormState {
  vendor: string;
  amount: string;
  currency: string;
  dueDate: string;
  source: PayableSource;
  status: PayableStatus;
  comment: string;
}

const createEmptyState = (): PayableFormState => ({
  vendor: '',
  amount: '',
  currency: 'KZT',
  dueDate: '',
  source: 'manual',
  status: 'to_pay',
  comment: '',
});

const toFormState = (
  payable?: Payable | null,
  initialValues?: CreatePayableInput | null,
): PayableFormState => {
  if (!payable && !initialValues) return createEmptyState();

  if (!payable && initialValues) {
    return {
      vendor: initialValues.vendor || '',
      amount: String(initialValues.amount ?? ''),
      currency: initialValues.currency || 'KZT',
      dueDate: initialValues.dueDate ? initialValues.dueDate.slice(0, 10) : '',
      source: initialValues.source || 'manual',
      status: initialValues.status || 'to_pay',
      comment: initialValues.comment || '',
    };
  }

  return {
    vendor: payable?.vendor || '',
    amount: String(payable?.amount ?? ''),
    currency: payable?.currency || 'KZT',
    dueDate: payable?.dueDate ? payable.dueDate.slice(0, 10) : '',
    source: payable?.source || 'manual',
    status: payable?.status || 'to_pay',
    comment: payable?.comment || '',
  };
};

const selectClassName =
  'h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

export function CreatePayableDrawer({
  open,
  payable,
  initialValues,
  saving,
  onClose,
  onSubmit,
  labels,
}: CreatePayableDrawerProps) {
  const [form, setForm] = useState<PayableFormState>(() => toFormState(payable, initialValues));

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(payable, initialValues));
  }, [initialValues, open, payable]);

  const canSubmit = useMemo(() => form.vendor.trim().length > 0 && Number(form.amount) > 0, [form]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await onSubmit({
      vendor: form.vendor.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase() || 'KZT',
      dueDate: form.dueDate || undefined,
      source: form.source,
      status: form.status,
      comment: form.comment.trim() || undefined,
    });
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="lg"
      showCloseButton={false}
      className="max-w-full border-l-0 bg-white sm:max-w-lg"
      title={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={labels.cancel}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-[#0f3428]">
            {payable ? labels.editTitle : labels.createTitle}
          </span>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="payable-vendor">
              {labels.vendor}
            </label>
            <Input
              id="payable-vendor"
              value={form.vendor}
              onChange={event => setForm(prev => ({ ...prev, vendor: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="payable-amount">
                {labels.amount}
              </label>
              <Input
                id="payable-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="payable-currency">
                {labels.currency}
              </label>
              <Input
                id="payable-currency"
                maxLength={3}
                value={form.currency}
                onChange={event =>
                  setForm(prev => ({ ...prev, currency: event.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="payable-due-date">
                {labels.dueDate}
              </label>
              <Input
                id="payable-due-date"
                type="date"
                value={form.dueDate}
                onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="payable-source">
                {labels.source}
              </label>
              <select
                id="payable-source"
                className={selectClassName}
                value={form.source}
                onChange={event =>
                  setForm(prev => ({ ...prev, source: event.target.value as PayableSource }))
                }
              >
                {Object.entries(labels.sourceOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="payable-status">
              {labels.status}
            </label>
            <select
              id="payable-status"
              className={selectClassName}
              value={form.status}
              onChange={event =>
                setForm(prev => ({ ...prev, status: event.target.value as PayableStatus }))
              }
            >
              {Object.entries(labels.statusOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="payable-comment">
              {labels.comment}
            </label>
            <textarea
              id="payable-comment"
              value={form.comment}
              onChange={event => setForm(prev => ({ ...prev, comment: event.target.value }))}
              className="min-h-[120px] rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-auto flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || saving}
          >
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}
