import { useMemo } from 'react';
import { getTranslationValue } from '../utils/translationUtils';

interface TanStackT {
  fill?: { colorTooltip?: { value?: string } };
  grid?: { loadingMore?: { value?: string } };
}

export interface ColumnLabels {
  actionsHeaderLabel: string; colorTooltipLabel: string; deleteLabel: string; addRowLabel: string;
}

export interface CommonLabels {
  addRowLabel: string; emptyTitle: string; emptySubtitle: string; loadingMore: string;
}

export interface TanStackLabels {
  columnLabels: ColumnLabels;
  commonLabels: CommonLabels;
}

export function useTanStackLabels(t: TanStackT): TanStackLabels {
  const columnLabels = useMemo((): ColumnLabels => ({
    actionsHeaderLabel: getTranslationValue({ root: t, path: ['actions', 'actionsHeader'], fallback: 'Actions' }),
    colorTooltipLabel: String(t.fill?.colorTooltip?.value ?? ''),
    deleteLabel: getTranslationValue({ root: t, path: ['actions', 'delete'], fallback: 'Delete' }),
    addRowLabel: getTranslationValue({ root: t, path: ['grid', 'addRowLabel'], fallback: 'Add row' }),
  }), [t]);

  const commonLabels = useMemo((): CommonLabels => ({
    addRowLabel: getTranslationValue({ root: t, path: ['grid', 'addRowLabel'], fallback: 'Add row' }),
    emptyTitle: getTranslationValue({ root: t, path: ['grid', 'emptyTitle'], fallback: 'No rows yet' }),
    emptySubtitle: getTranslationValue({ root: t, path: ['grid', 'emptySubtitle'], fallback: '' }),
    loadingMore: String(t.grid?.loadingMore?.value ?? 'Loading...'),
  }), [t]);

  return { columnLabels, commonLabels };
}
