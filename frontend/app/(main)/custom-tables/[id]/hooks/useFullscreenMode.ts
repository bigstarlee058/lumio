'use client';

import { useCallback, useEffect, useState } from 'react';
import { handleFullscreenEscapeNavigation } from '../utils/fullscreenEscapeNavigation';
import { isContentEditableTarget } from '../utils/tableHelpers';

interface UseFullscreenModeParams {
  isFullscreen: boolean;
  user: unknown;
  normalizedActiveTabId: string;
  columnsTabId: string;
  handleBackNavigation: () => void;
}

export interface UseFullscreenModeReturn {
  isPrintMode: boolean;
  handlePrintTable: () => void;
}

function applyFullscreenClasses(isFs: boolean, tabId: string, colsTabId: string): void {
  document.body.classList.toggle('ff-table-fullscreen', isFs);
  document.body.classList.toggle('ff-table-columns-scroll', isFs && tabId === colsTabId);
}

function removeFullscreenClasses(): void {
  document.body.classList.remove('ff-table-fullscreen', 'ff-table-columns-scroll');
}

function isKeyboardTargetIgnored(target: HTMLElement | null): boolean {
  if (!target) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return (
    ['input', 'textarea', 'select'].includes(tag) ||
    (isContentEditableTarget(target) && target.isContentEditable)
  );
}

export function useFullscreenMode({
  isFullscreen,
  user,
  normalizedActiveTabId,
  columnsTabId,
  handleBackNavigation,
}: UseFullscreenModeParams): UseFullscreenModeReturn {
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handlePrintTable = useCallback((): void => {
    setIsPrintMode(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    applyFullscreenClasses(isFullscreen, normalizedActiveTabId, columnsTabId);
    return () => removeFullscreenClasses();
  }, [isFullscreen, user, normalizedActiveTabId, columnsTabId]);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (isKeyboardTargetIgnored(target)) {
        return;
      }
      handleFullscreenEscapeNavigation(event.key, handleBackNavigation);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackNavigation, isFullscreen]);

  useEffect(() => {
    const handleBeforePrint = (): void => setIsPrintMode(true);
    const handleAfterPrint = (): void => setIsPrintMode(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return { isPrintMode, handlePrintTable };
}
