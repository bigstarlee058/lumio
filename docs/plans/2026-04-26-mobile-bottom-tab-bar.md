# Mobile Bottom Tab Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mobile hamburger-opens-sidebar pattern with a fixed bottom tab bar (5 tabs) + full-screen drawer menu, matching the Todoist-style concept.

**Architecture:** Create a new `MobileBottomBar` component that renders a fixed bottom tab bar on screens <1024px. The bar has 5 slots: Dashboard, Statements, central FAB (+), Reports, and a hamburger that opens a full-height slide-in drawer with all nav items + settings. The existing desktop sidebar and TopBar remain unchanged. The mobile sidebar drawer from `AppChrome` is replaced by the new drawer triggered from the bottom bar.

**Tech Stack:** React, Next.js App Router, SCSS (BEM), existing icon system (`@/app/components/icons`), existing nav config (`navigation-config.ts`), existing auth/workspace context hooks.

---

## Task 1: Create `MobileBottomBar` component (skeleton)

**Files:**
- Create: `frontend/app/components/mobile/MobileBottomBar.tsx`
- Create: `frontend/app/styles/layout/_mobile-bottom-bar.scss`
- Modify: `frontend/app/styles/layout/_index.scss` (add import)

**Step 1: Create the component file**

```tsx
// frontend/app/components/mobile/MobileBottomBar.tsx
'use client';

import { BarChart2, FileText, LayoutDashboard, Menu, Plus } from '@/app/components/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { isNavItemActive } from '../navigation/helpers/navigation-config';
import { MobileMenuDrawer } from './MobileMenuDrawer';

const TAB_ITEMS = [
  { icon: LayoutDashboard, path: '/dashboard', label: 'Dashboard' },
  { icon: FileText, path: '/statements', label: 'Statements' },
  null, // FAB placeholder
  { icon: BarChart2, path: '/reports', label: 'Reports' },
  null, // Menu placeholder
] as const;

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
```

**Step 2: Create the SCSS file**

```scss
// frontend/app/styles/layout/_mobile-bottom-bar.scss
@use '../abstracts' as *;

// Only visible on mobile (<1024px)
.lumio-bottom-bar {
  display: none;

  @media (max-width: 1023px) {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: $lumio-color-surface;
    border-top: 1px solid $lumio-color-border;
    z-index: 40;
    padding-bottom: env(safe-area-inset-bottom, 0);

    @include dark {
      background: $lumio-color-surface-dk;
      border-top-color: $lumio-color-border-dk;
    }
  }

  &__tab {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    color: $lumio-color-ink-400;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.15s;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;

    @include dark {
      color: $lumio-color-ink-400-dk;
    }

    &--active {
      color: $lumio-color-primary;

      @include dark {
        color: $lumio-color-primary-dk;
      }
    }
  }

  &__fab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: $lumio-color-primary;
    color: #fff;
    flex-shrink: 0;
    margin-top: -12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    text-decoration: none;
    transition: transform 0.1s, background 0.15s;
    -webkit-tap-highlight-color: transparent;

    @include dark {
      background: $lumio-color-primary-dk;
    }

    &:active {
      transform: scale(0.92);
    }
  }
}
```

**Step 3: Add import to layout SCSS index**

Check the layout index file and add `@use 'mobile-bottom-bar';` to it.

**Step 4: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | head -20` (or dev server check)

**Step 5: Commit**

```bash
git add frontend/app/components/mobile/MobileBottomBar.tsx frontend/app/styles/layout/_mobile-bottom-bar.scss
git commit -m "feat(mobile): add bottom tab bar skeleton with FAB"
```

---

## Task 2: Create `MobileMenuDrawer` component

**Files:**
- Create: `frontend/app/components/mobile/MobileMenuDrawer.tsx`
- Create: `frontend/app/styles/layout/_mobile-menu-drawer.scss`
- Modify: `frontend/app/styles/layout/_index.scss` (add import)

**Step 1: Create the drawer component**

This drawer slides in from the right (like the concept's second screenshot) and contains all nav items grouped by section, plus Settings, Help, etc.

```tsx
// frontend/app/components/mobile/MobileMenuDrawer.tsx
'use client';

