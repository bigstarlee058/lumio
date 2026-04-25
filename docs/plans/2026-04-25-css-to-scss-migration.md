# CSS → SCSS Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all CSS to SCSS using 7-1 architecture, SCSS variables replacing CSS custom properties everywhere including JS/inline styles.

**Architecture:** 7-1 SCSS pattern (`abstracts/`, `base/`, `components/`, `layout/`, `themes/`, `vendors/`, `utils/`). Dark mode via `@include dark { .dark & { @content } }` mixin in each block. JS token constants in `lib/theme-tokens.ts` replace `var(--lumio-*)` in TSX/TS files.

**Tech Stack:** sass, Next.js, next-themes (`useTheme`), MUI, TypeScript

---

## Overview of files touched

| Current file | New location |
|---|---|
| `app/styles/tokens.css` | `app/styles/abstracts/_variables.scss` + `_variables-dark.scss` |
| `app/styles/base.css` | `app/styles/base/_reset.scss` |
| `app/globals.css` | `app/globals.scss` |
| `app/styles/blocks/lumio-sidebar.css` | `app/styles/layout/_shell.scss` |
| `app/styles/blocks/lumio-*.css` (9 files) | `app/styles/components/_*.scss` |
| `app/tours/tour-theme.css` | `app/styles/vendors/_tour-theme.scss` |
| Dark mode Tailwind overrides (in globals.css) | `app/styles/utils/_tailwind-dark.scss` |
| *(new)* | `lib/theme-tokens.ts` |

---

## Task 1: Install sass

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install sass**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend
npm install -D sass
```

**Step 2: Verify Next.js supports SCSS out of the box**

Next.js natively supports SCSS when `sass` is installed — no config changes needed.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sass dependency for SCSS migration"
```

---

## Task 2: Create directory structure

**Step 1: Create all directories**

```bash
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/abstracts
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/base
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/components
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/layout
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/themes
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/vendors
mkdir -p /Users/symonbaikov/Projects/lumio/frontend/app/styles/utils
```

No commit needed — empty dirs aren't tracked.

---

## Task 3: Create `abstracts/_variables.scss` (light tokens)

**Files:**
- Create: `app/styles/abstracts/_variables.scss`

Source: `app/styles/tokens.css` `:root { }` block.

**Step 1: Create the file**

```scss
// app/styles/abstracts/_variables.scss
// Light-mode design tokens. Source of truth for SCSS compilation.
// Dark equivalents are in _variables-dark.scss.

// ── Brand / Primary ──────────────────────────────────────────
$lumio-color-primary:          #168118;
$lumio-color-primary-hover:    #157811;
$lumio-color-primary-dark:     #036704;
$lumio-color-primary-50:       #edf7ed;
$lumio-color-primary-100:      #d4edd4;
$lumio-color-primary-200:      #a8d5a8;
$lumio-color-primary-contrast: #ffffff;

// ── Ink neutrals ─────────────────────────────────────────────
$lumio-color-ink-900: #0b0b10;
$lumio-color-ink-800: #171720;
$lumio-color-ink-700: #2a2a35;
$lumio-color-ink-600: #4a4a58;
$lumio-color-ink-500: #6b6b78;
$lumio-color-ink-400: #8e8e9a;
$lumio-color-ink-300: #b7b7c0;
$lumio-color-ink-200: #dcdce1;
$lumio-color-ink-150: #ececef;
$lumio-color-ink-100: #f2f2f4;
$lumio-color-ink-50:  #f8f8f9;
$lumio-color-white:   #ffffff;

// ── Semantic ─────────────────────────────────────────────────
$lumio-color-success:       #10b981;
$lumio-color-success-soft:  #ecfdf5;
$lumio-color-warning:       #f59e0b;
$lumio-color-warning-soft:  #fffbeb;
$lumio-color-danger:        #e11d48;
$lumio-color-danger-soft:   #fff1f2;
$lumio-color-info:          #0ea5e9;
$lumio-color-info-soft:     #f0f9ff;

// ── Legacy aliases ────────────────────────────────────────────
$lumio-color-secondary:          $lumio-color-ink-600;
$lumio-color-secondary-contrast: $lumio-color-white;
$lumio-color-danger-contrast:    $lumio-color-white;

// ── Category colors ───────────────────────────────────────────
$lumio-color-cat-food:      #f59e0b;
$lumio-color-cat-transport: #0ea5e9;
$lumio-color-cat-housing:   #8b5cf6;
$lumio-color-cat-shopping:  #ec4899;
$lumio-color-cat-income:    #10b981;
$lumio-color-cat-other:     #64748b;

// ── Surface / background ──────────────────────────────────────
$lumio-color-bg:              #f8f8f9;
$lumio-color-surface:         #ffffff;
$lumio-color-surface-muted:   #f2f2f4;
$lumio-color-surface-warning: #fffbeb;
$lumio-color-surface-error:   #fff1f2;

// ── Text ──────────────────────────────────────────────────────
$lumio-color-text-primary:   #0b0b10;
$lumio-color-text-secondary: #4a4a58;

// ── Borders ───────────────────────────────────────────────────
$lumio-color-border:        #ececef;
$lumio-color-border-strong: #dcdce1;

// ── Spacing (4px base) ────────────────────────────────────────
$lumio-space-0:  0;
$lumio-space-1:  4px;
$lumio-space-2:  8px;
$lumio-space-3:  12px;
$lumio-space-4:  16px;
$lumio-space-5:  20px;
$lumio-space-6:  24px;
$lumio-space-8:  32px;
$lumio-space-10: 40px;
$lumio-space-12: 48px;

// ── Typography ────────────────────────────────────────────────
$lumio-font-family:      var(--font-geist), "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
$lumio-font-family-mono: var(--font-geist-mono), "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
$lumio-font-size-xs:   12px;
$lumio-font-size-sm:   13px;
$lumio-font-size-base: 14px;
$lumio-font-size-md:   15px;
$lumio-font-size-lg:   16px;
$lumio-font-size-xl:   18px;
$lumio-font-weight-regular:  400;
$lumio-font-weight-medium:   500;
$lumio-font-weight-semibold: 600;
$lumio-font-weight-bold:     700;
$lumio-line-height-tight:  1.25;
$lumio-line-height-normal: 1.5;

// ── Shape / border-radius ─────────────────────────────────────
$lumio-radius-none: 0;
$lumio-radius-xs:   6px;
$lumio-radius-sm:   8px;
$lumio-radius-md:   10px;
$lumio-radius-lg:   14px;
$lumio-radius-xl:   20px;
$lumio-radius-full: 999px;

// ── Shadows ───────────────────────────────────────────────────
$lumio-shadow-xs: 0 1px 0 0 rgba(12, 12, 20, 0.04);
$lumio-shadow-sm: 0 1px 2px 0 rgba(12, 12, 20, 0.05), 0 1px 0 0 rgba(12, 12, 20, 0.02);
$lumio-shadow-md: 0 4px 16px -4px rgba(12, 12, 20, 0.08), 0 1px 2px rgba(12, 12, 20, 0.04);
$lumio-shadow-lg: 0 20px 40px -12px rgba(12, 12, 20, 0.12), 0 2px 6px rgba(12, 12, 20, 0.04);

// ── Z-index ───────────────────────────────────────────────────
$lumio-z-dropdown: 1000;
$lumio-z-modal:    1300;
$lumio-z-popover:  1400;
$lumio-z-tooltip:  1500;

// ── Theme tokens (globals / Tailwind layer) ───────────────────
// These mirror globals.css :root and are used in base/_globals.scss
$color-background:         #f8f8f9;
$color-foreground:         #0b0b10;
$color-primary:            #168118;
$color-primary-hover:      #157811;
$color-primary-foreground: #ffffff;
$color-secondary:          $lumio-color-ink-600;
$color-secondary-foreground: #ffffff;
$color-muted:              $lumio-color-ink-100;
$color-muted-foreground:   $lumio-color-ink-500;
$color-card-bg:            #ffffff;
$color-card-foreground:    $lumio-color-ink-900;
$color-border:             $lumio-color-ink-150;
$color-input:              $lumio-color-ink-200;
$color-ring:               $color-primary;
$color-destructive:        $lumio-color-danger;
$color-destructive-foreground: #ffffff;
$color-surface-glow:         rgba(22, 129, 24, 0.14);
$color-surface-success-glow: rgba(16, 185, 129, 0.12);

// Dashboard palette
$ff-dash-primary:       #168118;
$ff-dash-primary-soft:  #a8d5a8;
$ff-dash-cta:           #084f09;
$ff-dash-surface:       #ffffff;
$ff-dash-foreground:    #0b0b10;
$ff-dash-muted:         #f2f2f4;
$ff-dash-border:        #ececef;
$ff-dash-critical:      #e11d48;
$ff-dash-warning:       #f59e0b;
$ff-dash-info:          #0ea5e9;
$ff-dash-success:       #10b981;

// Global layout
$global-nav-height: 52px;
```

