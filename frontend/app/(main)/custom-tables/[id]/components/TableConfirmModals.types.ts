import type { CustomTableRowPatch } from '../utils/stylingUtils';

export type PasteCellChangeFn = (rowIndex: number, colIndex: number, value: string) => void;
export type SaveRowFn = (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
