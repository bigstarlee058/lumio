'use client';

import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';
import { useEditableCell } from './useEditableCell';

interface EditableNumberCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

export function EditableNumberCell({ row, column, onUpdateCell, style }: EditableNumberCellProps) {
  const rawValue = row.original.data[column.id];
  const initialValue = rawValue === null || rawValue === undefined ? null : Number(rawValue);

  const {
    isEditing,
    setIsEditing,
    inputValue,
    setInputValue,
    isSaving,
    inputRef,
    handleSave,
    handleCancel,
    handleKeyDown,
  } = useEditableCell<number | null>({
    initialValue,
    rowId: row.original.id,
    columnKey: column.id,
    onUpdateCell,
    toInputString: v => (v === null || v === undefined ? '' : String(v)),
    parseValue: raw => (raw.trim() === '' ? null : Number(raw)),
  });

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-full h-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none bg-blue-50 dark:bg-blue-900/20 text-right"
        style={style}
      />
    );
  }

  const displayValue = initialValue != null ? Number(initialValue).toLocaleString() : '—';

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="w-full h-full px-2 py-1 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded text-right truncate"
      style={style}
      title="Double-click to edit"
    >
      {displayValue}
    </div>
  );
}