**Step 2: Commit**

```bash
git add app/styles/abstracts/_variables.scss
git commit -m "feat(scss): add light-mode SCSS variables"
```

---

## Task 4: Create `abstracts/_variables-dark.scss` (dark tokens)

**Files:**
- Create: `app/styles/abstracts/_variables-dark.scss`

Source: `app/styles/tokens.css` `.dark { }` block + `app/globals.css` `.dark { }` block.

**Step 1: Create the file**

```scss
// app/styles/abstracts/_variables-dark.scss
// Dark-mode overrides for all design tokens.
// Used inside @include dark { } blocks.

// ── Brand / Primary ──────────────────────────────────────────
$lumio-color-primary-dk:       #5cc462;
$lumio-color-primary-hover-dk: #3e9c35;
$lumio-color-primary-dark-dk:  #168118;
$lumio-color-primary-50-dk:    rgba(62, 156, 53, 0.1);
$lumio-color-primary-100-dk:   rgba(62, 156, 53, 0.2);
$lumio-color-primary-200-dk:   rgba(62, 156, 53, 0.35);

// ── Ink neutrals (inverted for dark) ─────────────────────────
$lumio-color-ink-900-dk: #f0f0f5;
$lumio-color-ink-800-dk: #d4d4de;
$lumio-color-ink-700-dk: #a8a8b8;
$lumio-color-ink-600-dk: #7c7c8e;
$lumio-color-ink-500-dk: #5c5c6e;
$lumio-color-ink-400-dk: #3e4240;
$lumio-color-ink-300-dk: #2c302d;
$lumio-color-ink-200-dk: #222622;
$lumio-color-ink-150-dk: #1e221f;
$lumio-color-ink-100-dk: #181c19;
$lumio-color-ink-50-dk:  #121513;
$lumio-color-white-dk:   #1e221f;

// ── Semantic ─────────────────────────────────────────────────
$lumio-color-success-dk:       #34d399;
$lumio-color-success-soft-dk:  rgba(52, 211, 153, 0.12);
$lumio-color-warning-dk:       #fbbf24;
$lumio-color-warning-soft-dk:  rgba(251, 191, 36, 0.12);
$lumio-color-danger-dk:        #fb7185;
$lumio-color-danger-soft-dk:   rgba(251, 113, 133, 0.12);
$lumio-color-info-dk:          #38bdf8;
$lumio-color-info-soft-dk:     rgba(56, 189, 248, 0.12);

// ── Surface / background ──────────────────────────────────────
$lumio-color-bg-dk:              #0f1210;
$lumio-color-surface-dk:         #161b17;
$lumio-color-surface-muted-dk:   #1c211d;
$lumio-color-surface-warning-dk: rgba(251, 191, 36, 0.12);
$lumio-color-surface-error-dk:   rgba(251, 113, 133, 0.12);

// ── Text ──────────────────────────────────────────────────────
$lumio-color-text-primary-dk:   #e8e8f0;
$lumio-color-text-secondary-dk: #a0a0b4;

// ── Borders ───────────────────────────────────────────────────
$lumio-color-border-dk:        #252b26;
$lumio-color-border-strong-dk: #333b34;

// ── Shadows (more visible on dark bg) ────────────────────────
$lumio-shadow-xs-dk: 0 1px 0 0 rgba(0, 0, 0, 0.2);
$lumio-shadow-sm-dk: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
$lumio-shadow-md-dk: 0 4px 16px -4px rgba(0, 0, 0, 0.4);
$lumio-shadow-lg-dk: 0 20px 40px -12px rgba(0, 0, 0, 0.5);

// ── Theme tokens (dark) ───────────────────────────────────────
$color-background-dk:          #0f1210;
$color-foreground-dk:          #e8e8f0;
$color-primary-dk:             #5cc462;
$color-primary-hover-dk:       #3e9c35;
$color-secondary-dk:           #252b26;
$color-secondary-foreground-dk: #e8e8f0;
$color-muted-dk:               #1c211d;
$color-muted-foreground-dk:    #a0a0b4;
$color-card-bg-dk:             #161b17;
$color-card-foreground-dk:     #e8e8f0;
$color-border-dk:              #252b26;
$color-input-dk:               #252b26;
$color-ring-dk:                #5cc462;
$color-destructive-dk:         #fb7185;
$color-surface-glow-dk:         rgba(92, 196, 98, 0.24);
$color-surface-success-glow-dk: rgba(52, 211, 153, 0.2);

// Dashboard palette (dark)
$ff-dash-primary-dk:       #5cc462;
$ff-dash-primary-soft-dk:  #168118;
$ff-dash-cta-dk:           #3e9c35;
$ff-dash-surface-dk:       #161b17;
$ff-dash-foreground-dk:    #e8e8f0;
$ff-dash-muted-dk:         #1c211d;
$ff-dash-border-dk:        #252b26;
$ff-dash-critical-dk:      #fb7185;
$ff-dash-warning-dk:       #fbbf24;
$ff-dash-info-dk:          #38bdf8;
$ff-dash-success-dk:       #34d399;
```

**Step 2: Commit**

```bash
git add app/styles/abstracts/_variables-dark.scss
git commit -m "feat(scss): add dark-mode SCSS variables"
```

