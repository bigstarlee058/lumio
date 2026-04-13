'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import GlobalNavHeight from './GlobalNavHeight';
import Navigation from './Navigation';

function shouldHideChrome(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/invite')
  );
}

export default function AppChrome() {
  const pathname = usePathname();
  const hidden = shouldHideChrome(pathname);

  useEffect(() => {
    if (hidden) {
      document.documentElement.style.setProperty('--global-nav-height', '0px');
    }
  }, [hidden]);

  if (hidden) {
    return null;
  }

  return (
    <>
      <GlobalNavHeight />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }} data-global-nav>
        <Navigation />
      </div>
      <div
        aria-hidden="true"
        data-global-nav-spacer
        style={{ height: 'var(--global-nav-height, 0px)' }}
      />
    </>
  );
}
