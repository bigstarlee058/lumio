import type { CustomTableColumn, CustomTableColumnConfig, SheetStyle } from './stylingUtils';

export interface CustomTablePageColumn extends CustomTableColumn {
  isRequired: boolean;
  isUnique: boolean;
  width?: number;
  config: CustomTableColumnConfig | null;
  style?: {
    header?: SheetStyle;
    cell?: SheetStyle;
  } | null;
}

export interface CustomTableViewColumnSettings {
  width?: number;
}

export interface CustomTableViewSettings {
  columns?: Record<string, CustomTableViewColumnSettings>;
}

export interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  source: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  columns: CustomTablePageColumn[];
  viewSettings?: CustomTableViewSettings | null;
}
