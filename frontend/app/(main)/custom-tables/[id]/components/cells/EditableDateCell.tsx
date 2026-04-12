'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Column, Row, Table } from '@tanstack/react-table';
import { format, isValid } from 'date-fns';
import { type CSSProperties, useState } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableDateCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateValue = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
};

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
};

export function EditableDateCell({ row, column, onUpdateCell, style }: EditableDateCellProps) {
  const initialValue = normalizeDateValue(row.original.data[column.id]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (newValue: string | null) => {
    if (newValue === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateCell(row.original.id, column.id, newValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update cell:', error);
      setSelectedValue(initialValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedValue(initialValue);
    setIsEditing(false);
  };

  const handleOpenEditor = () => {
    setSelectedValue(initialValue);
    setIsEditing(true);
  };

  const displayValue = initialValue ? format(new Date(initialValue), 'dd.MM.yyyy') : '—';

  if (isEditing) {
    return (
      <div className="relative z-20 min-w-[220px]" style={style}>
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <DatePicker
            value={toDate(selectedValue)}
            onChange={date => {
              const nextValue =
                date && isValid(date) ? format(date, 'yyyy-MM-dd') : null;
              setSelectedValue(nextValue);
              void handleSave(nextValue);
            }}
            open={isEditing}
            onOpen={() => setIsEditing(true)}
            onClose={() => {
              if (!isSaving) setIsEditing(false);
            }}
            disabled={isSaving}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                'aria-label': 'Select date',
              },
            }}
          />
          <div className="mt-2 flex justify-end gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpenEditor}
      className="w-full h-full px-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded text-left truncate"
      style={style}
      title="Click to select date"
      aria-label="Select date"
    >
      {displayValue}
    </button>
  );
}
