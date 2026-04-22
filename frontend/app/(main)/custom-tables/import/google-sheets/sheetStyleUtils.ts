import type { CSSProperties } from 'react';

type SheetTextFormat = {
  foregroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
};

export type SheetCellStyle = {
  backgroundColor?: string;
  horizontalAlignment?: string;
  textFormat?: SheetTextFormat;
};

const ALIGNMENT_MAP: Record<string, CSSProperties['textAlign']> = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFY: 'justify',
};

const mapHorizontalAlignment = (value: unknown): CSSProperties['textAlign'] | undefined => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return raw ? ALIGNMENT_MAP[raw] : undefined;
};

const buildDecorationParts = (underline: boolean, strikethrough: boolean): string => {
  const parts: string[] = [];
  if (underline) parts.push('underline');
  if (strikethrough) parts.push('line-through');
  return parts.join(' ');
};

const resolveTextDecoration = (
  underline: boolean | undefined,
  strikethrough: boolean | undefined,
): CSSProperties['textDecorationLine'] | undefined => {
  if (underline === true || strikethrough === true) {
    return buildDecorationParts(underline === true, strikethrough === true) as CSSProperties['textDecorationLine'];
  }
  if (underline === false || strikethrough === false) return 'none';
  return undefined;
};

const boolField = (tf: SheetTextFormat, key: keyof SheetTextFormat): boolean | undefined =>
  typeof tf[key] === 'boolean' ? (tf[key] as boolean) : undefined;

const extractColorAndWeight = (tf: SheetTextFormat): Partial<CSSProperties> => ({
  color: typeof tf.foregroundColor === 'string' ? tf.foregroundColor : undefined,
  fontWeight: typeof tf.bold === 'boolean' ? (tf.bold ? 700 : 400) : undefined,
  fontStyle: typeof tf.italic === 'boolean' ? (tf.italic ? 'italic' : 'normal') : undefined,
});

const extractSizeAndFamily = (tf: SheetTextFormat): Partial<CSSProperties> => ({
  fontSize:
    typeof tf.fontSize === 'number' && Number.isFinite(tf.fontSize) && tf.fontSize > 0
      ? tf.fontSize : undefined,
  fontFamily: typeof tf.fontFamily === 'string' && tf.fontFamily.trim() ? tf.fontFamily : undefined,
});

const extractTextFormatStyles = (tf: SheetTextFormat | null): Partial<CSSProperties> => {
  if (!tf) return {};
  const textDecorationLine = resolveTextDecoration(boolField(tf, 'underline'), boolField(tf, 'strikethrough'));
  return {
    ...extractColorAndWeight(tf),
    ...extractSizeAndFamily(tf),
    textDecorationLine,
  };
};

export const sheetStyleToCss = (style: SheetCellStyle): Partial<CSSProperties> => {
  const backgroundColor =
    typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
  const textAlign = mapHorizontalAlignment(style.horizontalAlignment);
  const tf = style.textFormat ?? null;
  const textStyles = extractTextFormatStyles(tf);
  return { backgroundColor, textAlign, ...textStyles };
};