import { HelpCircle, Settings, X } from '@/app/components/icons';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { buildNavItems, isNavItemActive } from '../navigation/helpers/navigation-config';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { nav } = useIntlayer('navigation');

  const navItems = buildNavItems(nav as Parameters<typeof buildNavItems>[0]);
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`lumio-mobile-drawer__backdrop${open ? ' lumio-mobile-drawer__backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`lumio-mobile-drawer${open ? ' lumio-mobile-drawer--open' : ''}`}
        aria-label="Menu"
      >
        <div className="lumio-mobile-drawer__header">
          <span className="lumio-mobile-drawer__title">Menu</span>
          <button
            type="button"
            className="lumio-mobile-drawer__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="lumio-mobile-drawer__nav">
          <div className="lumio-mobile-drawer__section-label">Workspace</div>
          {visibleNavItems.map(item => {
            const active = isNavItemActive(pathname ?? '', item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`lumio-mobile-drawer__item${active ? ' lumio-mobile-drawer__item--active' : ''}`}
                onClick={onClose}
              >
                <span className="lumio-mobile-drawer__item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="lumio-mobile-drawer__footer">
          <Link href="/settings/profile" className="lumio-mobile-drawer__item" onClick={onClose}>
            <span className="lumio-mobile-drawer__item-icon"><Settings size={18} /></span>
            <span>Settings</span>
          </Link>
          <button
            type="button"
            className="lumio-mobile-drawer__item"
            onClick={() => {
              window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
              onClose();
            }}
          >
            <span className="lumio-mobile-drawer__item-icon"><HelpCircle size={18} /></span>
            <span>Help</span>
          </button>
        </div>
      </aside>
    </>
  );
}
```

**Step 2: Create the drawer SCSS**

```scss
// frontend/app/styles/layout/_mobile-menu-drawer.scss
@use '../abstracts' as *;

.lumio-mobile-drawer__backdrop {
  display: none;

  @media (max-width: 1023px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 49;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.22s;

    &--visible {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.lumio-mobile-drawer {
  display: none;

  @media (max-width: 1023px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 80vw;
    max-width: 320px;
    background: $lumio-color-surface;
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: $lumio-shadow-lg;

    @include dark {
      background: $lumio-color-surface-dk;
    }

    &--open {
      transform: translateX(0);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid $lumio-color-border;
    flex-shrink: 0;

    @include dark {
      border-bottom-color: $lumio-color-border-dk;
    }
  }

  &__title {
    font-size: 16px;
    font-weight: 700;
    color: $lumio-color-text-primary;

    @include dark {
      color: $lumio-color-text-primary-dk;
    }
  }

  &__close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $lumio-radius-sm;
    border: none;
    background: transparent;
    color: $lumio-color-ink-500;
    cursor: pointer;

    @include dark {
      color: $lumio-color-ink-500-dk;
    }
  }

  &__nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  &__section-label {
    font-size: 10.5px;
    font-weight: 600;
    color: $lumio-color-ink-400;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 8px 8px 4px;

    @include dark {
      color: $lumio-color-ink-400-dk;
    }
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 8px;
    border-radius: $lumio-radius-sm;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: $lumio-color-text-secondary;
    text-decoration: none;
    text-align: left;
    font-family: inherit;
    transition: background 0.1s, color 0.1s;

    @include dark {
      color: $lumio-color-text-secondary-dk;
    }

    &:hover,
    &:active {
      background: $lumio-color-ink-50;
      color: $lumio-color-text-primary;

      @include dark {
        background: $lumio-color-ink-100-dk;
        color: $lumio-color-text-primary-dk;
      }
    }

    &--active {
      background: $lumio-color-primary-50;
      color: $lumio-color-primary;
      font-weight: 600;

      @include dark {
        background: $lumio-color-primary-100-dk;
        color: $lumio-color-primary-dk;
      }
    }

    &-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      opacity: 0.7;
    }
  }

  &__footer {
    flex-shrink: 0;
    padding: 8px;
    border-top: 1px solid $lumio-color-border;

    @include dark {
      border-top-color: $lumio-color-border-dk;
    }
  }
}
```

**Step 3: Add SCSS import**

**Step 4: Verify build**

**Step 5: Commit**

```bash
git add frontend/app/components/mobile/MobileMenuDrawer.tsx frontend/app/styles/layout/_mobile-menu-drawer.scss
git commit -m "feat(mobile): add full-screen menu drawer for bottom bar"
```

---

## Task 3: Integrate `MobileBottomBar` into root layout

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/styles/layout/_shell.scss`

**Step 1: Add MobileBottomBar to the layout**

In `frontend/app/layout.tsx`, import and render `MobileBottomBar` after `</main>`:

```tsx
import MobileBottomBar from './components/mobile/MobileBottomBar';

