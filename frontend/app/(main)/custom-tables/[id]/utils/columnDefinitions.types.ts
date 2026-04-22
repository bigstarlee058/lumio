import type { CustomTableCellValue } from './stylingUtils';

export type UpdateCellFn = (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
export type RenameColumnFn = (columnKey: string, nextTitle: string) => Promise<void>;
export type DeleteColumnFn = (columnKey: string) => void;
export type DeleteRowFn = (rowId: string) => void;
export type OpenColorPickerFn = (rowId: string, event: { clientX: number; clientY: number }) => void;
