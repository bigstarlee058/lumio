'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { DetailActionButton } from '@/app/components/ui/detail-action-button';
import { ReceiptParsedDataForm } from '@/app/components/receipts/ReceiptParsedDataForm';
import apiClient, { receiptsApi, type ReceiptRecord } from '@/app/lib/api';
import { normalizeReceiptLineItems } from '@/app/lib/financial-document';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';
import { ArrowLeft, Download, Table } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  EditableReceiptLineItem,
  EditableReceiptParsedData,
  ReceiptCategoryOption,
} from '@/app/components/receipts/receipt-types';

type ReceiptExportColumn = {
  title: string;
  type: 'text' | 'number' | 'date';
};

type ReceiptExportRow = Record<string, string | number>;

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

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

function buildReceiptExportData(receipt: ReceiptRecord, formValue: EditableReceiptParsedData): {
  columns: ReceiptExportColumn[];
  rows: ReceiptExportRow[];
} {
  const parsedData = buildParsedDataPayload(formValue);
  const columns: ReceiptExportColumn[] = [];
  const baseRow: ReceiptExportRow = {};

  const hasLineItems = parsedData.lineItems.length > 0;

  if (hasLineItems) {
    columns.push({ title: 'Item', type: 'text' });
  } else if (parsedData.vendor?.trim()) {
    columns.push({ title: 'Vendor', type: 'text' });
    baseRow.Vendor = parsedData.vendor.trim();
  }
  if (parsedData.date?.trim()) {
    columns.push({ title: 'Date', type: 'date' });
    baseRow.Date = parsedData.date.trim();
  }
  if (typeof parsedData.amount === 'number' && Number.isFinite(parsedData.amount)) {
    columns.push({ title: 'Amount', type: 'number' });
    baseRow.Amount = parsedData.amount;
  }
  if (parsedData.currency?.trim()) {
    columns.push({ title: 'Currency', type: 'text' });
    baseRow.Currency = parsedData.currency.trim();
  }
  if (receipt.source?.trim()) {
    columns.push({ title: 'Source', type: 'text' });
    baseRow.Source = receipt.source.trim();
  }
  if (receipt.status?.trim()) {
    columns.push({ title: 'Status', type: 'text' });
    baseRow.Status = receipt.status.trim();
  }

  if (hasLineItems) {
    return {
      columns,
      rows: parsedData.lineItems.map(item => ({
        Item: item.description,
        Date: baseRow.Date,
        Amount: item.amount,
        Currency: baseRow.Currency,
        Source: baseRow.Source,
        Status: baseRow.Status,
      })),
    };
  }

  return { columns, rows: [baseRow] };
}