// Inside the layout JSX, after <main>{children}</main>:
<MobileBottomBar />
```

**Step 2: Add bottom padding to main content on mobile**

In `_shell.scss`, add a rule so content doesn't get hidden behind the bottom bar:

```scss
// Inside the @media (max-width: 1023px) block, add:
.lumio-shell__content > main {
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}
```

**Step 3: Hide mobile sidebar from AppChrome on mobile**

The old mobile sidebar drawer (from `AppChrome`) should no longer render on mobile since the bottom bar's menu drawer replaces it. In `_shell.scss`, update the existing responsive block to also hide the overlay:

The hamburger in TopBar should also be hidden on mobile since bottom bar replaces it. Update `_shell.scss`:

```scss
@media (max-width: 1023px) {
  .lumio-topbar__hamburger {
    display: none; // Now handled by bottom bar menu
  }
}
```

Wait — we should keep the hamburger hidden on desktop (already the case) and hidden on mobile too (since we have bottom bar now). The existing code shows the hamburger only on mobile. We want to hide it entirely now.

Actually, the simpler approach: keep the hamburger hidden. The bottom bar's Menu button replaces it. So in `_shell.scss`, change the mobile block so `lumio-topbar__hamburger` stays `display: none`.

**Step 4: Verify on dev server**

Run: `cd frontend && npm run dev` — check mobile viewport in browser DevTools.

**Step 5: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/styles/layout/_shell.scss
git commit -m "feat(mobile): integrate bottom tab bar into root layout"
```

---

## Task 4: Hide old mobile sidebar, clean up TopBar hamburger

**Files:**
- Modify: `frontend/app/styles/layout/_shell.scss`
- Modify: `frontend/app/components/AppChrome.tsx`

**Step 1: Update responsive styles**

In `_shell.scss`, modify the `@media (max-width: 1023px)` block:

```scss
@media (max-width: 1023px) {
  .lumio-shell__sidebar {
    display: none;

    &--mobile {
      display: none; // No longer used — bottom bar drawer replaces it
    }
  }

  .lumio-sidebar-overlay {
    display: none; // No longer used
  }

  .lumio-topbar__hamburger {
    display: none; // No longer needed — bottom bar has Menu tab
  }
}
```

**Step 2: Simplify AppChrome**

Since the mobile sidebar overlay and drawer are no longer used (replaced by `MobileMenuDrawer`), the mobile parts of `AppChrome` can be removed. However, keep them for now for backwards compatibility — the CSS `display: none` handles it. No code changes needed in AppChrome.

**Step 3: Verify no visual regression on desktop**

Desktop should still show the sidebar as before (>1024px).

**Step 4: Commit**

```bash
git add frontend/app/styles/layout/_shell.scss
git commit -m "fix(mobile): hide old sidebar drawer, replace with bottom bar navigation"
```

---

## Task 5: Polish — safe area, active states, transitions

**Files:**
- Modify: `frontend/app/styles/layout/_mobile-bottom-bar.scss`

**Step 1: Add safe area support for notched devices**

```scss
.lumio-bottom-bar {
  // Already has: padding-bottom: env(safe-area-inset-bottom, 0);
  // Adjust height to account for safe area:
  height: calc(56px + env(safe-area-inset-bottom, 0px));
}
```

**Step 2: Add subtle label text under icons (optional)**

If you want icon+label like the concept, add a small label below each icon:

```tsx
// In MobileBottomBar.tsx, update each tab link to include a label span:
<Link href="/dashboard" className={`lumio-bottom-bar__tab ...`}>
  <LayoutDashboard size={20} />
  <span className="lumio-bottom-bar__label">Dashboard</span>
</Link>
```

```scss
&__label {
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
}

&__tab {
  flex-direction: column;
  gap: 2px;
}
```

**Step 3: Test on multiple viewports**

- iPhone SE (375px)
- iPhone 14 Pro (393px)
- iPad Mini (768px) — still shows bottom bar
- Desktop (1024px+) — bottom bar hidden

**Step 4: Commit**

```bash
git commit -am "fix(mobile): polish bottom bar safe areas and active states"
```

---

## Task 6: Visual QA and cleanup

**Step 1: Compare with concept screenshots**

Verify:
- Bottom bar has 5 items evenly spaced
- Central FAB is elevated (blue circle with +)
- Menu drawer slides from right with all nav items
- Dark mode works correctly
- Active tab is highlighted (like the blue sun icon in concept)

**Step 2: Clean up any unused mobile sidebar code if desired**

Optional: remove the mobile sidebar event listener and overlay from `AppChrome.tsx` since it's fully replaced. This is a cleanup step — only do if the team agrees.

**Step 3: Final commit**

```bash
git commit -am "chore(mobile): visual QA pass for bottom tab bar"
```
