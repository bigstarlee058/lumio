import { useEffect, useState } from 'react';

function getIsDesktop(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(min-width: 1024px)').matches;
}

function useDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent): void => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

function useCloseOnOutsideClick(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent): void => {
      if (!(e.target as Element | null)?.closest('[data-statements-fab-interactive="true"]')) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
}

export type UploadMenuState = {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  portalReady: boolean;
  isDesktopViewport: boolean;
};

export function useUploadMenuState(): UploadMenuState {
  const [isOpen, setIsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const isDesktopViewport = useDesktopViewport();
  const close = (): void => setIsOpen(false);
  useEffect(() => { setPortalReady(true); }, []);
  useCloseOnOutsideClick(isOpen, close);
  return { isOpen, setIsOpen, portalReady, isDesktopViewport };
}