export default function ReceiptDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const receiptId = params.id;

  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [categories, setCategories] = useState<ReceiptCategoryOption[]>([]);
  const [formValue, setFormValue] = useState<EditableReceiptParsedData>(buildInitialForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingToTable, setExportingToTable] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [receiptResponse, categoriesResponse] = await Promise.all([
        apiClient.get(`/receipts/${receiptId}`),
        apiClient.get('/categories'),
      ]);

      const nextReceipt = (receiptResponse.data?.data || receiptResponse.data) as ReceiptRecord;
      const nextCategories = (categoriesResponse.data?.data ||
        categoriesResponse.data ||
        []) as ReceiptCategoryOption[];

      setReceipt(nextReceipt);
      setFormValue(buildInitialForm(nextReceipt));
      setCategories(nextCategories);
    } catch (loadError) {
      console.error('Failed to load receipt details:', loadError);
      setError('Failed to load receipt');
      toast.error('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(currentUrl => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      setPreviewMimeType(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const response = await fetch(`${apiBaseUrl}/receipts/${receipt.id}/file`, {
          method: 'GET',
          headers: getWorkspaceHeaders(),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Preview request failed: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        const nextMimeType = response.headers.get('content-type') || blob.type || null;

        if (active) {
          setPreviewUrl(currentUrl => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return objectUrl;
          });
          setPreviewMimeType(nextMimeType);
        }
      } catch (previewLoadError) {
        console.error('Failed to load receipt preview:', previewLoadError);
        if (active) {
          setPreviewError('Preview unavailable');
          setPreviewUrl(currentUrl => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return null;
          });
          setPreviewMimeType(null);
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [receipt]);

  const lastSavedPayloadRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!receipt) {
      lastSavedPayloadRef.current = null;
      return;
    }

    lastSavedPayloadRef.current = JSON.stringify(buildParsedDataPayload(buildInitialForm(receipt)));
  }, [receipt]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const persistParsedData = useCallback(
    async (nextValue: EditableReceiptParsedData) => {
      if (!receipt) return;

      const nextPayload = buildParsedDataPayload(nextValue);
      const serializedPayload = JSON.stringify(nextPayload);

      if (serializedPayload === lastSavedPayloadRef.current) {
        return;
      }

      try {
        await apiClient.patch(`/receipts/${receipt.id}`, {
          parsedData: nextPayload,
        });
        lastSavedPayloadRef.current = serializedPayload;
        setReceipt(currentReceipt =>
          currentReceipt
            ? {
                ...currentReceipt,
                parsedData: {
                  ...currentReceipt.parsedData,
                  ...nextPayload,
                },
              }
            : currentReceipt,
        );
      } catch {
        toast.error('Failed to autosave receipt changes.');
      }
    },
    [receipt],
  );

  const handleFormChange = useCallback(
    (nextValue: EditableReceiptParsedData) => {
      setFormValue(nextValue);

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(() => {
        void persistParsedData(nextValue);
      }, 250);
    },
    [persistParsedData],
  );

  const handleApprove = async () => {
    if (!receipt) return;

    setSaving(true);
    try {
      const currentPayload = buildParsedDataPayload(formValue);
      await apiClient.patch(`/receipts/${receipt.id}`, {
        parsedData: currentPayload,
      });
      lastSavedPayloadRef.current = JSON.stringify(currentPayload);
      await receiptsApi.approveReceipt(receipt.id);
      toast.success('Receipt approved.');
      await loadData();
    } catch {
      toast.error('Failed to approve receipt.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!receipt) return;

    try {
      const response = await fetch(`${apiBaseUrl}/receipts/${receipt.id}/file`, {
        method: 'GET',
        headers: getWorkspaceHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Download request failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = receipt.metadata?.attachments?.[0]?.filename || receipt.subject || `${receipt.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Failed to download receipt:', downloadError);
      toast.error('Failed to download receipt');
    }
  };

  const handleExportToTable = async () => {
    if (!receipt) {
      toast.error('Export to table is unavailable for this receipt yet');
      return;
    }

    setExportingToTable(true);
    try {
      const exportData = buildReceiptExportData(receipt, formValue);

      if (!exportData.columns.length || !exportData.rows.length) {
        toast.error('There are no parsed receipt fields to export yet');
        return;
      }

      const createTableResponse = await apiClient.post('/custom-tables', {
        name: `Receipt ${receipt.subject}`.slice(0, 120),
        description: `Exported from scanned receipt on ${new Date(receipt.receivedAt).toLocaleDateString()}`,
      });

      const createdTable = createTableResponse.data?.data || createTableResponse.data;
      const tableId = createdTable?.id;

      if (!tableId) {
        toast.error('Failed to export to table');
        router.push('/custom-tables');
        return;
      }

      const createdColumns = await Promise.all(
        exportData.columns.map(column =>
          apiClient.post(`/custom-tables/${tableId}/columns`, {
            title: column.title,
            type: column.type,
          }),
        ),
      );

      const columnKeyByTitle = exportData.columns.reduce<Record<string, string>>((acc, column, index) => {
        const payload = createdColumns[index]?.data?.data || createdColumns[index]?.data;
        const key = payload?.key;
        if (key) {
          acc[column.title] = key;
        }
        return acc;
      }, {});

      const rows = exportData.rows.map(row => {
        const data = Object.entries(row).reduce<Record<string, string | number>>((acc, [title, value]) => {
          const key = columnKeyByTitle[title];
          if (key && value !== undefined && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {});

        return { data };
      });

      await apiClient.post(`/custom-tables/${tableId}/rows/batch`, {
        rows,
      });

      toast.success('Table created successfully');
      router.push(`/custom-tables/${tableId}`);
      return;
    } catch {
      toast.error('Failed to export to table');
    } finally {
      setExportingToTable(false);
    }
  };

  if (loading) {
    return (
      <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-full min-h-[320px] items-center justify-center">
          <Spinner className="h-20 w-20 text-primary" />
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error || 'Receipt not found'}
        </div>
        <DetailActionButton type="button" onClick={() => router.push('/statements')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to statements
        </DetailActionButton>
      </div>
    );
  }

  const attachment = receipt.metadata?.attachments?.[0];
  const isPdf = (previewMimeType || attachment?.mimeType || '').includes('pdf');
  const canExportToTable = Boolean(receipt);

  return (
    <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-700/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <DetailActionButton type="button" onClick={() => router.push('/statements')}>
              <ArrowLeft className="h-4 w-4" />
              Back to statements
            </DetailActionButton>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                Receipt details
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {receipt.subject}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {receipt.source} · {new Date(receipt.receivedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

        <div className="flex flex-wrap items-center gap-3">
          <DetailActionButton type="button" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download
          </DetailActionButton>
          <DetailActionButton
            type="button"
            onClick={() => setExportConfirmOpen(true)}
            disabled={exportingToTable || !canExportToTable}
          >
            <Table className="h-4 w-4" />
            Export to table
          </DetailActionButton>
          <DetailActionButton type="button" onClick={handleApprove} disabled={saving}>
            {saving ? <Spinner className="size-[18px]" /> : null}
            Approve receipt
          </DetailActionButton>
          </div>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)]">
          <section className="flex h-full min-h-0 flex-col">
            <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/60">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Original document</h2>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-slate-950">
                {previewLoading ? (
                  <div className="flex h-full min-h-[388px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Preparing preview...
                  </div>
                ) : previewError ? (
                  <div className="flex h-full min-h-[388px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    {previewError}
                  </div>
                ) : previewUrl ? (
                  isPdf ? (
                    <iframe
                      src={previewUrl}
                      title={receipt.subject}
                      className="h-full min-h-[760px] w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900"
                    />
                  ) : (
                    <div className="flex min-h-full min-w-full justify-center">
                      <img
                        src={previewUrl}
                        alt={receipt.subject}
                        className="h-auto min-h-0 w-[180%] min-w-[720px] max-w-none rounded-2xl object-contain"
                      />
                    </div>
                  )
                ) : (
                  <div className="flex h-full min-h-[388px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Preview unavailable
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="h-full rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700/60 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700/60">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Parsed fields</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review and correct the extracted receipt data before approval.
                </p>
              </div>
            </div>

            <ReceiptParsedDataForm
              value={formValue}
              categories={categories}
              onChange={handleFormChange}
            />
          </section>
        </div>
      </div>

      <Modal
        isOpen={exportConfirmOpen}
        onOpenChange={(next: boolean) => {
          if (!next) {
            setExportConfirmOpen(false);
          }
        }}
        size="2xl"
        placement="center"
        backdrop="opaque"
        classNames={{
          base: 'rounded-2xl border border-gray-200 shadow-xl',
          backdrop: 'bg-gray-900/40 backdrop-blur-[1px]',
          closeButton:
            'text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors',
        }}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="border-b border-gray-200 px-8 py-6 text-[22px] font-semibold text-gray-900">
                Confirm export
              </ModalHeader>
              <ModalBody className="border-b border-gray-200 px-8 py-8">
                <p className="text-base leading-8 text-gray-700">
                  Are you sure you want to export this statement to a custom table?
                </p>
              </ModalBody>
              <ModalFooter className="justify-end gap-3 px-8 py-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-200 bg-white px-6 py-2.5 text-base font-medium text-gray-600 hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void handleExportToTable();
                  }}
                  disabled={exportingToTable || !canExportToTable}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-base font-medium text-white shadow-none hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportingToTable ? (
                    <Spinner className="h-4 w-4" />
                  ) : null}
                  Export
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
