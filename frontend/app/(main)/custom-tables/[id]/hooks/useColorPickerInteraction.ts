'use client';

import { useCallback, useState } from 'react';
import { parseHexFromColor } from '../utils/colorUtils';
import type { CustomTableGridRow } from '../utils/stylingUtils';

interface UseColorPickerInteractionParams {
  rows: CustomTableGridRow[];
  setColorPickerRowId: (id: string | null) => void;
}

export interface UseColorPickerInteractionReturn {
  colorPickerValue: string;
  colorPickerAnchorPosition: { top: number; left: number } | null;
  openColorPickerForRow: (rowId: string, event: { clientX: number; clientY: number }) => void;
  handleColorPickerClose: () => void;
  handleColorPickerChange: (next: string) => void;
}

export function useColorPickerInteraction({ rows, setColorPickerRowId }: UseColorPickerInteractionParams): UseColorPickerInteractionReturn {
  const [colorPickerValue, setColorPickerValue] = useState('#ff8a00');
  const [colorPickerAnchorPosition, setColorPickerAnchorPosition] = useState<{ top: number; left: number } | null>(null);

  const openColorPickerForRow = useCallback(
    (rowId: string, event: { clientX: number; clientY: number }): void => {
      const row = rows.find(r => r.id === rowId);
      setColorPickerValue(parseHexFromColor(row?.styles?.manualFill) || '#ff8a00');
      setColorPickerRowId(rowId);
      setColorPickerAnchorPosition({ top: event.clientY, left: event.clientX });
    },
    [rows, setColorPickerRowId],
  );

  const handleColorPickerClose = useCallback((): void => {
    setColorPickerRowId(null);
    setColorPickerAnchorPosition(null);
  }, [setColorPickerRowId]);

  const handleColorPickerChange = useCallback((next: string): void => { setColorPickerValue(next); }, []);

  return { colorPickerValue, colorPickerAnchorPosition, openColorPickerForRow, handleColorPickerClose, handleColorPickerChange };
}
