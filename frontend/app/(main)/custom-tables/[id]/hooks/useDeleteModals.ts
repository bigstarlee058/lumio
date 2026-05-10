'use client';

import { useState } from 'react';
import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';

export interface UseDeleteModalsReturn {
  // Delete row modal
  deleteRowModalOpen: boolean;
  deleteRowTarget: CustomTableGridRow | null;
  requestDeleteRow: (rows: CustomTableGridRow[], rowId: string) => void;
  closeDeleteRowModal: () => void;

  // Bulk delete modal
  bulkDeleteModalOpen: boolean;
  bulkDeleteRowIds: string[];
  openBulkDeleteModal: (selectedRowIds: string[]) => void;
  closeBulkDeleteModal: () => void;

  // Delete column modal
  deleteColumnModalOpen: boolean;
  deleteColumnTarget: CustomTableColumn | null;
  openDeleteColumnModal: (column: CustomTableColumn) => void;
  closeDeleteColumnModal: () => void;
}

export function useDeleteModals(): UseDeleteModalsReturn {
  const [deleteColumnModalOpen, setDeleteColumnModalOpen] = useState(false);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<CustomTableColumn | null>(null);
  const [deleteRowModalOpen, setDeleteRowModalOpen] = useState(false);
  const [deleteRowTarget, setDeleteRowTarget] = useState<CustomTableGridRow | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteRowIds, setBulkDeleteRowIds] = useState<string[]>([]);

  const requestDeleteRow = (rows: CustomTableGridRow[], rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setDeleteRowTarget(row);
      setDeleteRowModalOpen(true);
    }
  };

  const closeDeleteRowModal = () => {
    setDeleteRowModalOpen(false);
    setDeleteRowTarget(null);
  };

  const openBulkDeleteModal = (selectedRowIds: string[]) => {
    if (!selectedRowIds.length) {
      return;
    }
    setBulkDeleteRowIds(selectedRowIds);
    setBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    setBulkDeleteModalOpen(false);
    setBulkDeleteRowIds([]);
  };

  const openDeleteColumnModal = (column: CustomTableColumn) => {
    setDeleteColumnTarget(column);
    setDeleteColumnModalOpen(true);
  };

  const closeDeleteColumnModal = () => {
    setDeleteColumnModalOpen(false);
    setDeleteColumnTarget(null);
  };

  return {
    deleteRowModalOpen,
    deleteRowTarget,
    requestDeleteRow,
    closeDeleteRowModal,
    bulkDeleteModalOpen,
    bulkDeleteRowIds,
    openBulkDeleteModal,
    closeBulkDeleteModal,
    deleteColumnModalOpen,
    deleteColumnTarget,
    openDeleteColumnModal,
    closeDeleteColumnModal,
  };
}