---

## Task 5: Create `abstracts/_mixins.scss`

**Files:**
- Create: `app/styles/abstracts/_mixins.scss`

**Step 1: Create the file**

```scss
// app/styles/abstracts/_mixins.scss

// Dark mode mixin — wraps content with .dark ancestor selector.
// Usage: @include dark { color: $lumio-color-text-primary-dk; }
@mixin dark {
  .dark & {
    @content;
  }
}

// Responsive breakpoints
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (max-width: 640px) { @content; }
  } @else if $breakpoint == 'md' {
    @media (max-width: 768px) { @content; }
  } @else if $breakpoint == 'lg' {
    @media (max-width: 1023px) { @content; }
  } @else if $breakpoint == 'xl' {
    @media (max-width: 1280px) { @content; }
  }
}

// Visually hidden (accessibility)
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Text truncation
@mixin text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Step 2: Commit**

```bash
git add app/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add SCSS mixins including dark mode"
```

---

## Task 6: Create `abstracts/_index.scss`

**Files:**
- Create: `app/styles/abstracts/_index.scss`

**Step 1: Create the file**

```scss
// app/styles/abstracts/_index.scss
// Forward all abstracts so consumers can do: @use '../abstracts' as *;
@forward 'variables';
@forward 'variables-dark';
@forward 'mixins';
```

**Step 2: Commit**

```bash
git add app/styles/abstracts/_index.scss
git commit -m "feat(scss): add abstracts barrel file"
```

---

## Task 7: Create `lib/theme-tokens.ts`

This file provides all design token values as TypeScript constants for use in:
- Inline styles in React components
- MUI theme overrides
- SVG color props
- Any JS context that previously used `var(--lumio-*)`

**Files:**
- Create: `lib/theme-tokens.ts`

**Step 1: Create the file**

```ts
// lib/theme-tokens.ts
// JS/TS token constants — mirrors abstracts/_variables.scss and _variables-dark.scss.
// Use these wherever CSS custom properties (var(--lumio-*)) were used in JS/TSX.
//
// For dark-mode-aware colors in client components:
//   import { useTheme } from 'next-themes';
//   import { tokens } from '@/lib/theme-tokens';
//   const { resolvedTheme } = useTheme();
//   const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

export const tokens = {
  // ── Static (same in both themes) ───────────────────────────
  radius: {
    none: '0',
    xs:   '6px',
    sm:   '8px',
    md:   '10px',
    lg:   '14px',
    xl:   '20px',
    full: '999px',
  },
  space: {
    0:  '0',
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    5:  '20px',
    6:  '24px',
    8:  '32px',
    10: '40px',
    12: '48px',
  },
  font: {
    size: {
      xs:   '12px',
      sm:   '13px',
      base: '14px',
      md:   '15px',
      lg:   '16px',
      xl:   '18px',
    },
    weight: {
      regular:  400,
      medium:   500,
      semibold: 600,
      bold:     700,
    },
    lineHeight: {
      tight:  1.25,
      normal: 1.5,
    },
  },
  zIndex: {
    dropdown: 1000,
    modal:    1300,
    popover:  1400,
    tooltip:  1500,
  },

  // ── Light theme colors (default) ────────────────────────────
  color: {
    primary:          '#168118',
    primaryHover:     '#157811',
    primaryDark:      '#036704',
    primary50:        '#edf7ed',
    primary100:       '#d4edd4',
    primary200:       '#a8d5a8',
    primaryContrast:  '#ffffff',
    ink900: '#0b0b10',
    ink800: '#171720',
    ink700: '#2a2a35',
    ink600: '#4a4a58',
    ink500: '#6b6b78',
    ink400: '#8e8e9a',
    ink300: '#b7b7c0',
    ink200: '#dcdce1',
    ink150: '#ececef',
    ink100: '#f2f2f4',
    ink50:  '#f8f8f9',
    white:  '#ffffff',
    success:      '#10b981',
    successSoft:  '#ecfdf5',
    warning:      '#f59e0b',
    warningSoft:  '#fffbeb',
    danger:       '#e11d48',
    dangerSoft:   '#fff1f2',
    info:         '#0ea5e9',
    infoSoft:     '#f0f9ff',
    bg:              '#f8f8f9',
    surface:         '#ffffff',
    surfaceMuted:    '#f2f2f4',
    surfaceWarning:  '#fffbeb',
    surfaceError:    '#fff1f2',
    textPrimary:     '#0b0b10',
    textSecondary:   '#4a4a58',
    border:          '#ececef',
    borderStrong:    '#dcdce1',
    catFood:         '#f59e0b',
    catTransport:    '#0ea5e9',
    catHousing:      '#8b5cf6',
    catShopping:     '#ec4899',
    catIncome:       '#10b981',
    catOther:        '#64748b',
  },

  shadow: {
    xs: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
    sm: '0 1px 2px 0 rgba(12, 12, 20, 0.05), 0 1px 0 0 rgba(12, 12, 20, 0.02)',
    md: '0 4px 16px -4px rgba(12, 12, 20, 0.08), 0 1px 2px rgba(12, 12, 20, 0.04)',
    lg: '0 20px 40px -12px rgba(12, 12, 20, 0.12), 0 2px 6px rgba(12, 12, 20, 0.04)',
  },

  // ── Dark theme colors ───────────────────────────────────────
  dark: {
    color: {
      primary:         '#5cc462',
      primaryHover:    '#3e9c35',
      primaryDark:     '#168118',
      primary50:       'rgba(62, 156, 53, 0.1)',
      primary100:      'rgba(62, 156, 53, 0.2)',
      primary200:      'rgba(62, 156, 53, 0.35)',
      primaryContrast: '#ffffff',
      ink900: '#f0f0f5',
      ink800: '#d4d4de',
      ink700: '#a8a8b8',
      ink600: '#7c7c8e',
      ink500: '#5c5c6e',
      ink400: '#3e4240',
      ink300: '#2c302d',
      ink200: '#222622',
      ink150: '#1e221f',
      ink100: '#181c19',
      ink50:  '#121513',
      white:  '#1e221f',
      success:      '#34d399',
      successSoft:  'rgba(52, 211, 153, 0.12)',
      warning:      '#fbbf24',
      warningSoft:  'rgba(251, 191, 36, 0.12)',
      danger:       '#fb7185',
      dangerSoft:   'rgba(251, 113, 133, 0.12)',
      info:         '#38bdf8',
      infoSoft:     'rgba(56, 189, 248, 0.12)',
      bg:              '#0f1210',
      surface:         '#161b17',
      surfaceMuted:    '#1c211d',
      surfaceWarning:  'rgba(251, 191, 36, 0.12)',
      surfaceError:    'rgba(251, 113, 133, 0.12)',
      textPrimary:     '#e8e8f0',
      textSecondary:   '#a0a0b4',
      border:          '#252b26',
      borderStrong:    '#333b34',
      catFood:         '#f59e0b',
      catTransport:    '#38bdf8',
      catHousing:      '#a78bfa',
      catShopping:     '#f472b6',
      catIncome:       '#34d399',
      catOther:        '#94a3b8',
    },
    shadow: {
      xs: '0 1px 0 0 rgba(0, 0, 0, 0.2)',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 16px -4px rgba(0, 0, 0, 0.4)',
      lg: '0 20px 40px -12px rgba(0, 0, 0, 0.5)',
    },
  },
} as const;

