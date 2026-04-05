'use client';

import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';
import { useEditableCell } from './useEditableCell';

interface EditableTextCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

export function EditableTextCell({ row, column, onUpdateCell, style }: EditableTextCellProps) {
  const rawValue = row.original.data[column.id];
  const initialValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);

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
  } = useEditableCell<string>({
    initialValue,
    rowId: row.original.id,
    columnKey: column.id,
    onUpdateCell,
  });

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-full h-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none bg-blue-50 dark:bg-blue-900/20"
        style={style}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="w-full h-full px-2 py-1 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded truncate"
      style={style}
      title="Double-click to edit"
    >
      {inputValue || <span className="text-gray-400 dark:text-gray-600">—</span>}
    </div>
  );
}
