import type { SheetCellStyle } from './sheetStyleUtils';

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select';
export type LayoutType = 'auto' | 'flat' | 'matrix';

export interface GoogleSheetConnection {
  id: string;
  sheetId: string;
  sheetName: string;
  worksheetName?: string | null;
  isActive?: boolean;
  oauthConnected?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface PreviewColumn {
  index: number;
  a1: string;
  title: string;
  suggestedType: ColumnType;
  include: boolean;
}

export interface PreviewResponse {
  spreadsheetId: string;
  worksheetName: string;
  usedRange: { a1: string; rowsCount: number; colsCount: number };
  layoutSuggested: LayoutType;
  headerRowIndex: number;
  columns: PreviewColumn[];
  sampleRows: Array<{
    rowNumber: number;
    values: Array<string | null>;
    styles?: Array<SheetCellStyle | null>;
  }>;
}