export type ThemeColor = keyof typeof tokens.color;
```

**Step 2: Commit**

```bash
git add lib/theme-tokens.ts
git commit -m "feat(scss): add JS theme tokens for inline styles migration"
```

---

## Task 8: Create `base/` files

**Files:**
- Create: `app/styles/base/_reset.scss`
- Create: `app/styles/base/_scrollbar.scss`
- Create: `app/styles/base/_index.scss`

Source: `app/styles/base.css` and scrollbar rules from `globals.css` (lines 427-430).

**Step 1: Create `_reset.scss`**

```scss
// app/styles/base/_reset.scss
@use '../abstracts' as *;

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: $lumio-font-family;
  font-size: $lumio-font-size-base;
  line-height: $lumio-line-height-normal;
  color: $lumio-color-text-primary;
  background: $lumio-color-bg;
  -webkit-font-smoothing: antialiased;

  @include dark {
    color: $lumio-color-text-primary-dk;
    background: $lumio-color-bg-dk;
  }
}

h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd {
  margin: 0;
}

button {
  font-family: inherit;
}

// ── Utility classes (u-* prefix) ──────────────────────────────
.u-visually-hidden { @include visually-hidden; }
.u-text-center  { text-align: center; }
.u-text-right   { text-align: right; }
.u-text-ellipsis { @include text-ellipsis; }
.u-flex         { display: flex; }
.u-flex-col     { display: flex; flex-direction: column; }
.u-items-center { align-items: center; }
.u-justify-between { justify-content: space-between; }
.u-gap-1        { gap: $lumio-space-1; }
.u-gap-2        { gap: $lumio-space-2; }
.u-gap-3        { gap: $lumio-space-3; }
.u-gap-4        { gap: $lumio-space-4; }
.u-w-full       { width: 100%; }
.u-h-full       { height: 100%; }
```

**Step 2: Create `_scrollbar.scss`**

```scss
// app/styles/base/_scrollbar.scss
@use '../abstracts' as *;

