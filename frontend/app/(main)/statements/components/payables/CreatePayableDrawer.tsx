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
        <div className="lumio-payable-drawer__title-wrap">
          <button
            type="button"
            onClick={onClose}
            className="lumio-payable-drawer__back-btn"
            aria-label={labels.cancel}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#0f3428' }}>
            {payable ? labels.editTitle : labels.createTitle}
          </span>
        </div>
      }
    >
      <div className="lumio-payable-drawer__body">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="lumio-payable-drawer__field-group">
            <label className="lumio-payable-drawer__field-label" htmlFor="payable-vendor">
              {labels.vendor}
            </label>
            <Input
              id="payable-vendor"
              value={form.vendor}
              onChange={event => setForm(prev => ({ ...prev, vendor: event.target.value }))}
            />
          </div>

          <div className="lumio-payable-drawer__2col">
            <div className="lumio-payable-drawer__field-group">
              <label className="lumio-payable-drawer__field-label" htmlFor="payable-amount">
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
            <div className="lumio-payable-drawer__field-group">
              <label className="lumio-payable-drawer__field-label" htmlFor="payable-currency">
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

          <div className="lumio-payable-drawer__2col">
            <div className="lumio-payable-drawer__field-group">
              <label className="lumio-payable-drawer__field-label" htmlFor="payable-due-date">
                {labels.dueDate}
              </label>
              <Input
                id="payable-due-date"
                type="date"
                value={form.dueDate}
                onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="lumio-payable-drawer__field-group">
              <label className="lumio-payable-drawer__field-label" htmlFor="payable-source">
                {labels.source}
              </label>
              <select
                id="payable-source"
                className="lumio-payable-drawer__select"
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

          <div className="lumio-payable-drawer__field-group">
            <label className="lumio-payable-drawer__field-label" htmlFor="payable-status">
              {labels.status}
            </label>
            <select
              id="payable-status"
              className="lumio-payable-drawer__select"
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

          <div className="lumio-payable-drawer__field-group">
            <label className="lumio-payable-drawer__field-label" htmlFor="payable-comment">
              {labels.comment}
            </label>
            <textarea
              id="payable-comment"
              value={form.comment}
              onChange={event => setForm(prev => ({ ...prev, comment: event.target.value }))}
              className="lumio-payable-drawer__textarea"
            />
          </div>
        </div>

        <div className="lumio-payable-drawer__footer">
          <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            style={{ flex: 1 }}
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
