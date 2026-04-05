import type { CSSProperties } from 'react';

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select';

export type CustomTableCellValue = string | number | boolean | string[] | null;
export type CustomTableRowPatch = Record<string, CustomTableCellValue>;

export interface CustomTableColumnConfig {
  options?: string[];
  [key: string]: unknown;
}

export interface SheetTextFormat {
  foregroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface SheetStyle {
  backgroundColor?: string;
  horizontalAlignment?: string;
  verticalAlignment?: string;
  textFormat?: SheetTextFormat;
  [key: string]: unknown;
}

export interface CustomTableRowStyles {
  manualFill?: string;
  manualTag?: string;
  [key: string]: SheetStyle | string | undefined;
}

export interface CustomTableColumn {
  id: string;
  key: string;
  title: string;
  type: ColumnType;
  position: number;
  config: CustomTableColumnConfig | null;
  style?: {
    header?: SheetStyle;
    cell?: SheetStyle;
  } | null;
}

export interface CustomTableGridRow {
  id: string;
  rowNumber: number;
  data: CustomTableRowPatch;
  styles?: CustomTableRowStyles | null;
}

export type RowFilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'search';

export type RowFilter = { col: string; op: RowFilterOp; value?: unknown };

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  return true;
};

export const mergeSheetStyle = (
  base: SheetStyle | null | undefined,
  override: SheetStyle | null | undefined,
): SheetStyle => {
  const merged: SheetStyle = { ...(base || {}) };
  if (!override) return merged;
  for (const [key, value] of Object.entries(override)) {
    if (value === null) {
      delete merged[key];
    } else if (value !== undefined) {
      const existing = merged[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        merged[key] = mergeSheetStyle(existing, value);
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
};

export const mapHorizontalAlignment = (value: unknown): CSSProperties['textAlign'] | undefined => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!raw) return undefined;
  if (raw === 'LEFT') return 'left';
  if (raw === 'CENTER') return 'center';
  if (raw === 'RIGHT') return 'right';
  if (raw === 'JUSTIFY') return 'justify';
  return undefined;
};

export const mapVerticalAlignment = (
  value: unknown,
): CSSProperties['verticalAlign'] | undefined => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!raw) return undefined;
  if (raw === 'TOP') return 'top';
  if (raw === 'MIDDLE' || raw === 'CENTER') return 'middle';
  if (raw === 'BOTTOM') return 'bottom';
  return undefined;
};

export const mapFontFamily = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const quoted =
    /[\s"]/g.test(trimmed) && !trimmed.includes(',')
      ? `"${trimmed.replace(/"/g, '\\"')}"`
      : trimmed;
  if (trimmed.includes(',')) return trimmed;
  return `${quoted}, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
};

export const sheetStyleToCss = (style: SheetStyle) => {
  const backgroundColor =
    typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
  const textAlign = mapHorizontalAlignment(style.horizontalAlignment);
  const verticalAlign = mapVerticalAlignment(style.verticalAlignment);

  const tf = style.textFormat && typeof style.textFormat === 'object' ? style.textFormat : null;
  const color = tf && typeof tf.foregroundColor === 'string' ? tf.foregroundColor : undefined;
  const fontWeight = tf && typeof tf.bold === 'boolean' ? (tf.bold ? 700 : 400) : undefined;
  const fontStyle =
    tf && typeof tf.italic === 'boolean' ? (tf.italic ? 'italic' : 'normal') : undefined;

  const underline = tf && typeof tf.underline === 'boolean' ? tf.underline : undefined;
  const strikethrough = tf && typeof tf.strikethrough === 'boolean' ? tf.strikethrough : undefined;
  let textDecorationLine: CSSProperties['textDecorationLine'] | undefined;
  if (underline === true || strikethrough === true) {
    const parts: string[] = [];
    if (underline === true) parts.push('underline');
    if (strikethrough === true) parts.push('line-through');
    textDecorationLine = parts.join(' ') as CSSProperties['textDecorationLine'];
  } else if (underline === false || strikethrough === false) {
    textDecorationLine = 'none';
  }

  const fontSize =
    tf && typeof tf.fontSize === 'number' && Number.isFinite(tf.fontSize) && tf.fontSize > 0
      ? tf.fontSize
      : undefined;
  const fontFamily =
    tf && typeof tf.fontFamily === 'string' ? mapFontFamily(tf.fontFamily) : undefined;

  return {
    backgroundColor,
    textAlign,
    verticalAlign,
    color,
    fontWeight,
    fontStyle,
    textDecorationLine,
    fontSize,
    fontFamily,
  };
};

export const getCellStyle = (
  row: CustomTableGridRow,
  columnKey: string,
  baseStyle?: SheetStyle,
): CSSProperties => {
  const rowStyles = row.styles || {};
  const rawCellOverride = rowStyles[columnKey];
  const cellOverride = isPlainObject(rawCellOverride) ? (rawCellOverride as SheetStyle) : undefined;

  const merged = mergeSheetStyle(baseStyle, cellOverride);
  const css = sheetStyleToCss(merged);

  return {
    ...(css.backgroundColor ? { backgroundColor: css.backgroundColor } : {}),
    ...(css.textAlign ? { textAlign: css.textAlign } : {}),
    ...(css.verticalAlign ? { verticalAlign: css.verticalAlign } : {}),
    ...(css.color ? { color: css.color } : {}),
    ...(css.fontWeight ? { fontWeight: css.fontWeight } : {}),
    ...(css.fontStyle ? { fontStyle: css.fontStyle } : {}),
    ...(css.textDecorationLine ? { textDecorationLine: css.textDecorationLine } : {}),
    ...(css.fontSize ? { fontSize: `${css.fontSize}px` } : {}),
    ...(css.fontFamily ? { fontFamily: css.fontFamily } : {}),
  };
};

export const getRowStyle = (row: CustomTableGridRow): CSSProperties => {
  const styles = row.styles || {};

  if (styles.manualFill) {
    return { backgroundColor: styles.manualFill };
  }

  const tag = styles.manualTag;
  if (tag === 'heading') {
    return { backgroundColor: '#111827', color: '#fff', fontWeight: 600 };
  }
  if (tag === 'total') {
    return { backgroundColor: '#0f172a', color: '#fff', fontWeight: 700 };
  }

  return {};
};