::-webkit-scrollbar           { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb     {
  background: $lumio-color-ink-200;
  border-radius: $lumio-radius-md;
  border: 2px solid transparent;
  background-clip: padding-box;

  @include dark { background: $lumio-color-ink-300-dk; }
}
::-webkit-scrollbar-thumb:hover {
  background: $lumio-color-ink-300;
  background-clip: padding-box;
  border: 2px solid transparent;

  @include dark { background: $lumio-color-ink-400-dk; }
}
::-webkit-scrollbar-track     { background: transparent; }
```

**Step 3: Create `_index.scss`**

```scss
// app/styles/base/_index.scss
@forward 'reset';
@forward 'scrollbar';
```

**Step 4: Commit**

```bash
git add app/styles/base/
git commit -m "feat(scss): add base reset and scrollbar styles"
```

---

## Task 9: Create `themes/` — global theme styles

Source: `app/globals.css` — the `:root {}`, `.dark {}`, body rules, focus rings, MUI/Tailwind hover overrides, body classes.

**Files:**
- Create: `app/styles/themes/_globals.scss`
- Create: `app/styles/themes/_index.scss`

**Step 1: Create `_globals.scss`**

```scss
// app/styles/themes/_globals.scss
// Global theme-level styles: body, focus, MUI/Tailwind overrides, body utility classes.
@use '../abstracts' as *;

body {
  background-color: $color-background;
  color: $color-foreground;
  font-family: $lumio-font-family;
  font-feature-settings: "ss01", "cv11";
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.5;
  transition: background-color 220ms ease, color 220ms ease;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  @include dark {
    background-color: $color-background-dk;
    color: $color-foreground-dk;
  }
}

:focus-visible {
  outline: 2px solid $color-primary;
  outline-offset: 2px;
  border-radius: $lumio-radius-xs;

  @include dark { outline-color: $color-primary-dk; }
}

// ── Font helper classes ───────────────────────────────────────
.ff-dashboard-sans { font-family: $lumio-font-family; }
.ff-dashboard-mono { font-family: $lumio-font-family-mono; }

.ff-logo {
  font-family: var(--font-nunito), "Nunito", sans-serif;
  font-size: 20px !important;
  font-weight: 700 !important;
  letter-spacing: 3.5px !important;
  line-height: 50px !important;
  text-transform: uppercase !important;
  padding: 0;
  display: flex;
  align-items: center;
}

// ── Layout utility classes ────────────────────────────────────
.container-shared { width: 100%; }
.bg-white { background-color: $color-card-bg !important; }

// ── Body state classes ────────────────────────────────────────
body.body-scroll-locked {
  overflow: hidden;
  padding-right: var(--scroll-lock-scrollbar-width, 0px);
}

body.ff-table-fullscreen {
  overflow: hidden;

  .lumio-topbar { display: none; }

  .lumio-shell__sidebar { display: none; }

  .lumio-shell__content > main {
    height: 100vh;
    overflow: hidden;
  }

  &.ff-table-columns-scroll {
    overflow: auto;

    .lumio-shell__content > main {
      height: auto;
      overflow: visible;
    }
  }
}

body.ff-col-resizing { user-select: none; }

// ── Side panel + breadcrumbs ──────────────────────────────────
@media (min-width: 1024px) {
  body[data-side-panel-active="true"] [data-global-breadcrumbs] {
    display: none;
  }
}

// ── Custom table row fill ─────────────────────────────────────
.custom-table-container tr.row-fill td {
  background-color: inherit;

  input,
  select,
  textarea { background-color: transparent; }
}

// ── MUI hover in light mode ───────────────────────────────────
:not(.dark) .hover\:bg-gray-50:hover,
:not(.dark) .hover\:bg-gray-100:hover,
:not(.dark) .hover\:bg-gray-200:hover,
:not(.dark) .hover\:bg-white:hover,
:not(.dark) .hover\:bg-muted:hover,
:not(.dark) .hover\:bg-card:hover {
  background-color: $color-muted !important;
}

:not(.dark) .MuiButtonBase-root:not(.MuiButton-contained):hover,
:not(.dark) .MuiButton-root:not(.MuiButton-contained):hover,
:not(.dark) .MuiIconButton-root:hover,
:not(.dark) .MuiMenuItem-root:hover,
:not(.dark) .MuiListItem-root:hover,
:not(.dark) .MuiTableRow-root:hover {
  background-color: $color-muted !important;
}
```

**Step 2: Create `_index.scss`**

```scss
// app/styles/themes/_index.scss
@forward 'globals';
```

**Step 3: Commit**

```bash
git add app/styles/themes/
git commit -m "feat(scss): add global theme styles"
```

---

## Task 10: Create `utils/_tailwind-dark.scss`

Source: All `.dark .bg-white`, `.dark .text-gray-*`, `.dark .border-*` overrides from `globals.css` (lines 182–361).

**Files:**
- Create: `app/styles/utils/_tailwind-dark.scss`
- Create: `app/styles/utils/_index.scss`

**Step 1: Create `_tailwind-dark.scss`**

Copy verbatim all `.dark .bg-*`, `.dark .text-*`, `.dark .border-*`, `.dark .hover\:*`, `.dark .ring-*`, `.dark .focus\:*`, `.dark .divide-*` rules from `globals.css` lines 182–361, then convert `var(--*-bg)` etc. to SCSS vars. The pattern is mechanical:

- `var(--card-bg)` → `$color-card-bg-dk`
- `var(--muted)` → `$color-muted-dk`
- `var(--muted-foreground)` → `$color-muted-foreground-dk`
- `var(--foreground)` → `$color-foreground-dk`
- `var(--border-color)` → `$color-border-dk`
- `var(--primary)` → `$color-primary-dk`
- `var(--destructive)` → `$color-destructive-dk`
- `var(--background)` → `$color-background-dk`

```scss
// app/styles/utils/_tailwind-dark.scss
// Dark mode fallbacks for legacy Tailwind color utilities.
@use '../abstracts' as *;

.dark {
  color-scheme: dark;

  .bg-white:not([class*="dark:bg-"]) { background-color: $color-card-bg-dk; }

  .bg-gray-50:not([class*="dark:bg-"]),
  .bg-gray-100:not([class*="dark:bg-"]),
  .bg-gray-200:not([class*="dark:bg-"]) { background-color: $color-muted-dk; }

  .bg-white\/70:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-background-dk 70%, transparent);
  }
  .bg-white\/95:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-background-dk 95%, transparent);
  }

  .bg-gray-50\/20:not([class*="dark:bg-"]),
  .bg-gray-50\/30:not([class*="dark:bg-"]),
  .bg-gray-50\/50:not([class*="dark:bg-"]),
  .bg-gray-50\/60:not([class*="dark:bg-"]),
  .bg-gray-50\/80:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-muted-dk 78%, transparent);
  }

  .hover\:bg-gray-50:hover:not([class*="dark:hover:bg-"]),
  .hover\:bg-gray-50\/80:hover:not([class*="dark:hover:bg-"]),
  .hover\:bg-gray-100:hover:not([class*="dark:hover:bg-"]),
  .hover\:bg-white:hover:not([class*="dark:hover:bg-"]) { background-color: $color-muted-dk; }

  .hover\:bg-white\/80:hover:not([class*="dark:hover:bg-"]) {
    background-color: color-mix(in srgb, $color-muted-dk 88%, transparent);
  }

  .text-gray-900:not([class*="dark:text-"]),
  .text-gray-800:not([class*="dark:text-"]),
  .text-gray-700:not([class*="dark:text-"]) { color: $color-foreground-dk; }

  .text-gray-600:not([class*="dark:text-"]),
  .text-gray-500:not([class*="dark:text-"]),
  .text-gray-400:not([class*="dark:text-"]),
  .text-gray-300:not([class*="dark:text-"]) { color: $color-muted-foreground-dk; }

  .hover\:text-gray-900:hover:not([class*="dark:hover:text-"]),
  .hover\:text-gray-800:hover:not([class*="dark:hover:text-"]),
  .hover\:text-gray-700:hover:not([class*="dark:hover:text-"]) { color: $color-foreground-dk; }

  .border-gray-100:not([class*="dark:border-"]),
  .border-gray-200:not([class*="dark:border-"]),
  .border-gray-300:not([class*="dark:border-"]) { border-color: $color-border-dk; }

  .divide-gray-100:not([class*="dark:divide-"]) > :not([hidden]) ~ :not([hidden]),
  .divide-gray-200:not([class*="dark:divide-"]) > :not([hidden]) ~ :not([hidden]) {
    border-color: $color-border-dk;
  }

  .ring-gray-100:not([class*="dark:ring-"]),
  .ring-gray-200:not([class*="dark:ring-"]) { --tw-ring-color: #{$color-border-dk}; }

  .focus\:ring-gray-200:focus:not([class*="dark:focus:ring-"]) { --tw-ring-color: #{$color-border-dk}; }

  // Blue "info"
  .bg-blue-50:not([class*="dark:bg-"]),
  .bg-blue-100:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-primary-dk 14%, transparent);
  }
  .bg-blue-50\/20:not([class*="dark:bg-"]),
  .bg-blue-50\/30:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-primary-dk 18%, transparent);
  }
  .hover\:bg-blue-100:hover:not([class*="dark:hover:bg-"]) {
    background-color: color-mix(in srgb, $color-primary-dk 18%, transparent);
  }
  .border-blue-200:not([class*="dark:border-"]) {
    border-color: color-mix(in srgb, $color-primary-dk 50%, transparent);
  }
  .text-blue-600:not([class*="dark:text-"]),
  .text-blue-700:not([class*="dark:text-"]),
  .text-blue-800:not([class*="dark:text-"]) { color: $color-primary-dk; }
  .hover\:bg-blue-50:hover:not([class*="dark:hover:bg-"]) {
    background-color: color-mix(in srgb, $color-primary-dk 14%, transparent);
  }

  // Red "danger"
  .bg-red-50:not([class*="dark:bg-"]),
  .bg-red-100:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $color-destructive-dk 18%, transparent);
  }
  .hover\:bg-red-50:hover:not([class*="dark:hover:bg-"]) {
    background-color: color-mix(in srgb, $color-destructive-dk 22%, transparent);
  }
  .border-red-200:not([class*="dark:border-"]),
  .border-red-300:not([class*="dark:border-"]) {
    border-color: color-mix(in srgb, $color-destructive-dk 45%, transparent);
  }
  .text-red-600:not([class*="dark:text-"]),
  .text-red-700:not([class*="dark:text-"]),
  .text-red-800:not([class*="dark:text-"]),
  .text-red-900:not([class*="dark:text-"]) { color: $color-destructive-dk; }

  // Green / Emerald "success"
  .bg-green-50:not([class*="dark:bg-"]),
  .bg-green-100:not([class*="dark:bg-"]),
  .bg-emerald-50:not([class*="dark:bg-"]),
  .bg-emerald-100:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $lumio-color-success-dk 14%, transparent);
  }
  .border-green-200:not([class*="dark:border-"]),
  .border-emerald-100:not([class*="dark:border-"]),
  .border-emerald-200:not([class*="dark:border-"]),
  .border-emerald-300:not([class*="dark:border-"]) {
    border-color: color-mix(in srgb, $lumio-color-success-dk 40%, transparent);
  }
  .text-green-700:not([class*="dark:text-"]),
  .text-green-800:not([class*="dark:text-"]),
  .text-emerald-700:not([class*="dark:text-"]),
  .text-emerald-800:not([class*="dark:text-"]),
  .text-emerald-950:not([class*="dark:text-"]) {
    color: color-mix(in srgb, $lumio-color-success-dk 70%, white);
  }

  // Yellow / Amber "warning"
  .bg-yellow-50:not([class*="dark:bg-"]),
  .bg-yellow-100:not([class*="dark:bg-"]),
  .bg-amber-50:not([class*="dark:bg-"]),
  .bg-amber-100:not([class*="dark:bg-"]) {
    background-color: color-mix(in srgb, $lumio-color-warning-dk 14%, transparent);
  }
  .hover\:bg-orange-50:hover:not([class*="dark:hover:bg-"]) {
    background-color: color-mix(in srgb, #fb923c 14%, transparent);
  }
  .border-yellow-200:not([class*="dark:border-"]),
  .border-amber-100:not([class*="dark:border-"]),
  .border-amber-300:not([class*="dark:border-"]) {
    border-color: color-mix(in srgb, $lumio-color-warning-dk 45%, transparent);
  }
  .text-yellow-700:not([class*="dark:text-"]),
  .text-yellow-800:not([class*="dark:text-"]),
  .text-amber-800:not([class*="dark:text-"]),
  .text-amber-900:not([class*="dark:text-"]) {
    color: color-mix(in srgb, $lumio-color-warning-dk 75%, white);
  }

  // React Day Picker
  .rdp-root {
    --rdp-accent-color: #{$color-primary-dk};
    --rdp-accent-background-color: #{color-mix(in srgb, $color-primary-dk 18%, transparent)};
  }
}
```

**Step 2: Create `_index.scss`**

```scss
// app/styles/utils/_index.scss
@forward 'tailwind-dark';
```

**Step 3: Commit**

```bash
git add app/styles/utils/
git commit -m "feat(scss): add Tailwind dark mode override utilities"
```

---

## Task 11: Create `vendors/_tour-theme.scss`

Source: `app/tours/tour-theme.css`. Convert all `var(--*)` to SCSS vars.

**Variable mapping for tour-theme:**
- `var(--card-bg)` → `$color-card-bg` / `$color-card-bg-dk`
- `var(--foreground)` → `$color-foreground` / `$color-foreground-dk`
- `var(--primary)` → `$color-primary` / `$color-primary-dk`
- `var(--primary-hover)` → `$color-primary-hover` / `$color-primary-hover-dk`
- `var(--primary-foreground)` → `$color-primary-foreground`
- `var(--muted-foreground)` → `$color-muted-foreground` / `$color-muted-foreground-dk`
- `var(--muted)` → `$color-muted` / `$color-muted-dk`
- `var(--border-color)` → `$color-border` / `$color-border-dk`
- `var(--ring)` → `$color-ring` / `$color-ring-dk`
- `hsl(var(--muted))` → `$color-muted`
- `hsl(var(--primary))` → `$color-primary`
- `hsl(var(--ring))` → `$color-ring`

**Files:**
- Create: `app/styles/vendors/_tour-theme.scss`
- Create: `app/styles/vendors/_index.scss`

**Step 1: Create `_tour-theme.scss`**

Rewrite `app/tours/tour-theme.css` replacing all `var(--*)` with SCSS variables.
Wrap dark overrides (`[data-theme="dark"]` and `.dark`) with SCSS dark variables.
BEM nesting where possible (`.driver-popover { &-title { } }`).

**Step 2: Create `_index.scss`**

```scss
// app/styles/vendors/_index.scss
@forward 'tour-theme';
```

**Step 3: Commit**

```bash
git add app/styles/vendors/
git commit -m "feat(scss): convert tour-theme to SCSS"
```

---

## Task 12–20: Convert block CSS files to SCSS components

For each block, the conversion pattern is identical:

**Conversion rules:**
1. Rename file `.css` → `.scss`
2. Add `@use '../abstracts' as *;` at the top
3. Replace every `var(--lumio-color-*)` with the corresponding `$lumio-color-*` SCSS variable
4. Replace every `var(--lumio-radius-*)` → `$lumio-radius-*`
5. Replace every `var(--lumio-shadow-*)` → `$lumio-shadow-*`
6. Replace every `var(--lumio-space-*)` → `$lumio-space-*`
7. Replace every `var(--lumio-font-*)` → `$lumio-font-*`
8. Nest BEM modifiers: `.block__element` → `.block { &__element { } }`, `.block--modifier` → `.block { &--modifier { } }`
9. Move existing `.dark .block__*` rules into `@include dark { }` inside the block's nested scope

**Variable mapping cheat-sheet (light → dark):**
```
$lumio-color-surface         → $lumio-color-surface-dk
$lumio-color-bg              → $lumio-color-bg-dk
$lumio-color-border          → $lumio-color-border-dk
$lumio-color-border-strong   → $lumio-color-border-strong-dk
$lumio-color-text-primary    → $lumio-color-text-primary-dk
$lumio-color-text-secondary  → $lumio-color-text-secondary-dk
$lumio-color-ink-50          → $lumio-color-ink-50-dk
$lumio-color-ink-100         → $lumio-color-ink-100-dk
$lumio-color-ink-200         → $lumio-color-ink-200-dk
$lumio-color-ink-300         → $lumio-color-ink-300-dk
$lumio-color-ink-400         → $lumio-color-ink-400-dk
$lumio-color-ink-500         → $lumio-color-ink-500-dk
$lumio-color-primary         → $lumio-color-primary-dk
$lumio-color-primary-50      → $lumio-color-primary-50-dk
$lumio-color-primary-100     → $lumio-color-primary-100-dk
$lumio-color-primary-200     → $lumio-color-primary-200-dk
$lumio-color-primary-hover   → $lumio-color-primary-hover-dk
$lumio-color-success         → $lumio-color-success-dk
$lumio-color-success-soft    → $lumio-color-success-soft-dk
$lumio-color-warning         → $lumio-color-warning-dk
$lumio-color-warning-soft    → $lumio-color-warning-soft-dk
$lumio-color-danger          → $lumio-color-danger-dk
$lumio-color-danger-soft     → $lumio-color-danger-soft-dk
$lumio-color-surface-muted   → $lumio-color-surface-muted-dk
$lumio-shadow-xs             → $lumio-shadow-xs-dk
$lumio-shadow-sm             → $lumio-shadow-sm-dk
$lumio-shadow-md             → $lumio-shadow-md-dk
$lumio-shadow-lg             → $lumio-shadow-lg-dk
```

**Important:** Only add `@include dark { }` for properties that ARE different in dark mode. Spacing, radius, font-size, z-index — these never change.

**Order (smallest to largest, reduces risk):**

### Task 12: `lumio-breadcrumbs.css` → `components/_breadcrumbs.scss` (74 lines)

```bash
# After converting:
git add app/styles/components/_breadcrumbs.scss
git commit -m "feat(scss): convert lumio-breadcrumbs to SCSS"
```

### Task 13: `lumio-language-switcher.css` → `components/_language-switcher.scss` (104 lines)

```bash
git add app/styles/components/_language-switcher.scss
git commit -m "feat(scss): convert lumio-language-switcher to SCSS"
```

### Task 14: `lumio-notification-dropdown.css` → `components/_notification-dropdown.scss` (179 lines)

```bash
git add app/styles/components/_notification-dropdown.scss
git commit -m "feat(scss): convert lumio-notification-dropdown to SCSS"
```

### Task 15: `lumio-audit-panel.css` → `components/_audit-panel.scss` (288 lines)

```bash
git add app/styles/components/_audit-panel.scss
git commit -m "feat(scss): convert lumio-audit-panel to SCSS"
```

### Task 16: `lumio-pdf-preview-modal.css` → `components/_pdf-preview-modal.scss` (471 lines)

```bash
git add app/styles/components/_pdf-preview-modal.scss
git commit -m "feat(scss): convert lumio-pdf-preview-modal to SCSS"
```

### Task 17: `lumio-navigation.css` → `components/_navigation.scss` (513 lines)

```bash
git add app/styles/components/_navigation.scss
git commit -m "feat(scss): convert lumio-navigation to SCSS"
```

### Task 18: `lumio-sidebar.css` → `layout/_shell.scss` (494 lines)

This file goes to `layout/` (not `components/`) because it defines the shell grid (`.lumio-shell`, `.lumio-shell__sidebar`, `.lumio-topbar`).

```bash
git add app/styles/layout/_shell.scss
git commit -m "feat(scss): convert lumio-sidebar shell to SCSS layout"
```

### Task 19: `lumio-dashboard.css` → `components/_dashboard.scss` (501 lines)

```bash
git add app/styles/components/_dashboard.scss
git commit -m "feat(scss): convert lumio-dashboard to SCSS"
```

### Task 20: `lumio-transaction-table.css` → `components/_transaction-table.scss` (937 lines)

```bash
git add app/styles/components/_transaction-table.scss
git commit -m "feat(scss): convert lumio-transaction-table to SCSS"
```

### Task 21: `lumio-statements.css` → `components/_statements.scss` (2812 lines)

This is the largest file. Work in sections — do 500 lines at a time, verify no compilation errors between sections.

```bash
git add app/styles/components/_statements.scss
git commit -m "feat(scss): convert lumio-statements to SCSS"
```

---

## Task 22: Create barrel files for `components/` and `layout/`

**Files:**
- Create: `app/styles/components/_index.scss`
- Create: `app/styles/layout/_index.scss`

**Step 1: Create `components/_index.scss`**

```scss
// app/styles/components/_index.scss
@forward 'breadcrumbs';
@forward 'language-switcher';
@forward 'notification-dropdown';
@forward 'audit-panel';
@forward 'pdf-preview-modal';
@forward 'navigation';
@forward 'dashboard';
@forward 'transaction-table';
@forward 'statements';
```

**Step 2: Create `layout/_index.scss`**

```scss
// app/styles/layout/_index.scss
@forward 'shell';
```

**Step 3: Commit**

```bash
git add app/styles/components/_index.scss app/styles/layout/_index.scss
git commit -m "feat(scss): add barrel files for components and layout"
```

---

## Task 23: Write `globals.scss`

**Files:**
- Create: `app/globals.scss`

**Step 1: Create `globals.scss`**

```scss
// app/globals.scss
// Entry point — mirrors the old globals.css @import chain.
// Order matters: abstracts first (no output), then base, themes, layout, components, vendors, utils.
@use 'styles/abstracts';
@use 'styles/base';
@use 'styles/themes';
@use 'styles/layout';
@use 'styles/components';
@use 'styles/vendors';
@use 'styles/utils';
```

**Step 2: Commit**

```bash
git add app/globals.scss
git commit -m "feat(scss): add globals.scss entry point"
```

---

## Task 24: Update `layout.tsx` import

**Files:**
- Modify: `app/layout.tsx:3`

**Step 1: Change import**

```tsx
// Before
import './globals.css';
// After
import './globals.scss';
```

**Step 2: Start dev server and verify no compilation errors**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend
npm run dev
```

