'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { PasteMappingSelection, PastePreviewData } from '../utils/pasteUtils';

export interface UsePasteStateReturn {
  pastePreviewOpen: boolean;
  setPastePreviewOpen: (v: boolean) => void;
  pasteParsing: boolean;
  setPasteParsing: (v: boolean) => void;
  pasteApplying: boolean;
  setPasteApplying: (v: boolean) => void;
  pasteRawRows: string[][];
  setPasteRawRows: (v: string[][]) => void;
  pasteUseHeaders: boolean;
  setPasteUseHeaders: (v: boolean) => void;
  pastePreview: PastePreviewData | null;
  setPastePreview: (v: PastePreviewData | null) => void;
  pasteMapping: Record<number, PasteMappingSelection>;
  setPasteMapping: (v: Record<number, PasteMappingSelection>) => void;
  pasteEdits: Record<string, string>;
  setPasteEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pastePreviewTimerRef: React.MutableRefObject<number | null>;
  hasMissingPasteColumnTitles: boolean;
  resetPastePreview: () => void;
}

export function usePasteState(): UsePasteStateReturn {
  const [pastePreviewOpen, setPastePreviewOpen] = useState(false);
  const [pasteParsing, setPasteParsing] = useState(false);
  const [pasteApplying, setPasteApplying] = useState(false);
  const [pasteRawRows, setPasteRawRows] = useState<string[][]>([]);
  const [pasteUseHeaders, setPasteUseHeaders] = useState(false);
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);
  const [pasteMapping, setPasteMapping] = useState<Record<number, PasteMappingSelection>>({});
  const [pasteEdits, setPasteEdits] = useState<Record<string, string>>({});
  const pastePreviewTimerRef = useRef<number | null>(null);

  const hasMissingPasteColumnTitles = useMemo(
    () => Boolean(pastePreview?.columns.some(col => col.mode === 'new' && !col.newTitle?.trim())),
    [pastePreview],
  );

  const resetPastePreview = useCallback((): void => {
    setPastePreviewOpen(false);
    setPastePreview(null);
    setPasteRawRows([]);
    setPasteUseHeaders(false);
    setPasteParsing(false);
    setPasteApplying(false);
    setPasteMapping({});
    setPasteEdits({});
    if (pastePreviewTimerRef.current) {
      window.clearTimeout(pastePreviewTimerRef.current);
      pastePreviewTimerRef.current = null;
    }
  }, []);

  return {
    pastePreviewOpen,
    setPastePreviewOpen,
    pasteParsing,
    setPasteParsing,
    pasteApplying,
    setPasteApplying,
    pasteRawRows,
    setPasteRawRows,
    pasteUseHeaders,
    setPasteUseHeaders,
    pastePreview,
    setPastePreview,
    pasteMapping,
    setPasteMapping,
    pasteEdits,
    setPasteEdits,
    pastePreviewTimerRef,
    hasMissingPasteColumnTitles,
    resetPastePreview,
  };
}
