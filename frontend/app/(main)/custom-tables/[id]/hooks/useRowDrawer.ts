'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CustomTableGridRow } from '../utils/stylingUtils';

export interface UseRowDrawerReturn {
  rowDrawerOpen: boolean;
  rowDrawerMode: 'view' | 'edit';
  rowDrawerRowId: string | null;
  drawerRow: CustomTableGridRow | null;
  setRowDrawerMode: (mode: 'view' | 'edit') => void;
  openRowDrawer: (rowId: string, mode: 'view' | 'edit') => void;
  closeRowDrawer: () => void;
}

export function useRowDrawer(rows: CustomTableGridRow[]): UseRowDrawerReturn {
  const [rowDrawerOpen, setRowDrawerOpen] = useState(false);
  const [rowDrawerMode, setRowDrawerMode] = useState<'view' | 'edit'>('view');
  const [rowDrawerRowId, setRowDrawerRowId] = useState<string | null>(null);

  const drawerRow = useMemo(() => {
    if (!rowDrawerRowId) {
      return null;
    }
    return rows.find(r => r.id === rowDrawerRowId) || null;
  }, [rows, rowDrawerRowId]);

  const openRowDrawer = (rowId: string, mode: 'view' | 'edit') => {
    setRowDrawerRowId(rowId);
    setRowDrawerMode(mode);
    setRowDrawerOpen(true);
  };

  const closeRowDrawer = () => {
    setRowDrawerOpen(false);
    setRowDrawerRowId(null);
    setRowDrawerMode('view');
  };

  // Auto-close if the row was deleted from underneath the drawer
  useEffect(() => {
    if (!(rowDrawerOpen && rowDrawerRowId)) {
      return;
    }
    const exists = rows.some(r => r.id === rowDrawerRowId);
    if (!exists) {
      closeRowDrawer();
    }
  }, [rowDrawerOpen, rowDrawerRowId, rows]);

  return {
    rowDrawerOpen,
    rowDrawerMode,
    rowDrawerRowId,
    drawerRow,
    setRowDrawerMode,
    openRowDrawer,
    closeRowDrawer,
  };
}