Expected: no SCSS compilation errors in terminal output.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(scss): switch globals import from CSS to SCSS"
```

---

## Task 25: Update component CSS imports to SCSS

There are a few components that import CSS directly (not via globals.css).
Check and update each:

**Files to check and update:**
- `app/components/NotificationDropdown.tsx:11` — `import '@/app/styles/blocks/lumio-notification-dropdown.css'`
- Any others found by: `grep -r "import.*\.css" app/ --include="*.tsx" --include="*.ts"`

**Step 1: Update imports**

In `NotificationDropdown.tsx`:
```tsx
// Before
import '@/app/styles/blocks/lumio-notification-dropdown.css';
// After
import '@/app/styles/components/lumio-notification-dropdown.scss';
```

Wait — the new file is `app/styles/components/_notification-dropdown.scss` with underscore prefix (SCSS partial). In 7-1, partials are imported via `globals.scss` already. Remove direct imports from components entirely since they're already bundled.

**Step 2: Delete direct CSS import from NotificationDropdown.tsx**

Remove line 11 from `NotificationDropdown.tsx`. The styles are now loaded via `globals.scss`.

Verify same pattern applies to Sidebar.tsx, Navigation.tsx, PDFPreviewModal.tsx.

**Step 3: Commit**

```bash
git add app/components/
git commit -m "chore: remove direct CSS imports (now bundled via globals.scss)"
```

---

## Task 26: Migrate static token inline styles in TSX/TS (scripted)

525 occurrences of `var(--lumio-radius-*|space-*|shadow-*|font-*)` in TSX/TS files. Replace with `tokens.*` references using a sed script.

**Step 1: Add import to each affected file**

First, identify all files:
```bash
grep -rl "var(--lumio-radius\|var(--lumio-space\|var(--lumio-shadow\|var(--lumio-font" \
  /Users/symonbaikov/Projects/lumio/frontend/app \
  --include="*.tsx" --include="*.ts"
