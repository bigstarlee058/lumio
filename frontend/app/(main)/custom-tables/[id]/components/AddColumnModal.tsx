'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import { Save } from 'lucide-react';
import type { ColumnType } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';

interface ColumnTypeOption {
  value: ColumnType;
  label: string;
}

interface AddColumnModalProps {
  t: unknown;
  isOpen: boolean;
  onClose: () => void;
  newColumn: { title: string; type: ColumnType };
  setNewColumn: React.Dispatch<React.SetStateAction<{ title: string; type: ColumnType }>>;
  createColumn: () => Promise<void>;
  columnTypes: ColumnTypeOption[];
}

export function AddColumnModal({
  t,
  isOpen,
  onClose,
  newColumn,
  setNewColumn,
  createColumn,
  columnTypes,
}: AddColumnModalProps) {
  const handleClose = () => {
    onClose();
    setNewColumn({ title: '', type: 'text' });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      className="rounded-2xl"
      title={tx(t, ['addColumn', 'modalTitle'], tx(t, ['addColumn', 'titleLabel'], ''))}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {tx(t, ['addColumn', 'cancel'], 'Cancel')}
          </button>
          <button
            type="button"
            onClick={createColumn}
            disabled={!newColumn.title.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {tx(t, ['addColumn', 'save'], 'Save')}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div className="md:col-span-4">
          <label
            className="block text-sm font-semibold text-gray-700 mb-2"
            htmlFor="new-column-title"
          >
            {tx(t, ['addColumn', 'titleLabel'], 'Column title')}
          </label>
          <input
            id="new-column-title"
            value={newColumn.title}
            onChange={e => setNewColumn(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (newColumn.title.trim()) createColumn();
              }
            }}
            placeholder={tx(t, ['addColumn', 'titlePlaceholder'], '')}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition shadow-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label
            className="block text-sm font-semibold text-gray-700 mb-2"
            htmlFor="new-column-type"
          >
            {tx(t, ['addColumn', 'typeLabel'], 'Type')}
          </label>
          <select
            id="new-column-type"
            value={newColumn.type}
            onChange={e =>
              setNewColumn(prev => ({
                ...prev,
                type: e.target.value as ColumnType,
              }))
            }
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition"
          >
            {columnTypes.map(typeItem => (
              <option key={typeItem.value} value={typeItem.value}>
                {typeItem.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </ModalShell>
  );
}
