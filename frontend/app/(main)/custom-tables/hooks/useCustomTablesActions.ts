'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import type { CustomTableAction } from '@/app/lib/custom-table-actions';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { ExportColumn } from '../customTablesHelpers';
import { getExportColumn, sanitizeFileName, toCsv } from '../customTablesHelpers';

interface CustomTableItem {
  id: string;
  name: string;
  description: string | null;
  source: string;
  sourceDetails?: string | null;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseCustomTablesActionsParams {
  loadTables: () => Promise<void>;
  onOpenCreateFromStatements: () => void;
  messages: {
    deletingLabel: string;
    deletedLabel: string;
    deleteFailedLabel: string;
  };
}

export function useCustomTablesActions({
  loadTables,
  onOpenCreateFromStatements,
  messages,
}: UseCustomTablesActionsParams): {
  exportingTableId: string | null;
  updatingTableId: string | null;
  deleteModalOpen: boolean;
  deleteTarget: CustomTableItem | null;
  confirmDelete: (table: CustomTableItem) => void;
  closeDeleteModal: () => void;
  handleDelete: () => Promise<void>;
  handleExportTable: (table: CustomTableItem, format: 'csv' | 'xlsx') => Promise<void>;
  handleUpdateData: (table: CustomTableItem) => Promise<void>;
  handleTableAction: (action: CustomTableAction) => void;
} {
  const router = useRouter();
  const [exportingTableId, setExportingTableId] = useState<string | null>(null);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomTableItem | null>(null);

  const confirmDelete = useCallback((table: CustomTableItem): void => {
    setDeleteTarget(table);
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }, []);

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    const toastId = toast.loading(messages.deletingLabel);
    try {
      await apiClient.delete(`/custom-tables/${deleteTarget.id}`);
      toast.success(messages.deletedLabel, { id: toastId });
      await loadTables();
    } catch (error) {
      console.error('Failed to delete custom table:', error);
      toast.error(messages.deleteFailedLabel, { id: toastId });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, loadTables, messages]);

  const handleExportTable = useCallback(
    async (table: CustomTableItem, format: 'csv' | 'xlsx'): Promise<void> => {
      setExportingTableId(table.id);
      const toastId = toast.loading(`Export ${table.name}...`);

      try {
        const [tableResponse] = await Promise.all([apiClient.get(`/custom-tables/${table.id}`)]);
        const detail = tableResponse.data?.data || tableResponse.data;
        const columns = Array.isArray(detail?.columns)
          ? detail.columns
              .map((col: unknown) => getExportColumn(col))
              .filter((col: ExportColumn | null): col is ExportColumn => col !== null)
              .sort(
                (a: ExportColumn, b: ExportColumn) => (a.position || 0) - (b.position || 0),
              )
          : [];

        if (columns.length === 0) throw new Error('No exportable columns found');

        const rows: Array<{ rowNumber?: number; data: Record<string, unknown> }> = [];
        let cursor: number | undefined;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const response = await apiClient.get(`/custom-tables/${table.id}/rows`, {
            params: { cursor, limit: 500 },
          });
          const items = response.data?.items || response.data?.data?.items || [];
          const chunk = Array.isArray(items) ? items : [];
          rows.push(...chunk);
          if (chunk.length < 500) break;
          const nextCursor = chunk[chunk.length - 1]?.rowNumber;
          if (typeof nextCursor !== 'number' || Number.isNaN(nextCursor)) break;
          cursor = nextCursor;
        }

        const headers = columns.map((col: ExportColumn) => col.title || col.key);
        const normalizedRows = rows.map(row => {
          const mapped: Record<string, unknown> = {};
          columns.forEach((col: ExportColumn, index: number) => {
            mapped[headers[index]] = row?.data?.[col.key] ?? '';
          });
          return mapped;
        });

        const fileBase = sanitizeFileName(table.name);

        if (format === 'csv') {
          const csv = toCsv(headers, normalizedRows);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${fileBase}.csv`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        } else {
          const xlsx = await import('xlsx');
          const sheet = xlsx.utils.json_to_sheet(normalizedRows);
          const workbook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, sheet, 'Export');
          const output = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([output], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${fileBase}.xlsx`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }

        toast.success(`Export complete: ${table.name}`, { id: toastId });
      } catch (error) {
        console.error('Failed to export table:', error);
        toast.error(getApiErrorMessage(error, 'Failed to export table'), { id: toastId });
      } finally {
        setExportingTableId(prev => (prev === table.id ? null : prev));
      }
    },
    [],
  );

  const handleUpdateData = useCallback(
    async (table: CustomTableItem): Promise<void> => {
      setUpdatingTableId(table.id);
      const source = (table.source || '').toLowerCase();
      try {
        if (source.includes('data_entry')) {
          await apiClient.post(`/custom-tables/${table.id}/sync-from-data-entry`);
          await loadTables();
          toast.success('Table synced from latest source data');
          return;
        }
        if (source.includes('statement')) {
          toast('Open Statements and re-run Export to table for fresh data.', { icon: 'ℹ️' });
          router.push('/statements');
          return;
        }
        if (source === 'google_sheets_import') {
          router.push('/custom-tables/import/google-sheets');
          return;
        }
        toast('This table source has no automatic refresh.', { icon: 'ℹ️' });
      } catch (error) {
        console.error('Failed to update table data:', error);
        toast.error(getApiErrorMessage(error, 'Failed to update table data'));
      } finally {
        setUpdatingTableId(prev => (prev === table.id ? null : prev));
      }
    },
    [loadTables, router],
  );

  const handleTableAction = useCallback(
    (action: CustomTableAction): void => {
      if (action === 'create-empty') {
        // handled in parent
        return;
      }
      if (action === 'import-statement') {
        onOpenCreateFromStatements();
        return;
      }
      router.push('/custom-tables/import/google-sheets');
    },
    [onOpenCreateFromStatements, router],
  );

  return {
    exportingTableId,
    updatingTableId,
    deleteModalOpen,
    deleteTarget,
    confirmDelete,
    closeDeleteModal,
    handleDelete,
    handleExportTable,
    handleUpdateData,
    handleTableAction,
  };
}
