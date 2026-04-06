'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { ColumnType } from '../utils/stylingUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface UseColumnManagementMessages {
  addColumnLoading: string;
  addColumnSuccess: string;
  addColumnFailed: string;
  deleteColumnLoading: string;
  deleteColumnSuccess: string;
  deleteColumnFailed: string;
  renameColumnSuccess: string;
  renameColumnFailed: string;
}

interface UseColumnManagementParams {
  tableId: string | null;
  orderedColumns: CustomTablePageColumn[];
  loadTable: () => Promise<void>;
  deleteColumnTarget: { id: string } | null;
  closeDeleteColumnModal: () => void;
  messages: UseColumnManagementMessages;
}

export interface UseColumnManagementReturn {
  newColumnOpen: boolean;
  setNewColumnOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newColumn: { title: string; type: ColumnType };
  setNewColumn: React.Dispatch<React.SetStateAction<{ title: string; type: ColumnType }>>;
  createColumn: () => Promise<void>;
  deleteColumn: () => Promise<void>;
  renameColumnTitleFromGrid: (columnKey: string, nextTitle: string) => Promise<void>;
}

export function useColumnManagement({
  tableId,
  orderedColumns,
  loadTable,
  deleteColumnTarget,
  closeDeleteColumnModal,
  messages,
}: UseColumnManagementParams): UseColumnManagementReturn {
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumn, setNewColumn] = useState<{ title: string; type: ColumnType }>({
    title: '',
    type: 'text',
  });

  const createColumn = useCallback(async () => {
    if (!tableId) return;
    const title = newColumn.title.trim();
    if (!title) return;
    const toastId = toast.loading(messages.addColumnLoading);
    try {
      await apiClient.post(`/custom-tables/${tableId}/columns`, { title, type: newColumn.type });
      toast.success(messages.addColumnSuccess, { id: toastId });
      setNewColumnOpen(false);
      setNewColumn({ title: '', type: 'text' });
      await loadTable();
    } catch (error) {
      console.error('Failed to create column:', error);
      toast.error(messages.addColumnFailed, { id: toastId });
    }
  }, [tableId, newColumn, loadTable, messages]);

  const deleteColumn = useCallback(async () => {
    if (!tableId || !deleteColumnTarget) return;
    const toastId = toast.loading(messages.deleteColumnLoading);
    try {
      await apiClient.delete(`/custom-tables/${tableId}/columns/${deleteColumnTarget.id}`);
      toast.success(messages.deleteColumnSuccess, { id: toastId });
      closeDeleteColumnModal();
      await loadTable();
    } catch (error) {
      console.error('Failed to delete column:', error);
      toast.error(messages.deleteColumnFailed, { id: toastId });
    }
  }, [tableId, deleteColumnTarget, closeDeleteColumnModal, loadTable, messages]);

  const renameColumnTitleFromGrid = useCallback(
    async (columnKey: string, nextTitle: string) => {
      if (!tableId) return;
      const colId = orderedColumns.find(c => c.key === columnKey)?.id;
      if (!colId) return;
      try {
        await apiClient.patch(`/custom-tables/${tableId}/columns/${colId}`, { title: nextTitle });
        await loadTable();
        toast.success(messages.renameColumnSuccess);
      } catch (error) {
        console.error('Failed to rename column:', error);
        toast.error(messages.renameColumnFailed);
      }
    },
    [tableId, orderedColumns, loadTable, messages],
  );

  return {
    newColumnOpen,
    setNewColumnOpen,
    newColumn,
    setNewColumn,
    createColumn,
    deleteColumn,
    renameColumnTitleFromGrid,
  };
}
