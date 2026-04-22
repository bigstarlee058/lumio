import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';

export type SelectRowFn = (rowId: string, checked: boolean) => void;
export type FormatMobileCellFn = (column: CustomTableColumn, row: CustomTableGridRow) => string;
