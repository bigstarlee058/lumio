'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { DetailActionButton } from '@/app/components/ui/detail-action-button';
import { ReceiptParsedDataForm } from '@/app/components/receipts/ReceiptParsedDataForm';
import apiClient, { receiptsApi, type ReceiptRecord } from '@/app/lib/api';
import { normalizeReceiptLineItems } from '@/app/lib/financial-document';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Box, Typography } from '@mui/material';
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
      <Box className="container-shared" sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Box sx={{ display: 'flex', height: '100%', minHeight: 320, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner className="h-20 w-20 text-primary" />
        </Box>
      </Box>
    );
  }

  if (error || !receipt) {
    return (
      <Box className="container-shared" sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Box sx={{ mb: 2, border: '1px solid #fecaca', bgcolor: '#fef2f2', p: 2, color: '#dc2626' }}>
          {error || 'Receipt not found'}
        </Box>
        <DetailActionButton type="button" onClick={() => router.push('/statements')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to statements
        </DetailActionButton>
      </Box>
    );
  }

  const attachment = receipt.metadata?.attachments?.[0];
  const isPdf = (previewMimeType || attachment?.mimeType || '').includes('pdf');
  const canExportToTable = Boolean(receipt);

  return (
    <Box className="container-shared" sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', width: '100%', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            borderBottom: '1px solid #e2e8f0',
            pb: 3,
            alignItems: { sm: 'center' },
            justifyContent: { sm: 'space-between' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <DetailActionButton type="button" onClick={() => router.push('/statements')}>
              <ArrowLeft className="h-4 w-4" />
              Back to statements
            </DetailActionButton>
            <Box>
              <Typography
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: '#64748b',
                }}
              >
                Receipt details
              </Typography>
              <Typography
                component="h1"
                style={{ marginTop: 8, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', color: '#020617' }}
              >
                {receipt.subject}
              </Typography>
              <Typography style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
                {receipt.source} · {new Date(receipt.receivedAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
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
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            alignItems: 'stretch',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(360px, 0.95fr) minmax(0, 1.05fr)' },
          }}
        >
          <Box component="section" sx={{ display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                height: '100%',
                minHeight: 420,
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 2.5, py: 2 }}>
                <Typography style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  Original document
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f8fafc', p: 2 }}>
                {previewLoading ? (
                  <Box sx={{ display: 'flex', height: '100%', minHeight: 388, alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#64748b' }}>
                    Preparing preview...
                  </Box>
                ) : previewError ? (
                  <Box sx={{ display: 'flex', height: '100%', minHeight: 388, alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#64748b' }}>
                    {previewError}
                  </Box>
                ) : previewUrl ? (
                  isPdf ? (
                    <iframe
                      src={previewUrl}
                      title={receipt.subject}
                      style={{ height: '100%', minHeight: 760, width: '100%', border: '1px solid #e2e8f0', background: 'var(--card-bg)', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', minHeight: '100%', minWidth: '100%', justifyContent: 'center' }}>
                      <img
                        src={previewUrl}
                        alt={receipt.subject}
                        style={{ height: 'auto', minHeight: 0, width: '180%', minWidth: 720, maxWidth: 'none', objectFit: 'contain' }}
                      />
                    </Box>
                  )
                ) : (
                  <Box sx={{ display: 'flex', height: '100%', minHeight: 388, alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#64748b' }}>
                    Preview unavailable
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Box component="section" sx={{ height: '100%', border: '1px solid #e2e8f0', bgcolor: 'background.paper', p: 3 }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, borderBottom: '1px solid #e2e8f0', pb: 2 }}>
              <Box>
                <Typography style={{ fontSize: 18, fontWeight: 600, color: '#020617' }}>
                  Parsed fields
                </Typography>
                <Typography style={{ marginTop: 4, fontSize: 14, color: '#64748b' }}>
                  Review and correct the extracted receipt data before approval.
                </Typography>
              </Box>
            </Box>

            <ReceiptParsedDataForm
              value={formValue}
              categories={categories}
              onChange={handleFormChange}
            />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={exportConfirmOpen}
        onClose={() => setExportConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 22, fontWeight: 600 }}>
          Confirm export
        </DialogTitle>
        <DialogContent dividers>
          <Typography style={{ fontSize: 16, lineHeight: 2, color: '#374151' }}>
            Are you sure you want to export this statement to a custom table?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, gap: 1.5 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setExportConfirmOpen(false)}
            sx={{
              border: '1px solid #e5e7eb',
              bgcolor: 'background.paper',
              px: 3,
              py: 1.25,
              fontSize: 16,
              fontWeight: 500,
              color: '#4b5563',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            Cancel
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => {
              setExportConfirmOpen(false);
              void handleExportToTable();
            }}
            disabled={exportingToTable || !canExportToTable}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'primary.main',
              px: 3,
              py: 1.25,
              fontSize: 16,
              fontWeight: 500,
              color: '#fff',
              cursor: 'pointer',
              border: 'none',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
            }}
          >
            {exportingToTable ? <Spinner className="h-4 w-4" /> : null}
            Export
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
