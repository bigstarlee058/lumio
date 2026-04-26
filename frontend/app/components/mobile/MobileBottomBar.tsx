'use client';

import { BarChart2, FileText, LayoutDashboard, Menu, Plus } from '@/app/components/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { isNavItemActive } from '../navigation/helpers/navigation-config';
import { MobileMenuDrawer } from './MobileMenuDrawer';

export default function MobileBottomBar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="lumio-bottom-bar" aria-label="Mobile navigation">
        {/* Tab 1: Dashboard */}
        <Link
          href="/dashboard"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/dashboard') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <LayoutDashboard size={22} />
        </Link>

        {/* Tab 2: Statements */}
        <Link
          href="/statements"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/statements') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <FileText size={22} />
        </Link>

        {/* Tab 3: FAB — New Statement */}
        <Link href="/statements?upload=1" className="lumio-bottom-bar__fab">
          <Plus size={24} />
        </Link>

        {/* Tab 4: Reports */}
        <Link
          href="/reports"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/reports') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <BarChart2 size={22} />
        </Link>

        {/* Tab 5: Menu */}
        <button
          type="button"
          className="lumio-bottom-bar__tab"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </nav>

      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
