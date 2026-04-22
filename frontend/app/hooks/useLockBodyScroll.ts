'use client';

import { useEffect, useState } from 'react';

// CSS class approach avoids interfering with MUI's inline-style scroll management.
// MUI Dialog/Drawer saves and restores body.style.overflow directly; if we also
// write to body.style.overflow, MUI may restore a stale 'hidden' value after our
// lock releases, permanently blocking scroll. Using a class + CSS variable keeps
// our lock on a separate "channel" that MUI never touches.
const LOCK_CLASS = 'body-scroll-locked';
const SCROLLBAR_VAR = '--scroll-lock-scrollbar-width';

let lockCount = 0;

const lockBodyScroll = () => {
  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty(SCROLLBAR_VAR, `${scrollbarWidth}px`);
    document.body.classList.add(LOCK_CLASS);
  }
  lockCount += 1;
};

const unlockBodyScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.classList.remove(LOCK_CLASS);
    document.documentElement.style.removeProperty(SCROLLBAR_VAR);
  }
};

export const useLockBodyScroll = (locked: boolean, skipIfLocked = false) => {
  useEffect(() => {
    if (!locked || skipIfLocked) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked, skipIfLocked]);
};

export const useIsAnyModalOpen = () => {
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  useEffect(() => {
    const checkModalState = () => {
      setIsAnyModalOpen(lockCount > 0);
    };

    checkModalState();

    const interval = setInterval(checkModalState, 100);

    return () => clearInterval(interval);
  }, []);

  return isAnyModalOpen;
};