```

For each file that doesn't already import `tokens`, add:
```tsx
import { tokens } from '@/lib/theme-tokens';
```

**Step 2: Replace radius tokens**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend/app
# Run these sed replacements on all TSX/TS files:
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e "s/var(--lumio-radius-none)/tokens.radius.none/g" \
  -e "s/var(--lumio-radius-xs)/tokens.radius.xs/g" \
  -e "s/var(--lumio-radius-sm)/tokens.radius.sm/g" \
  -e "s/var(--lumio-radius-md)/tokens.radius.md/g" \
  -e "s/var(--lumio-radius-lg)/tokens.radius.lg/g" \
  -e "s/var(--lumio-radius-xl)/tokens.radius.xl/g" \
  -e "s/var(--lumio-radius-full)/tokens.radius.full/g"
```

**Step 3: Replace space tokens**

```bash
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e "s/var(--lumio-space-12)/tokens.space[12]/g" \
  -e "s/var(--lumio-space-10)/tokens.space[10]/g" \
  -e "s/var(--lumio-space-8)/tokens.space[8]/g" \
  -e "s/var(--lumio-space-6)/tokens.space[6]/g" \
  -e "s/var(--lumio-space-5)/tokens.space[5]/g" \
  -e "s/var(--lumio-space-4)/tokens.space[4]/g" \
  -e "s/var(--lumio-space-3)/tokens.space[3]/g" \
  -e "s/var(--lumio-space-2)/tokens.space[2]/g" \
  -e "s/var(--lumio-space-1)/tokens.space[1]/g" \
  -e "s/var(--lumio-space-0)/tokens.space[0]/g"
```

