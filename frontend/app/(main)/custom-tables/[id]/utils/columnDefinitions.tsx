'use client';

import { Plus } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { type ColumnDef } from '@tanstack/react-table';
import { EditableBooleanCell } from '../components/cells/EditableBooleanCell';
import { EditableDateCell } from '../components/cells/EditableDateCell';
import { EditableNumberCell } from '../components/cells/EditableNumberCell';
import { EditableSelectCell } from '../components/cells/EditableSelectCell';
import { EditableTextCell } from '../components/cells/EditableTextCell';
import { ActionsCell } from '../components/columns/ActionsCell';
import { EditableHeader } from '../components/headers/EditableHeader';
import type {
  DeleteColumnFn,
  DeleteRowFn,
  OpenColorPickerFn,
  RenameColumnFn,
  UpdateCellFn,
} from './columnDefinitions.types';
import { type CustomTableColumn, type CustomTableGridRow, getCellStyle } from './stylingUtils';

export interface BuildColumnsParams {
  orderedColumns: CustomTableColumn[];
  columnWidths: Record<string, number>;
  onUpdateCell: UpdateCellFn;
  onRenameColumnTitle: RenameColumnFn;
  onDeleteColumn?: DeleteColumnFn;
  onAddColumnClick?: () => void;
  onOpenColorPicker: OpenColorPickerFn;
  onDeleteRow: DeleteRowFn;
  actionsHeaderLabel: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  addRowLabel: string;
}

type TRow = import('@tanstack/react-table').Row<CustomTableGridRow>;
type TColumn = import('@tanstack/react-table').Column<CustomTableGridRow>;
type TTable = import('@tanstack/react-table').Table<CustomTableGridRow>;

interface RenderDataCellParams {
  row: TRow;
  column: TColumn;
  table: TTable;
  col: CustomTableColumn;
  onUpdateCell: UpdateCellFn;
}

interface CellCommonProps {
  row: TRow;
  column: TColumn;
  table: TTable;
  cellType: CustomTableColumn['type'];
  onUpdateCell: UpdateCellFn;
  style: React.CSSProperties;
  options?: string[];
}

type CellRenderer = (p: CellCommonProps) => React.JSX.Element;

const CELL_RENDERERS: Partial<Record<CustomTableColumn['type'], CellRenderer>> = {
  boolean: p => <EditableBooleanCell {...p} />,
  date: p => <EditableDateCell {...p} />,
  number: p => <EditableNumberCell {...p} />,
  select: p => <EditableSelectCell {...p} />,
  multi_select: p => <EditableSelectCell {...p} multiple />,
};

function renderDataCell({
  row,
  column,
  table,
  col,
  onUpdateCell,
}: RenderDataCellParams): React.JSX.Element {
  const baseStyle = col.style?.cell ?? {};
  const cellStyle = getCellStyle(row.original, col.key, baseStyle);
  const commonProps: CellCommonProps = {
    row,
    column,
    table,
    cellType: col.type,
    onUpdateCell,
    style: cellStyle,
    options: col.config?.options,
  };
  const renderer = CELL_RENDERERS[col.type];
  return renderer ? renderer(commonProps) : <EditableTextCell {...commonProps} />;
}

function buildSelectColumn(): ColumnDef<CustomTableGridRow> {
  return {
    id: '__select',
    header: ({ table }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox
          aria-label="Select all rows"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      </div>
    ),
    size: 44,
    minSize: 44,
    maxSize: 44,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox
          aria-label={`Select row ${row.original.rowNumber}`}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      </div>
    ),
  };
}

function buildRowNumberColumn(): ColumnDef<CustomTableGridRow> {
  return {
    id: '__rowNumber',
    header: '#',
    size: 80,
    minSize: 60,
    maxSize: 120,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
        }}
      >
        {row.original.rowNumber}
      </div>
    ),
  };
}

interface DataColumnParams {
  col: CustomTableColumn;
  columnWidths: Record<string, number>;
  onUpdateCell: UpdateCellFn;
  onRenameColumnTitle: RenameColumnFn;
  onDeleteColumn?: DeleteColumnFn;
}
function buildDataColumn({
  col,
  columnWidths,
  onUpdateCell,
  onRenameColumnTitle,
  onDeleteColumn,
}: DataColumnParams): ColumnDef<CustomTableGridRow> {
  const icon = typeof col.config?.icon === 'string' ? col.config.icon : null;
  return {
    id: col.key,
    header: ({ column, table }) => (
      <EditableHeader
        column={column}
        table={table}
        title={col.title}
        icon={icon}
        onRename={onRenameColumnTitle}
        onDelete={onDeleteColumn}
      />
    ),
    size: columnWidths[col.key] || 180,
    minSize: 80,
    maxSize: 1200,
    enableResizing: true,
    cell: ({ row, column, table }) => renderDataCell({ row, column, table, col, onUpdateCell }),
  };
}

interface ActionsColumnParams {
  actionsHeaderLabel: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  onOpenColorPicker: OpenColorPickerFn;
  onDeleteRow: DeleteRowFn;
}
function buildActionsColumn({
  actionsHeaderLabel,
  colorTooltipLabel,
  deleteLabel,
  onOpenColorPicker,
  onDeleteRow,
}: ActionsColumnParams): ColumnDef<CustomTableGridRow> {
  return {
    id: '__actions',
    header: () => (
      <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {actionsHeaderLabel}
      </div>
    ),
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => (
      <ActionsCell
        rowId={row.original.id}
        colorTooltipLabel={colorTooltipLabel}
        deleteLabel={deleteLabel}
        onOpenColorPicker={onOpenColorPicker}
        onDeleteRow={onDeleteRow}
      />
    ),
  };
}

function buildAddColumnButton(onAddColumnClick?: () => void): ColumnDef<CustomTableGridRow> {
  return {
    id: '__add_column',
    header: () => (
      <button
        onClick={onAddColumnClick}
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-foreground)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s, color 0.2s',
        }}
        title="Add Column"
      >
        <Plus size={16} />
      </button>
    ),
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    cell: () => null,
  };
}

export function buildColumns({
  orderedColumns,
  columnWidths,
  onUpdateCell,
  onRenameColumnTitle,
  onDeleteColumn,
  onAddColumnClick,
  onOpenColorPicker,
  onDeleteRow,
  actionsHeaderLabel,
  colorTooltipLabel,
  deleteLabel,
}: BuildColumnsParams): ColumnDef<CustomTableGridRow>[] {
  return [
    buildSelectColumn(),
    buildRowNumberColumn(),
    ...orderedColumns.map(col =>
      buildDataColumn({ col, columnWidths, onUpdateCell, onRenameColumnTitle, onDeleteColumn }),
    ),
    buildActionsColumn({
      actionsHeaderLabel,
      colorTooltipLabel,
      deleteLabel,
      onOpenColorPicker,
      onDeleteRow,
    }),
    buildAddColumnButton(onAddColumnClick),
  ];
}
