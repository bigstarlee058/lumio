'use client';

import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import apiClient, { receiptsApi, type ReceiptRecord } from '@/app/lib/api';
import { normalizeReceiptLineItems } from '@/app/lib/financial-document';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { FileImage, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ReceiptParsedDataForm } from './ReceiptParsedDataForm';
import type {
  EditableReceiptLineItem,
  EditableReceiptParsedData,
  ReceiptCategoryOption,
} from './receipt-types';

export interface ReceiptDetailPanelProps {
  isOpen: boolean;
  receipt: ReceiptRecord | null;
  onClose: () => void;
  onUpdated?: () => void;
}

function buildLineItems(receipt: ReceiptRecord | null): EditableReceiptLineItem[] {
  return normalizeReceiptLineItems(receipt?.parsedData).map((item, index) => ({
    id: `line-${index + 1}`,
    description: item.description,
    amount: item.amount,
  }));
}

function buildInitialForm(receipt: ReceiptRecord | null): EditableReceiptParsedData {
  return {
    vendor: receipt?.parsedData?.vendor ?? '',
    amount: receipt?.parsedData?.amount ?? '',
    currency: receipt?.parsedData?.currency ?? 'KZT',
    date: receipt?.parsedData?.date?.split('T')[0] ?? '',
    tax: receipt?.parsedData?.tax ?? '',
    paymentMethod: receipt?.parsedData?.paymentMethod ?? '',
    transactionType: receipt?.parsedData?.transactionType ?? 'expense',
    categoryId: receipt?.parsedData?.categoryId ?? '',
    lineItems: buildLineItems(receipt),
  };
}

function buildParsedDataPayload(formValue: EditableReceiptParsedData) {
  const lineItems = formValue.lineItems
    .filter(item => item.description.trim().length > 0 || Number.isFinite(item.amount))
    .map(item => ({ description: item.description, amount: item.amount }));

  return {
    vendor: formValue.vendor,
    amount: formValue.amount === '' ? undefined : Number(formValue.amount),
    currency: formValue.currency,
    date: formValue.date,
    tax: formValue.tax === '' ? undefined : Number(formValue.tax),
    paymentMethod: formValue.paymentMethod,
    transactionType: formValue.transactionType,
    categoryId: formValue.categoryId || undefined,
    lineItems,
  };
}

export function ReceiptDetailPanel({
  isOpen,
  receipt,
  onClose,
  onUpdated,
}: ReceiptDetailPanelProps) {
  const [categories, setCategories] = useState<ReceiptCategoryOption[]>([]);
  const [formValue, setFormValue] = useState<EditableReceiptParsedData>(buildInitialForm(receipt));
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setFormValue(buildInitialForm(receipt));
  }, [receipt]);

  useEffect(() => {
    if (!isOpen || !receipt) {
      setPreviewUrl(currentUrl => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      return;
    }

    const attachment = receipt.metadata?.attachments?.[0];
    if (!attachment || attachment.mimeType === 'application/pdf') {
      setPreviewUrl(currentUrl => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      try {
        const response = await fetch(
          `${(process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '')}/receipts/${receipt.id}/file`,
          {
            method: 'GET',
            headers: getWorkspaceHeaders(),
            credentials: 'include',
          },
        );

        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setPreviewUrl(currentUrl => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return objectUrl;
          });
        }
      } catch {
        // ignore preview errors and keep fallback card visible
      }
    };

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, receipt]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    apiClient
      .get('/categories')
      .then(response => {
        if (active) {
          setCategories(response.data ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const attachment = receipt?.metadata?.attachments?.[0];
  const isPdf = attachment?.mimeType === 'application/pdf';

  const payload = useMemo(() => buildParsedDataPayload(formValue), [formValue]);

  const handleFormChange = (nextValue: EditableReceiptParsedData) => {
    setFormValue(nextValue);
  };

  const handleCurrencyChange = async (nextValue: EditableReceiptParsedData) => {
    if (!receipt) return;

    try {
      await apiClient.patch(`/receipts/${receipt.id}`, {
        parsedData: buildParsedDataPayload(nextValue),
      });
      onUpdated?.();
    } catch {
      toast.error('Failed to save receipt currency.');
    }
  };

  if (!receipt) {
    return null;
  }

  const handleSaveDraft = async () => {
    setSaving(true);

    try {
      await apiClient.patch(`/receipts/${receipt.id}`, {
        parsedData: payload,
      });
      toast.success('Receipt draft saved.');
      onUpdated?.();
    } catch {
      toast.error('Failed to save receipt draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);

    try {
      await apiClient.patch(`/receipts/${receipt.id}`, {
        status: 'rejected',
      });
      toast.success('Receipt rejected.');
      onUpdated?.();
      onClose();
    } catch {
      toast.error('Failed to reject receipt.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);

    try {
      await apiClient.patch(`/receipts/${receipt.id}`, {
        parsedData: payload,
      });
      await receiptsApi.approveReceipt(receipt.id);
      toast.success('Receipt approved.');
      onUpdated?.();
      onClose();
    } catch {
      toast.error('Failed to approve receipt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} title="Receipt details" width="xl">
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-3 text-slate-600 shadow-sm">
                {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{receipt.subject}</p>
                <p className="text-sm text-slate-500">{receipt.source}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            {isPdf ? (
              <PDFPreviewModal
                isOpen={true}
                onClose={() => undefined}
                fileId={receipt.id}
                fileName={receipt.subject}
                source="receipt"
              />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={receipt.subject}
                className="mx-auto max-h-[320px] rounded-2xl object-contain"
              />
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-900">Original document preview</p>
                <p className="mt-2 text-sm text-slate-500">Preparing image preview...</p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>Status</span>
                <span className="font-medium text-slate-900">{receipt.status}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Received</span>
                <span className="font-medium text-slate-900">
                  {new Date(receipt.receivedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Language</span>
                <span className="font-medium text-slate-900">{receipt.language || 'Auto'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto pr-1">
            <ReceiptParsedDataForm
              value={formValue}
              categories={categories}
              onChange={handleFormChange}
              onCurrencyChange={handleCurrencyChange}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleReject} disabled={saving}>
              Reject receipt
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              Save draft
            </Button>
            <Button onClick={handleApprove} disabled={saving}>
              Approve receipt
            </Button>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