**Step 4: Replace shadow tokens**

```bash
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e "s/var(--lumio-shadow-xs)/tokens.shadow.xs/g" \
  -e "s/var(--lumio-shadow-sm)/tokens.shadow.sm/g" \
  -e "s/var(--lumio-shadow-md)/tokens.shadow.md/g" \
  -e "s/var(--lumio-shadow-lg)/tokens.shadow.lg/g"
```

**Step 5: Replace font tokens**

```bash
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e "s/var(--lumio-font-size-xs)/tokens.font.size.xs/g" \
  -e "s/var(--lumio-font-size-sm)/tokens.font.size.sm/g" \
  -e "s/var(--lumio-font-size-base)/tokens.font.size.base/g" \
  -e "s/var(--lumio-font-size-md)/tokens.font.size.md/g" \
  -e "s/var(--lumio-font-size-lg)/tokens.font.size.lg/g" \
  -e "s/var(--lumio-font-size-xl)/tokens.font.size.xl/g" \
  -e "s/var(--lumio-font-weight-regular)/tokens.font.weight.regular/g" \
  -e "s/var(--lumio-font-weight-medium)/tokens.font.weight.medium/g" \
  -e "s/var(--lumio-font-weight-semibold)/tokens.font.weight.semibold/g" \
  -e "s/var(--lumio-font-weight-bold)/tokens.font.weight.bold/g"
```

**Step 6: Add `tokens` import to all modified files**

```bash
# Check which files now reference tokens but don't import it:
grep -rl "tokens\." . --include="*.tsx" --include="*.ts" | \
  xargs grep -L "from '@/lib/theme-tokens'"
```

For each file in the output, add at the top (after existing imports):
```tsx
import { tokens } from '@/lib/theme-tokens';
```

**Step 7: Verify TypeScript compiles**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend
npx tsc --noEmit
```

Expected: no type errors related to `tokens`.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(scss): replace static var(--lumio-*) inline styles with tokens constants"
```

---

## Task 27: Migrate dark-mode color inline styles (27 occurrences, manual)

These files use `var(--lumio-color-*)` in inline styles that need theme awareness.

**List of files to update:**

| File | Lines |
|---|---|
| `app/admin/page.tsx` | ~89 |
| `app/components/dashboard/OverviewTab.tsx` | ~40, 158, 192, 199, 206, 213, 229, 233, 284 |
| `app/audit/components/AuditEventModal.tsx` | ~22, 27, 32, 70, 71, 74, 107 |
| `app/audit/page.tsx` | ~54, 56, 78 |
| `app/theme.ts` | ~61, 71, 99, 133, 142 |
| `app/(main)/dashboard/components/DashboardHeader.tsx` | ~35, 54 |

**Pattern for client components:**

```tsx
// Add to imports:
import { useTheme } from 'next-themes';
import { tokens } from '@/lib/theme-tokens';

// Inside component:
const { resolvedTheme } = useTheme();
const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

// Replace:
// 'var(--lumio-color-danger)'  →  c.danger
// 'var(--lumio-color-primary)'  →  c.primary
// 'var(--lumio-color-ink-400)'  →  c.ink400
// 'var(--lumio-color-ink-500)'  →  c.ink500
// etc.
```

**Pattern for `theme.ts` (MUI, not a component):**

`theme.ts` is called to create the MUI theme. It needs to accept the current theme mode:

```ts
// app/theme.ts — modify to accept mode parameter
import { tokens } from '@/lib/theme-tokens';

export function createAppTheme(mode: 'light' | 'dark') {
  const c = mode === 'dark' ? tokens.dark.color : tokens.color;
  
  // Replace all var(--lumio-color-*) with c.*
  // e.g.:
  // 'var(--lumio-color-ink-100)' → c.ink100
  // 'var(--lumio-color-ink-150)' → c.ink150
  // 'var(--lumio-color-primary-50)' → c.primary50
  
  return createTheme({
    // ... existing config with c.* instead of var()
  });
}
```

Then wherever `createAppTheme` (or current theme creator) is called, pass the mode from `useTheme().resolvedTheme`.

**Go through each file, update, verify no regressions.**

**Step 1: Update `app/theme.ts`**

**Step 2: Update `app/(main)/dashboard/components/DashboardHeader.tsx`**

**Step 3: Update `app/audit/page.tsx` and `AuditEventModal.tsx`**

**Step 4: Update `app/admin/page.tsx`**

**Step 5: Update `app/components/dashboard/OverviewTab.tsx`**

**Step 6: Verify TypeScript**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(scss): replace dark-mode color inline styles with theme-aware tokens"
```

---

## Task 28: Delete old CSS files

Only after all imports are updated and dev server confirms no 404s.

**Step 1: Verify no remaining imports of old CSS files**

```bash
grep -r "\.css'" /Users/symonbaikov/Projects/lumio/frontend/app --include="*.tsx" --include="*.ts"
grep -r "styles/blocks" /Users/symonbaikov/Projects/lumio/frontend/app --include="*.tsx" --include="*.ts"
grep -r "tours/tour-theme.css" /Users/symonbaikov/Projects/lumio/frontend/app --include="*.tsx" --include="*.ts"
```

All three should return no output.

**Step 2: Delete old files**

```bash
rm /Users/symonbaikov/Projects/lumio/frontend/app/styles/tokens.css
rm /Users/symonbaikov/Projects/lumio/frontend/app/styles/base.css
rm /Users/symonbaikov/Projects/lumio/frontend/app/globals.css
rm /Users/symonbaikov/Projects/lumio/frontend/app/tours/tour-theme.css
rm /Users/symonbaikov/Projects/lumio/frontend/app/styles/blocks/*.css
rmdir /Users/symonbaikov/Projects/lumio/frontend/app/styles/blocks  # if empty
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete old CSS files after SCSS migration"
```

---

## Task 29: Final verification

**Step 1: Run TypeScript check**

```bash
cd /Users/symonbaikov/Projects/lumio/frontend
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Run dev build**

```bash
npm run dev
```

Expected: no SCSS compilation errors, app loads correctly.

**Step 3: Verify dark mode works**

Toggle dark mode in the app. Verify:
- Sidebar colors change
- Navigation colors change
- Dashboard colors change
- Statements page colors change

**Step 4: Production build check**

```bash
npm run build
```

Expected: build completes without errors.

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(scss): post-migration adjustments"
```

---

## Summary

| Step | What changes |
|---|---|
| Tasks 1–6 | New SCSS abstracts infrastructure |
| Task 7 | New `lib/theme-tokens.ts` for JS usage |
| Tasks 8–11 | Base, themes, vendors, utils converted |
| Tasks 12–22 | All 10 blocks → SCSS components + layout |
| Task 23–24 | globals.scss + layout.tsx update |
| Task 25 | Remove direct CSS imports from components |
| Task 26 | 525 static token inline styles → tokens.* (scripted) |
| Task 27 | 27 color inline styles → theme-aware tokens (manual) |
| Task 28 | Delete old CSS files |
| Task 29 | Final verification |
