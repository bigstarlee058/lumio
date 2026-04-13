# MUI + BEM Frontend Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью заменить UI-стек фронтенда (HeroUI + shadcn + Radix + Mantine + Tailwind + @iconify/react + @mui/icons-material) на `@mui/material` + `@mui/x-date-pickers` + `lucide-react`, перевести все кастомные стили на BEM CSS с префиксом `lumio-`, убрать `border-radius` у всех прямоугольных элементов.

**Architecture:** Миграция разбита на 10 строго последовательных PR-этапов. Этапы 0 и 1 подготавливают платформу (тема, CSS-токены, BEM-фреймворк, примитивы в `components/ui/*`). Этапы 2-9 последовательно мигрируют фичи по слоям: общие компоненты → auth/admin → statements → transactions → custom-tables → reports → workspaces/settings → storage/data-entry. Этап 10 удаляет устаревшие зависимости и провайдеры. Между этапами HeroUI и MUI сосуществуют, приложение остаётся работоспособным на каждом промежуточном мерже.

**Tech Stack:**
- `@mui/material` + `@emotion/react` + `@emotion/styled` (уже в deps)
- `@mui/x-date-pickers` (добавляется в этапе 0)
- `date-fns` (уже в deps, используется как adapter)
- `lucide-react` (единственная библиотека иконок, уже в deps)
- BEM CSS с префиксом `lumio-` в `app/styles/blocks/*.css`
- CSS-переменные как дизайн-токены в `app/styles/tokens.css`

**Reference spec:** `docs/superpowers/specs/2026-04-11-mui-bem-refactor-design.md`

---

## File Structure

### Создаваемые файлы

```
frontend/app/styles/
├── tokens.css              # CSS-переменные: палитра, spacing, typography, z-index
├── base.css                # reset, typography base, утилиты u-*
└── blocks/
    ├── lumio-card.css      # создаётся по мере миграции этапов 2-9
    ├── lumio-drawer.css
    ├── lumio-filter-bar.css
    ├── lumio-page-header.css
    ├── lumio-empty-state.css
    └── ...                 # по одному файлу на новый BEM-блок

docs/superpowers/plans/
└── 2026-04-11-mui-bem-refactor-audit.txt   # baseline grep-аудит
```

### Модифицируемые файлы (инфраструктура)

- `frontend/package.json` — добавление `@mui/x-date-pickers`, удаление старых зависимостей в этапе 10
- `frontend/app/theme.ts` — расширение MUI темы с `shape.borderRadius: 0` и component overrides
- `frontend/app/providers.tsx` — добавление `LocalizationProvider` в этапе 0, удаление `HeroUIProvider`/`MantineProvider` в этапе 10
- `frontend/app/globals.css` — чистка от Tailwind, подключение `tokens.css`, `base.css`, block-файлов
- `frontend/app/layout.tsx` — убедиться, что подключает обновлённый `globals.css`

### Модифицируемые файлы (примитивы, этап 1 — 21 файл)

```
frontend/app/components/ui/
├── alert.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── checkbox.tsx
├── CurrencyDisplayToggle.tsx
├── CurrencyFilterDropdown.tsx
├── detail-action-button.tsx
├── drawer-shell.tsx
├── dropdown-menu.tsx
├── filter-chip-button.tsx
├── input.tsx
├── label.tsx
├── modal-shell.tsx
├── pagination.tsx
├── select.tsx
├── separator.tsx
└── spinner.tsx
```

### Удаляемые файлы (этап 10)

- `frontend/app/hero.ts`
- `frontend/app/mantine-theme.ts`
- `frontend/tailwind.config.*` (если есть)
- `frontend/postcss.config.*` (если используется только для Tailwind)
- `frontend/storybook-static/` (артефакт сборки, добавляется в `.gitignore`)

---

## Этап 0: Подготовка инфраструктуры

**Цель этапа:** Добавить MUI date pickers, создать каркас BEM-стилей, расширить MUI-тему overrides с `borderRadius: 0`, обернуть приложение в `LocalizationProvider`. **Ничего не удалять.** После этапа HeroUI и MUI продолжают работать параллельно, как сейчас.

**PR-title:** `refactor(frontend): step 0 — prepare MUI/BEM infrastructure`

### Task 0.1: Baseline аудит

**Files:**
- Create: `docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt`

- [ ] **Step 1: Снять полный grep-аудит текущего состояния**

```bash
cd frontend
{
  echo "=== @heroui usage ==="
  grep -rn "@heroui" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== @radix-ui usage ==="
  grep -rn "@radix-ui" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== @mantine usage ==="
  grep -rn "@mantine" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== @iconify/react usage ==="
  grep -rn "@iconify/react" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== @mui/icons-material usage ==="
  grep -rn "@mui/icons-material" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== react-select usage ==="
  grep -rn "from 'react-select'" app --include="*.ts" --include="*.tsx" -l | sort
  echo ""
  echo "=== Tailwind rounded-* classes ==="
  grep -rEn "rounded-[a-z0-9]+" app --include="*.tsx" -l | sort
  echo ""
  echo "=== Bundle baseline ==="
  du -sh .next 2>/dev/null || echo "no build yet"
} > ../docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt
```

- [ ] **Step 2: Построить production-бандл и зафиксировать размер**

```bash
cd frontend
npm run build 2>&1 | tee -a ../docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt
du -sh .next/static 2>&1 | tee -a ../docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt
```

Expected: сборка успешная, размер `.next/static` фиксируется в audit-файле.

- [ ] **Step 3: Commit audit baseline**

```bash
git add docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt
git commit -m "chore(frontend): capture MUI/BEM refactor baseline audit"
```

### Task 0.2: Установка @mui/x-date-pickers

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Установить пакет**

```bash
cd frontend
npm install @mui/x-date-pickers
```

Expected: `@mui/x-date-pickers` добавлен в `dependencies`, `date-fns` остаётся без изменений (уже `^4.1.0`).

- [ ] **Step 2: Проверка совместимости peer-зависимости date-fns**

```bash
cd frontend
npm ls date-fns
```

Expected: единственная версия `date-fns@^4.1.0`, без peer-conflict предупреждений.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add @mui/x-date-pickers"
```

### Task 0.3: Создание CSS-токенов

**Files:**
- Create: `frontend/app/styles/tokens.css`

- [ ] **Step 1: Создать файл CSS-переменных**

```css
/* app/styles/tokens.css
 * Источник правды для дизайн-токенов. Используется и MUI темой
 * (через var() в styleOverrides), и BEM-блоками в app/styles/blocks/*.css.
 */

:root {
  /* Палитра — light */
  --lumio-color-primary: #0284c7;
  --lumio-color-primary-hover: #0369a1;
  --lumio-color-primary-contrast: #ffffff;
  --lumio-color-secondary: #475569;
  --lumio-color-secondary-contrast: #ffffff;
  --lumio-color-danger: #dc2626;
  --lumio-color-danger-contrast: #ffffff;
  --lumio-color-success: #16a34a;
  --lumio-color-warning: #d97706;
  --lumio-color-info: #0ea5e9;

  --lumio-color-bg: #ffffff;
  --lumio-color-surface: #ffffff;
  --lumio-color-surface-muted: #f1f5f9;
  --lumio-color-text-primary: #0f172a;
  --lumio-color-text-secondary: #4b5563;
  --lumio-color-border: #d7e2ef;
  --lumio-color-border-strong: #94a3b8;

  /* Spacing (кратно 4px) */
  --lumio-space-0: 0;
  --lumio-space-1: 4px;
  --lumio-space-2: 8px;
  --lumio-space-3: 12px;
  --lumio-space-4: 16px;
  --lumio-space-5: 20px;
  --lumio-space-6: 24px;
  --lumio-space-8: 32px;
  --lumio-space-10: 40px;
  --lumio-space-12: 48px;

  /* Typography */
  --lumio-font-family: var(--font-manrope), "Manrope", "Inter", "Segoe UI", sans-serif;
  --lumio-font-size-xs: 12px;
  --lumio-font-size-sm: 13px;
  --lumio-font-size-base: 14px;
  --lumio-font-size-md: 15px;
  --lumio-font-size-lg: 16px;
  --lumio-font-size-xl: 18px;
  --lumio-font-weight-regular: 400;
  --lumio-font-weight-medium: 500;
  --lumio-font-weight-semibold: 600;
  --lumio-font-weight-bold: 700;
  --lumio-line-height-tight: 1.25;
  --lumio-line-height-normal: 1.5;

  /* Shape */
  --lumio-radius-none: 0;
  --lumio-radius-full: 9999px;   /* только для круглых элементов */

  /* Shadow */
  --lumio-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.08);
  --lumio-shadow-md: 0 4px 12px rgba(15, 23, 42, 0.1);

  /* Z-index */
  --lumio-z-dropdown: 1000;
  --lumio-z-modal: 1300;
  --lumio-z-popover: 1400;
  --lumio-z-tooltip: 1500;
}

.dark {
  --lumio-color-primary: #5B9BD5;
  --lumio-color-primary-hover: #4A8BC5;
  --lumio-color-primary-contrast: #0F1419;
  --lumio-color-secondary: #1A2332;
  --lumio-color-secondary-contrast: #E2E8F0;
  --lumio-color-danger: #ef4444;
  --lumio-color-success: #22c55e;
  --lumio-color-warning: #f59e0b;
  --lumio-color-info: #38bdf8;

  --lumio-color-bg: #0F1419;
  --lumio-color-surface: #151C24;
  --lumio-color-surface-muted: #1E2A3A;
  --lumio-color-text-primary: #e2e8f0;
  --lumio-color-text-secondary: #8899AA;
  --lumio-color-border: #1E2A3A;
  --lumio-color-border-strong: #334155;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/styles/tokens.css
git commit -m "feat(frontend): add BEM design tokens in tokens.css"
```

### Task 0.4: Создание base.css

**Files:**
- Create: `frontend/app/styles/base.css`

- [ ] **Step 1: Создать базовый CSS**

```css
/* app/styles/base.css
 * Минимальный reset, типографика, BEM-утилиты (префикс u-).
 * Не содержит BEM-блоков — только глобальные вещи.
 */

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: var(--lumio-font-family);
  font-size: var(--lumio-font-size-base);
  line-height: var(--lumio-line-height-normal);
  color: var(--lumio-color-text-primary);
  background: var(--lumio-color-bg);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd {
  margin: 0;
}

button {
  font-family: inherit;
}

/* Утилиты */
.u-visually-hidden {
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

.u-text-center { text-align: center; }
.u-text-right { text-align: right; }
.u-text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.u-flex { display: flex; }
.u-flex-col { display: flex; flex-direction: column; }
.u-items-center { align-items: center; }
.u-justify-between { justify-content: space-between; }
.u-gap-1 { gap: var(--lumio-space-1); }
.u-gap-2 { gap: var(--lumio-space-2); }
.u-gap-3 { gap: var(--lumio-space-3); }
.u-gap-4 { gap: var(--lumio-space-4); }

.u-w-full { width: 100%; }
.u-h-full { height: 100%; }
```

- [ ] **Step 2: Создать пустую директорию для BEM-блоков**

```bash
mkdir -p frontend/app/styles/blocks
touch frontend/app/styles/blocks/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/styles/base.css frontend/app/styles/blocks/.gitkeep
git commit -m "feat(frontend): add base.css with reset, typography, u-* utilities"
```

### Task 0.5: Расширение MUI темы — borderRadius: 0 overrides

**Files:**
- Modify: `frontend/app/theme.ts`

- [ ] **Step 1: Обновить `sharedOptions` в `app/theme.ts`**

Заменить блок `const sharedOptions: Pick<ThemeOptions, 'typography' | 'components'> = { ... };` на:

```ts
const sharedOptions: Pick<ThemeOptions, 'shape' | 'typography' | 'components'> = {
  shape: { borderRadius: 0 },
  typography: {
    fontFamily:
      'var(--font-manrope), "Manrope", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 650, fontSize: '2.5rem' },
    h2: { fontWeight: 650, fontSize: '2rem' },
    h3: { fontWeight: 620, fontSize: '1.75rem' },
    h4: { fontWeight: 620, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0, padding: '8px 18px' },
        contained: { boxShadow: 'none' },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 0, boxShadow: 'none', backgroundImage: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 0 } },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    // Avatar, Switch, CircularProgress — НЕ переопределяем (остаются круглыми)
  },
};
```

- [ ] **Step 2: Type-check**

```bash
cd frontend
npm run type-check
```

Expected: PASS (0 ошибок).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/theme.ts
git commit -m "feat(frontend): set borderRadius: 0 on all rectangular MUI components"
```

### Task 0.6: Обновление globals.css — подключение tokens + base

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Добавить импорты tokens и base в начало файла**

В `app/globals.css` после строки `@import url("https://fonts.googleapis.com/...");` добавить:

```css
@import "./styles/tokens.css";
@import "./styles/base.css";
```

Tailwind-директивы **не трогаем** в этапе 0 — они будут удалены в этапе 10.

- [ ] **Step 2: Проверить сборку**

```bash
cd frontend
npm run build
```

Expected: успешная сборка, CSS бандл содержит переменные `--lumio-*`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(frontend): import tokens.css and base.css into globals"
```

### Task 0.7: LocalizationProvider в providers.tsx

**Files:**
- Modify: `frontend/app/providers.tsx`

- [ ] **Step 1: Обернуть ThemeProvider в LocalizationProvider**

В `app/providers.tsx`:

1. Добавить импорты:
```ts
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
```
Если `AdapterDateFnsV3` недоступен в установленной версии — использовать `@mui/x-date-pickers/AdapterDateFns`.

2. Внутри JSX заменить:
```tsx
<ThemeProvider theme={muiTheme}>
  <WorkspaceProvider>
    ...
```
на:
```tsx
<ThemeProvider theme={muiTheme}>
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    <WorkspaceProvider>
      ...
```
И добавить закрытие `</LocalizationProvider>` перед `</ThemeProvider>`.

- [ ] **Step 2: Запустить type-check и build**

```bash
cd frontend
npm run type-check && npm run build
```

Expected: PASS.

- [ ] **Step 3: Прогнать существующие тесты providers**

```bash
cd frontend
npm test -- app/providers.test.tsx
```

Expected: зелёные.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/providers.tsx
git commit -m "feat(frontend): wrap app in MUI LocalizationProvider (date-fns)"
```

### Task 0.8: Финальная проверка этапа 0

- [ ] **Step 1: Прогнать полный verification suite**

```bash
cd frontend
npm run type-check
npm run lint:check
npm test
npm run build
```

Expected: всё зелёное. Ни один существующий компонент не сломан — этап 0 был чисто аддитивным.

- [ ] **Step 2: Push и создать PR**

```bash
git push -u origin HEAD
gh pr create --title "refactor(frontend): step 0 — prepare MUI/BEM infrastructure" --body "$(cat <<'EOF'
## Summary
- Adds @mui/x-date-pickers
- Creates app/styles/tokens.css with BEM design tokens (--lumio-*)
- Creates app/styles/base.css with reset, typography, u-* utilities
- Extends MUI theme with borderRadius: 0 overrides for all rectangular components
- Wraps app in MUI LocalizationProvider (date-fns adapter)
- Captures baseline audit in docs/superpowers/plans/

## Test plan
- [x] npm run type-check
- [x] npm run lint:check
- [x] npm test (existing tests pass)
- [x] npm run build

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Этап 1: UI-примитивы (`app/components/ui/*`)

**Цель этапа:** Переписать все ~18 файлов в `components/ui/` на MUI-обёртки, сохранив текущие интерфейсы пропсов, чтобы не ломать ~278 потребителей. Каждый примитив становится тонкой обёрткой над MUI, сохраняющей API проекта.

**PR-title:** `refactor(frontend): step 1 — migrate UI primitives to MUI`

### Общий паттерн для каждого примитива

Каждый примитив мигрируется по одному шаблону:

1. Прочитать существующий файл, зафиксировать публичный API (типы пропсов, варианты, экспорты).
2. Переписать реализацию на MUI-обёртку, маппя старые варианты на MUI-пропсы.
3. Сохранить имя файла, имена экспортов и сигнатуры типов (`ButtonProps`, `ButtonVariant` и т.д.).
4. Убрать импорт `cn` из `@/app/lib/utils` (Tailwind merge), если единственное использование — это классы Tailwind. Если `className` передаётся извне — пробрасывать его в `sx`/`className` MUI-компонента через `clsx`.
5. Обновить соответствующие тесты (`*.test.tsx`), заменив селекторы на MUI role/data-testid.
6. Прогнать `npm test -- <file>.test.tsx` и `npm run type-check`.
7. Коммит вида `refactor(frontend): migrate <primitive> to MUI`.

### Task 1.1: Button (`app/components/ui/button.tsx`)

**Files:**
- Modify: `frontend/app/components/ui/button.tsx`

- [ ] **Step 1: Переписать файл целиком**

```tsx
'use client';

import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import * as React from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'soft';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const mapVariant = (v: ButtonVariant): {
  variant: MuiButtonProps['variant'];
  color: MuiButtonProps['color'];
} => {
  switch (v) {
    case 'default':     return { variant: 'contained', color: 'primary' };
    case 'secondary':   return { variant: 'contained', color: 'secondary' };
    case 'outline':     return { variant: 'outlined',  color: 'primary' };
    case 'ghost':       return { variant: 'text',      color: 'inherit' };
    case 'destructive': return { variant: 'contained', color: 'error' };
    case 'soft':        return { variant: 'outlined',  color: 'primary' };
  }
};

const mapSize = (s: ButtonSize): MuiButtonProps['size'] => {
  if (s === 'sm') return 'small';
  if (s === 'lg') return 'large';
  return 'medium';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', type, children, ...props }, ref) => {
    const muiVariant = mapVariant(variant);
    const muiSize = mapSize(size);

    if (size === 'icon') {
      return (
        <MuiIconButton
          ref={ref}
          type={type ?? 'button'}
          color={muiVariant.color === 'inherit' ? 'default' : muiVariant.color}
          size={muiSize}
          {...props}
        >
          {children}
        </MuiIconButton>
      );
    }

    return (
      <MuiButton
        ref={ref}
        type={type ?? 'button'}
        variant={muiVariant.variant}
        color={muiVariant.color}
        size={muiSize}
        {...props}
      >
        {children}
      </MuiButton>
    );
  },
);
Button.displayName = 'Button';

export { Button };
```

- [ ] **Step 2: Type-check**

```bash
cd frontend
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/ui/button.tsx
git commit -m "refactor(frontend): migrate Button primitive to MUI"
```

### Task 1.2: Input (`app/components/ui/input.tsx`)

**Files:**
- Modify: `frontend/app/components/ui/input.tsx`

- [ ] **Step 1: Прочитать текущий файл и зафиксировать API**

```bash
cat frontend/app/components/ui/input.tsx
```

- [ ] **Step 2: Переписать на `TextField`**

Заменить содержимое файла на тонкую обёртку:

```tsx
'use client';

import TextField, { type TextFieldProps } from '@mui/material/TextField';
import * as React from 'react';

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  /** Legacy error text support from existing API */
  errorText?: string;
}

const Input = React.forwardRef<HTMLDivElement, InputProps>(
  ({ errorText, helperText, error, ...props }, ref) => (
    <TextField
      ref={ref}
      variant="outlined"
      size="small"
      fullWidth
      error={error || Boolean(errorText)}
      helperText={errorText ?? helperText}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
```

**ВАЖНО:** перед заменой сверить, какие пропсы реально используются в проекте — если текущий `Input` имеет другие уникальные пропсы (`startAdornment`, `icon`), сохранить их и замаппить на `InputProps` MUI через `slotProps.input.startAdornment`.

- [ ] **Step 3: Type-check**

```bash
cd frontend
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/ui/input.tsx
git commit -m "refactor(frontend): migrate Input primitive to MUI TextField"
```

### Task 1.3: Select (`app/components/ui/select.tsx`)

**Files:**
- Modify: `frontend/app/components/ui/select.tsx`

- [ ] **Step 1: Прочитать текущий файл**

```bash
cat frontend/app/components/ui/select.tsx
```

- [ ] **Step 2: Переписать на `Select` + `MenuItem`**

Заменить реализацию на обёртку над `@mui/material/Select` с сохранением текущего API (props: `value`, `onChange`, `options`, `placeholder`, `disabled`, `error`). Использовать `FormControl` + `InputLabel` + `Select` + `MenuItem` из `@mui/material`.

Если в проекте `select.tsx` поддерживает поиск — использовать `Autocomplete` из `@mui/material` вместо `Select`.

- [ ] **Step 3: Type-check**

```bash
cd frontend
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/ui/select.tsx
git commit -m "refactor(frontend): migrate Select primitive to MUI"
```

### Task 1.4: Checkbox

**Files:**
- Modify: `frontend/app/components/ui/checkbox.tsx`

- [ ] **Step 1: Переписать на обёртку `Checkbox` + `FormControlLabel`**

```tsx
'use client';

import MuiCheckbox, { type CheckboxProps as MuiCheckboxProps } from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import * as React from 'react';

export interface CheckboxProps extends MuiCheckboxProps {
  label?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ label, ...props }, ref) => {
    if (label) {
      return <FormControlLabel control={<MuiCheckbox inputRef={ref} {...props} />} label={label} />;
    }
    return <MuiCheckbox inputRef={ref} {...props} />;
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/checkbox.tsx
git commit -m "refactor(frontend): migrate Checkbox primitive to MUI"
```

### Task 1.5: Card

**Files:**
- Modify: `frontend/app/components/ui/card.tsx`

- [ ] **Step 1: Переписать на обёртку над `Card`/`CardHeader`/`CardContent`**

Сохранить текущие exported компоненты (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` — если есть). Каждый становится тонкой обёрткой над соответствующим MUI-компонентом: `Card`, `CardHeader`, `Typography` (для title), `CardContent`, `CardActions`.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/card.tsx
git commit -m "refactor(frontend): migrate Card primitive to MUI"
```

### Task 1.6: Modal shell

**Files:**
- Modify: `frontend/app/components/ui/modal-shell.tsx`
- Modify: `frontend/app/components/ui/modal-shell.test.tsx`

- [ ] **Step 1: Прочитать файл и тест**

```bash
cat frontend/app/components/ui/modal-shell.tsx
cat frontend/app/components/ui/modal-shell.test.tsx
```

- [ ] **Step 2: Переписать на `Dialog`**

Зафиксировать текущий API (обычно `open`, `onClose`, `title`, `children`, `footer`, `size`). Переписать как обёртку над `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions`. Size маппится на `maxWidth` (`sm`/`md`/`lg`).

- [ ] **Step 3: Обновить тест**

Заменить селекторы:
- `screen.getByRole('dialog')` вместо кастомных `data-slot` HeroUI
- `screen.getByRole('button', { name: /close/i })` для кнопки закрытия
- Проверять `onClose` callback через симуляцию Escape или клика по backdrop

- [ ] **Step 4: Прогнать тест**

```bash
cd frontend
npm test -- app/components/ui/modal-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/ui/modal-shell.tsx frontend/app/components/ui/modal-shell.test.tsx
git commit -m "refactor(frontend): migrate ModalShell to MUI Dialog"
```

### Task 1.7: Drawer shell

**Files:**
- Modify: `frontend/app/components/ui/drawer-shell.tsx`

- [ ] **Step 1: Переписать на `Drawer`**

Обёртка над `@mui/material/Drawer`. Сохранить API `open`/`onClose`/`position` → `anchor`. Установить `PaperProps={{ sx: { borderRadius: 0 } }}`.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/drawer-shell.tsx
git commit -m "refactor(frontend): migrate DrawerShell to MUI Drawer"
```

### Task 1.8: Dropdown menu

**Files:**
- Modify: `frontend/app/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Прочитать текущий файл (использует @radix-ui)**

```bash
cat frontend/app/components/ui/dropdown-menu.tsx
```

- [ ] **Step 2: Переписать на `Menu` + `MenuItem`**

Зафиксировать публичные экспорты (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`). Реализовать их как тонкие обёртки над MUI: `DropdownMenuContent` → `Menu`, `DropdownMenuItem` → `MenuItem`, `DropdownMenuSeparator` → `Divider`. Триггер реализуется через `anchorEl` state в родительском компоненте — либо обёртка сохраняет API Radix через React context.

**Простейшая реализация:** создать `DropdownMenu` как controlled компонент `{ trigger, items, open, onOpenChange }` с внутренним `anchorEl`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/ui/dropdown-menu.tsx
git commit -m "refactor(frontend): migrate DropdownMenu from radix to MUI Menu"
```

### Task 1.9: Pagination

**Files:**
- Modify: `frontend/app/components/ui/pagination.tsx`
- Modify: `frontend/app/components/ui/pagination.test.tsx`

- [ ] **Step 1: Переписать на `Pagination`**

```tsx
'use client';

import MuiPagination, { type PaginationProps as MuiPaginationProps } from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import * as React from 'react';

export interface PaginationProps
  extends Omit<MuiPaginationProps, 'onChange' | 'page'> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  ...props
}) => (
  <MuiPagination
    page={page}
    count={totalPages}
    onChange={(_, p) => onPageChange(p)}
    shape="rounded"
    renderItem={(item) => <PaginationItem {...item} />}
    {...props}
  />
);
```

**Примечание:** `shape="rounded"` у MUI даёт квадратные углы с маленьким radius; theme override в этапе 0 уже сделал `borderRadius: 0` для всех пагинаций автоматически, так что форма будет плоская.

- [ ] **Step 2: Обновить тест**

Заменить селекторы на `screen.getByRole('navigation')`, `screen.getAllByRole('button')`.

- [ ] **Step 3: Прогнать тест**

```bash
cd frontend
npm test -- app/components/ui/pagination.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/ui/pagination.tsx frontend/app/components/ui/pagination.test.tsx
git commit -m "refactor(frontend): migrate Pagination to MUI"
```

### Task 1.10: Badge

**Files:**
- Modify: `frontend/app/components/ui/badge.tsx`

- [ ] **Step 1: Переписать на `Chip`**

Сохранить API (`variant`, `color`, `children`). Маппинг:
- `variant='default'` → `Chip variant='filled'`
- `variant='outline'` → `Chip variant='outlined'`
- Цвета пробрасывать в `color` Chip.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/badge.tsx
git commit -m "refactor(frontend): migrate Badge to MUI Chip"
```

### Task 1.11: Alert

**Files:**
- Modify: `frontend/app/components/ui/alert.tsx`

- [ ] **Step 1: Переписать на `Alert`**

Тонкая обёртка: `variant` → `severity` (`info`/`success`/`warning`/`error`). Дочерние `AlertTitle` → `@mui/material/AlertTitle`.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/alert.tsx
git commit -m "refactor(frontend): migrate Alert to MUI"
```

### Task 1.12: Separator

**Files:**
- Modify: `frontend/app/components/ui/separator.tsx`

- [ ] **Step 1: Переписать на `Divider`**

```tsx
'use client';

import Divider, { type DividerProps } from '@mui/material/Divider';
import * as React from 'react';

export const Separator: React.FC<DividerProps> = (props) => <Divider {...props} />;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/separator.tsx
git commit -m "refactor(frontend): migrate Separator to MUI Divider"
```

### Task 1.13: Spinner

**Files:**
- Modify: `frontend/app/components/ui/spinner.tsx`

- [ ] **Step 1: Переписать на `CircularProgress`**

```tsx
'use client';

import CircularProgress, { type CircularProgressProps } from '@mui/material/CircularProgress';
import * as React from 'react';

export interface SpinnerProps extends CircularProgressProps {
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ label, size = 24, ...props }) => (
  <CircularProgress size={size} aria-label={label ?? 'Loading'} {...props} />
);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/spinner.tsx
git commit -m "refactor(frontend): migrate Spinner to MUI CircularProgress"
```

### Task 1.14: Label

**Files:**
- Modify: `frontend/app/components/ui/label.tsx`

- [ ] **Step 1: Переписать как нативный `<label>` + MUI типографика**

```tsx
'use client';

import Typography from '@mui/material/Typography';
import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>((props, ref) => (
  <Typography component="label" variant="body2" fontWeight={600} ref={ref} {...props} />
));
Label.displayName = 'Label';

export { Label };
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/ui/label.tsx
git commit -m "refactor(frontend): migrate Label to MUI Typography"
```

### Task 1.15: Filter chip button + Detail action button

**Files:**
- Modify: `frontend/app/components/ui/filter-chip-button.tsx`
- Modify: `frontend/app/components/ui/detail-action-button.tsx`

- [ ] **Step 1: Переписать `filter-chip-button.tsx`**

Тонкая обёртка над `Chip` с `onDelete`, `onClick`, `icon` пропсами.

- [ ] **Step 2: Переписать `detail-action-button.tsx`**

Тонкая обёртка над `Button` с `size="small"`, `variant="outlined"`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/ui/filter-chip-button.tsx frontend/app/components/ui/detail-action-button.tsx
git commit -m "refactor(frontend): migrate filter-chip-button and detail-action-button to MUI"
```

### Task 1.16: CurrencyDisplayToggle + CurrencyFilterDropdown

**Files:**
- Modify: `frontend/app/components/ui/CurrencyDisplayToggle.tsx`
- Modify: `frontend/app/components/ui/CurrencyFilterDropdown.tsx`

- [ ] **Step 1: Прочитать оба файла и зафиксировать API**

```bash
cat frontend/app/components/ui/CurrencyDisplayToggle.tsx
cat frontend/app/components/ui/CurrencyFilterDropdown.tsx
```

- [ ] **Step 2: Переписать CurrencyDisplayToggle**

Если это toggle между двумя режимами — использовать `ToggleButtonGroup` + `ToggleButton`. Сохранить контекст `CurrencyDisplayContext`.

- [ ] **Step 3: Переписать CurrencyFilterDropdown**

Обёртка над `Menu` с `MenuItem` для каждой валюты. Триггер — `Button` с иконкой.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/ui/CurrencyDisplayToggle.tsx frontend/app/components/ui/CurrencyFilterDropdown.tsx
git commit -m "refactor(frontend): migrate currency toggles to MUI"
```

### Task 1.17: Финальная проверка этапа 1

- [ ] **Step 1: Прогнать полный verification**

```bash
cd frontend
npm run type-check
npm run lint:check
npm test
npm run build
```

- [ ] **Step 2: Убедиться, что внутри components/ui/ нет импортов @heroui/@radix/@mantine/tailwind**

```bash
cd frontend
grep -rn "@heroui\|@radix-ui\|@mantine\|className=.*rounded-\|@iconify" app/components/ui/ --include="*.tsx"
```

Expected: 0 совпадений (за исключением возможных `className` пропсов, пробрасываемых извне — их не мигрируем в примитивах).

- [ ] **Step 3: Push и создать PR**

```bash
git push -u origin HEAD
gh pr create --title "refactor(frontend): step 1 — migrate UI primitives to MUI" --body "$(cat <<'EOF'
## Summary
Migrates all ~18 files in app/components/ui/* from HeroUI/Radix/shadcn implementations to MUI wrappers, preserving public APIs so that ~278 downstream consumers continue working unchanged.

## Test plan
- [x] npm run type-check
- [x] npm run lint:check
- [x] npm test (modal-shell.test.tsx, pagination.test.tsx pass)
- [x] npm run build
- [x] grep for @heroui/@radix/@mantine inside app/components/ui/ → 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Шаблон миграции файла (этапы 2-9)

Для этапов 2-9 каждый `.tsx`-файл проходит единый алгоритм. Воспроизводи его полностью для каждого файла.

### Per-file migration checklist

- [ ] **Step A: Прочитать файл**

```bash
cat frontend/<path>/<file>.tsx
```

- [ ] **Step B: Заменить импорты по таблице маппинга**

| Было | Стало |
|---|---|
| `from '@heroui/button'` / `from '@heroui/react'` (Button) | `import Button from '@mui/material/Button'` |
| `from '@heroui/modal'` | `import Dialog from '@mui/material/Dialog'` + `DialogTitle`/`DialogContent`/`DialogActions` |
| `from '@heroui/chip'` | `import Chip from '@mui/material/Chip'` |
| `from '@heroui/tooltip'` | `import Tooltip from '@mui/material/Tooltip'` |
| `from '@heroui/date-picker'` / `@heroui/calendar` | `import { DatePicker } from '@mui/x-date-pickers/DatePicker'` |
| `from '@radix-ui/react-dropdown-menu'` | `import Menu from '@mui/material/Menu'` + `MenuItem` |
| `from '@mantine/core'` (Modal/TextInput/Select/Button/Table) | соответствующие `@mui/material` компоненты |
| `from '@iconify/react'` | `from 'lucide-react'` (выбрать ближайшую иконку) |
| `from '@mui/icons-material/<Icon>'` | `from 'lucide-react'` (маппинг иконок) |

- [ ] **Step C: Убрать Tailwind-классы**

Для каждого `className="..."`:
- Локальный layout (1-3 правила) → `sx={{ ... }}` на соседнем MUI-компоненте или на `Box`.
- Сложный layout или композиция → новый BEM-блок `lumio-<name>` в `app/styles/blocks/lumio-<name>.css`, подключается через `import 'app/styles/blocks/lumio-<name>.css'` в файле (если Next.js поддерживает) или через `@import` в `globals.css`.
- `rounded-*` на прямоугольных элементах → удалить.
- `rounded-full` на аватаре/switch/progress → перенести как `borderRadius: '50%'` в `sx`.

**Пример замены Tailwind → sx:**
```tsx
// было
<div className="flex items-center gap-4 p-4 bg-muted">
  ...
</div>

// стало
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover' }}>
  ...
</Box>
```

**Пример создания BEM-блока для сложного layout:**
```tsx
// было
<div className="grid grid-cols-[auto_1fr_auto] gap-3 p-4 border-b border-border">
  <Icon /> <span className="truncate">{label}</span> <Chip />
</div>

// стало
<div className="lumio-statement-row">
  <Icon />
  <span className="lumio-statement-row__label">{label}</span>
  <Chip />
</div>
```

И создать файл `app/styles/blocks/lumio-statement-row.css`:
```css
.lumio-statement-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--lumio-space-3);
  padding: var(--lumio-space-4);
  border-bottom: 1px solid var(--lumio-color-border);
}

.lumio-statement-row__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

И добавить импорт в `app/globals.css`:
```css
@import "./styles/blocks/lumio-statement-row.css";
```

- [ ] **Step D: Замапить HeroUI-специфичные пропсы**

| HeroUI prop | MUI эквивалент |
|---|---|
| `isIconOnly` | `<IconButton>` вместо `<Button>` |
| `startContent={icon}` | `startIcon={icon}` |
| `endContent={icon}` | `endIcon={icon}` |
| `variant="flat"` | `variant="outlined"` или `variant="text"` |
| `variant="bordered"` | `variant="outlined"` |
| `variant="light"` | `variant="text"` |
| `variant="shadow"` | `variant="contained"` + `elevation` через sx |
| `color="primary"` | `color="primary"` (совпадает) |
| `color="danger"` | `color="error"` |
| `color="warning"` | `color="warning"` |
| `isDisabled` | `disabled` |
| `isLoading` | `disabled` + `startIcon={<CircularProgress size={16} />}` |
| `radius="none"`/`radius="sm"`/и т.д. | удалить — theme override делает всё плоским |
| `size="sm"` / `size="md"` / `size="lg"` | `size="small"` / `size="medium"` / `size="large"` |
| `isOpen` / `onOpenChange` | `open` / `onClose` |
| `Modal` + `ModalContent` + `ModalHeader` + `ModalBody` + `ModalFooter` | `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions` |

- [ ] **Step E: Убрать `cn()` / `tailwind-merge`**

- Если `cn` используется только для Tailwind классов — удалить импорт и выражение.
- Если `cn` нужен для условных BEM-модификаторов — заменить на `clsx` напрямую:
```tsx
import clsx from 'clsx';
<div className={clsx('lumio-card', isActive && 'lumio-card--active')} />
```

- [ ] **Step F: Обновить соответствующий тест (если есть)**

Найти тест:
```bash
ls frontend/<path>/<file>.test.tsx 2>/dev/null
```

Если есть, заменить селекторы:
- `getByTestId('hero-...')` → `getByRole('button'|'dialog'|'textbox'|'checkbox'|...)`
- Ассершены по классам `class='heroui-...'` → по `role` или `data-testid`
- Проверки видимости `isOpen` → проверка через `queryByRole('dialog')`

- [ ] **Step G: Прогнать type-check и тест файла**

```bash
cd frontend
npm run type-check
npm test -- <path>/<file>.test.tsx    # если тест есть
```

Expected: PASS.

- [ ] **Step H: Commit**

```bash
git add frontend/<path>/<file>.tsx frontend/<path>/<file>.test.tsx
git commit -m "refactor(frontend): migrate <file> to MUI"
```

### End-of-stage verification

По окончании каждого этапа 2-9 выполнять:

```bash
cd frontend
npm run type-check
npm run lint:check
npm test
npm run build
grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify" app/<stage-path> --include="*.tsx"
```

Последний grep должен вернуть 0 совпадений в пределах путей этапа.

---

## Этап 2: Общие компоненты (`app/components/*` кроме `ui/`)

**PR-title:** `refactor(frontend): step 2 — migrate shared components`

### Task 2.1: Инвентаризация файлов

- [ ] **Step 1: Получить список файлов этапа**

```bash
cd frontend
find app/components -maxdepth 2 -name "*.tsx" ! -path "app/components/ui/*" | sort
```

Expected files (неполный список — реальный определяется выводом команды):
- `Navigation.tsx`, `AppChrome.tsx`, `Breadcrumbs.tsx`, `GlobalBreadcrumbs.tsx`, `DynamicPageTitle.tsx`, `GlobalNavHeight.tsx`
- `ConfirmModal.tsx`, `ChangelogModal.tsx`, `PDFPreviewModal.tsx`
- `CustomDatePicker.tsx`
- `NotificationDropdown.tsx`, `AuthLanguageSwitcher.tsx`
- `BankLogoAvatar.tsx`, `BrandLogoAvatar.tsx`, `LogoAvatar.tsx`
- `DocumentTypeIcon.tsx`, `PDFThumbnail.tsx`
- `BaseStorageWidget.tsx`, `DropboxStorageWidget.tsx`, `GoogleDriveStorageWidget.tsx`, `GoogleSheetsPickerButton.tsx`, `GoogleAuthButton.tsx`
- `TransactionsView.tsx` (если здесь)
- `dashboard/*.tsx`, `side-panel/*.tsx`

### Task 2.2: Миграция Navigation.tsx (эталонный файл)

**Files:**
- Modify: `frontend/app/components/Navigation.tsx`

- [ ] **Step 1-8: Применить per-file migration checklist** (Steps A-H из раздела «Шаблон миграции файла»)

Особенности:
- Navigation использует `DropdownMenu` из `@heroui/react` для workspace switcher → заменить на `Menu` с `anchorEl` state.
- Иконки `@iconify/react` → `lucide-react`.
- Использование `Chip` для бейджей → `@mui/material/Chip`.
- Skeleton при загрузке → `@mui/material/Skeleton`.
- Создать BEM-блок `lumio-navigation` в `app/styles/blocks/lumio-navigation.css` для сложного layout (если есть).

- [ ] **Step 9: Commit**

### Task 2.3-2.N: Миграция остальных компонентов

- [ ] Для **каждого** файла из списка Task 2.1 применить per-file migration checklist (Steps A-H).

Особые случаи, требующие внимания:

- **`CustomDatePicker.tsx`**: переписать на `DatePicker` из `@mui/x-date-pickers`, прогнать через локали en/ru/kk, сверить, что `date-fns/locale` подключаются корректно через `LocalizationProvider`.
- **`ConfirmModal.tsx`** и **`ChangelogModal.tsx`**: использовать общий `modal-shell` из этапа 1, либо прямо `Dialog`.
- **`NotificationDropdown.tsx`**: переписать на `Menu` + `List` + `ListItem`. Обновить `NotificationDropdown.test.tsx`.
- **`PDFPreviewModal.tsx`**: `Dialog` `fullScreen` или `maxWidth="lg"`. Обновить `PDFPreviewModal.test.tsx`.
- **`BankLogoAvatar.tsx`**, **`LogoAvatar.tsx`**, **`BrandLogoAvatar.tsx`**: использовать `@mui/material/Avatar` — **сохранить круглую форму**, `sx={{ borderRadius: '50%' }}`. Обновить `BankLogoAvatar.test.tsx`.
- **`AuthLanguageSwitcher.tsx`**: `Select` или `Menu`. Обновить `AuthLanguageSwitcher.test.tsx`.
- **`dashboard/ExportDropdown.tsx`**: `Menu` + `MenuItem`. Обновить `ExportDropdown.test.tsx`.
- **`side-panel/*`**: переписать на `Drawer` из `@mui/material`.

### Task 2.N+1: End-of-stage verification и PR

- [ ] **Step 1: Verification**

```bash
cd frontend
npm run type-check
npm run lint:check
npm test
npm run build
grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify\|@mui/icons-material" app/components --include="*.tsx" | grep -v "app/components/ui/"
```

Expected: последний grep возвращает 0 строк.

- [ ] **Step 2: Push и создать PR**

```bash
git push -u origin HEAD
gh pr create --title "refactor(frontend): step 2 — migrate shared components" --body "..."
```

---

## Этап 3: Auth + Admin

**PR-title:** `refactor(frontend): step 3 — migrate auth and admin`

### Task 3.1: Инвентаризация

- [ ] **Step 1: Список файлов этапа**

```bash
cd frontend
find 'app/(auth)' 'app/admin' -name "*.tsx" 2>/dev/null | sort
```

### Task 3.2-3.N: Миграция файлов

- [ ] Для **каждого** `.tsx` файла из Task 3.1 применить per-file migration checklist.

Точки внимания:
- `app/(auth)/AuthLayout.tsx`, `BuildingBackground.tsx`, `MoneyAnimation.tsx` — возможно, используют `framer-motion` — остаётся.
- `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` — формы, использовать `TextField` + `Button`.
- `app/admin/*` — вероятно, таблица пользователей: `Table` из `@mui/material` или `@tanstack/react-table` с MUI-стилями.

### Task 3.N+1: Verification и PR

- [ ] **Step 1: Verification** (стандартный блок)
- [ ] **Step 2: PR**

---

## Этап 4: Statements

**PR-title:** `refactor(frontend): step 4 — migrate statements feature`

### Task 4.1: Инвентаризация

- [ ] **Step 1: Список файлов этапа**

```bash
cd frontend
find 'app/(main)/statements' -name "*.tsx" | sort
```

### Task 4.2-4.N: Миграция

Приоритетные файлы (эталоны):
- `StatementsListItem.tsx` — сложный row с BEM (`lumio-statement-row`).
- `UnapprovedCashView.tsx`
- `[id]/edit/page.tsx`, `[id]/edit/ParsingWarningsPanel.tsx` (+ тест)
- `components/filters/DateFilterDropdown.tsx` (+ тест) — использует `@mui/x-date-pickers`.
- Остальные файлы внутри `statements/` — по списку Task 4.1.

- [ ] Для **каждого** файла применить per-file migration checklist.

### Task 4.N+1: Verification и PR

- [ ] Если этап слишком большой, разбить на 4a (список+фильтры) и 4b (detail/edit) — два PR.

---

## Этап 5: Transactions + Categories + Classification

**PR-title:** `refactor(frontend): step 5 — migrate transactions and categories`

### Task 5.1: Инвентаризация

```bash
cd frontend
find 'app/(main)/transactions' app/transactions app/categories -name "*.tsx" 2>/dev/null | sort
```

### Task 5.2-5.N: Миграция файлов по per-file checklist

### Task 5.N+1: Verification и PR

---

## Этап 6: Custom tables

**PR-title:** `refactor(frontend): step 6 — migrate custom-tables feature`

### Task 6.1: Инвентаризация

```bash
cd frontend
find 'app/(main)/custom-tables' -name "*.tsx" | sort
```

### Task 6.2-6.N: Миграция

Особенности:
- `EditableDateCell.tsx` — переписать на `DatePicker` из `@mui/x-date-pickers` с `slotProps={{ textField: { size: 'small' } }}`.
- Остальные editable cells (text, select, checkbox) — на MUI-примитивы.
- `page.tsx` — TanStack Table остаётся, меняются только header/toolbar/pagination.
- Обновить `page.test.tsx`.

### Task 6.N+1: Verification и PR

---

## Этап 7: Reports

**PR-title:** `refactor(frontend): step 7 — migrate reports feature`

### Task 7.1-7.N: Инвентаризация и миграция

```bash
cd frontend
find 'app/(main)/reports' app/reports -name "*.tsx" 2>/dev/null | sort
```

ECharts и `echarts-for-react` не трогаем — меняем только wrapper-панели и фильтры.

### Task 7.N+1: Verification и PR

---

## Этап 8: Workspaces + Settings + Integrations

**PR-title:** `refactor(frontend): step 8 — migrate workspaces, settings, integrations`

### Task 8.1: Инвентаризация

```bash
cd frontend
find 'app/(main)/workspaces' app/settings app/integrations -name "*.tsx" 2>/dev/null | sort
```

### Task 8.2-8.N: Миграция

Особые случаи:
- `WorkspaceMembersView.tsx` — таблица членов, `@mui/material/Table`.
- `CreateWorkspaceModal.tsx` (+ тест) — `Dialog` + `TextField`. Обновить `CreateWorkspaceModal.test.tsx`.

### Task 8.N+1: Verification и PR

---

## Этап 9: Storage + Data-entry

**PR-title:** `refactor(frontend): step 9 — migrate storage and data-entry`

### Task 9.1: Инвентаризация

```bash
cd frontend
find app/storage app/data-entry -name "*.tsx" 2>/dev/null | sort
```

### Task 9.2-9.N: Миграция

Особые случаи:
- `app/storage/receipts/[id]/page.tsx` (+ тест) — обновить `page.test.tsx`.

### Task 9.N+1: Financial end-of-stage check

```bash
cd frontend
# Должны остаться только app/(onboarding), app/hero.ts, app/mantine-theme.ts, storybook-static
grep -rn "@heroui\|@radix-ui\|@mantine" app --include="*.tsx" --include="*.ts" \
  | grep -v "app/hero.ts" \
  | grep -v "app/mantine-theme.ts" \
  | grep -v "app/providers.tsx" \
  | grep -v "storybook-static"
```

Expected: 0 строк. Все `.tsx` файлы мигрированы. Оставшиеся упоминания — только в файлах, которые будут удалены в этапе 10.

- [ ] Если grep вернул непустой результат, добавить пропущенные файлы в текущий этап или в хвост этапа 9.

### Task 9.N+2: PR

---

## Этап 10: Финальная очистка

**PR-title:** `refactor(frontend): step 10 — remove legacy UI dependencies`

### Task 10.1: Финальный grep-аудит

- [ ] **Step 1: Проверить, что в `app/` нет ни одного упоминания удаляемых библиотек**

```bash
cd frontend
grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify/react\|@mui/icons-material" app --include="*.ts" --include="*.tsx" \
  | grep -v "app/hero.ts" \
  | grep -v "app/mantine-theme.ts" \
  | grep -v "app/providers.tsx"
```

Expected: 0 строк. Если есть остатки — вернуться к этапу, где их следовало мигрировать, и не начинать этап 10.

- [ ] **Step 2: Проверить отсутствие Tailwind-классов**

```bash
cd frontend
grep -rEn "className=.*\b(rounded-[a-z0-9]+|flex|gap-[0-9]|p-[0-9]|text-[a-z]+)\b" app --include="*.tsx" | head -20
```

Это эвристика — если есть существенные остатки Tailwind утилит, их нужно убрать в этапах 2-9 перед началом этапа 10.

### Task 10.2: Удаление HeroUIProvider и MantineProvider из providers.tsx

**Files:**
- Modify: `frontend/app/providers.tsx`

- [ ] **Step 1: Убрать импорты**

Удалить строки:
```ts
import { HeroUIProvider } from '@heroui/react';
import { MantineProvider } from '@mantine/core';
import { mantineCssVariablesResolver, mantineTheme } from './mantine-theme';
```

- [ ] **Step 2: Убрать обёртки из JSX**

Заменить:
```tsx
<HeroUIProvider>
  <IntlayerProviderContent ...>
    ...
    <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssVariablesResolver} forceColorScheme={colorScheme} defaultColorScheme="light">
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          ...
        </LocalizationProvider>
      </ThemeProvider>
    </MantineProvider>
    ...
  </IntlayerProviderContent>
</HeroUIProvider>
```

на:
```tsx
<IntlayerProviderContent ...>
  ...
  <ThemeProvider theme={muiTheme}>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      ...
    </LocalizationProvider>
  </ThemeProvider>
  ...
</IntlayerProviderContent>
```

Переменные `colorScheme` и подобные, ставшие неиспользуемыми, удалить.

- [ ] **Step 3: Удалить переменную colorScheme, если она больше нигде не нужна**

- [ ] **Step 4: Обновить `app/providers.test.tsx`**

Убрать проверки на наличие `HeroUIProvider`/`MantineProvider` в дереве рендера, если они есть.

- [ ] **Step 5: Прогнать тесты**

```bash
cd frontend
npm test -- app/providers.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/providers.tsx frontend/app/providers.test.tsx
git commit -m "refactor(frontend): remove HeroUIProvider and MantineProvider"
```

### Task 10.3: Удаление файлов hero.ts и mantine-theme.ts

**Files:**
- Delete: `frontend/app/hero.ts`
- Delete: `frontend/app/mantine-theme.ts`

- [ ] **Step 1: Проверить, что на эти файлы нет ссылок кроме providers.tsx (уже удалено) и theme.ts**

```bash
cd frontend
grep -rn "from.*hero'\|from.*mantine-theme\|getAppSurfaceTokens" app --include="*.ts" --include="*.tsx"
```

Если `theme.ts` использует `getAppSurfaceTokens` из `mantine-theme.ts`, заменить эту функцию на инлайн-значения в `theme.ts` (взять константы напрямую).

- [ ] **Step 2: Инлайнить использование в theme.ts**

Открыть `app/theme.ts`, найти `import { getAppSurfaceTokens } from './mantine-theme';` — если есть, прочитать `mantine-theme.ts`, перенести значения напрямую в `theme.ts` как константы и убрать импорт.

- [ ] **Step 3: Удалить файлы**

```bash
rm frontend/app/hero.ts
rm frontend/app/mantine-theme.ts
```

- [ ] **Step 4: Type-check и build**

```bash
cd frontend
npm run type-check
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -u frontend/app/hero.ts frontend/app/mantine-theme.ts frontend/app/theme.ts
git commit -m "refactor(frontend): delete hero.ts and mantine-theme.ts"
```

### Task 10.4: Чистка globals.css от Tailwind

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Удалить Tailwind-директивы**

Удалить из `app/globals.css` строки:
```css
@import "tailwindcss";
@plugin "./hero.ts";
@source "../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}";
@custom-variant dark (&:where(.dark, .dark *));
@theme { ... }
@media (prefers-color-scheme: dark) { @theme { ... } }
```

Также удалить CSS-переменные, которые больше не нужны (Tailwind shadcn-style):
```css
--background, --foreground, --radius*, --primary, --primary-hover, ...
```
— если они дублируются с `--lumio-*` из `tokens.css`. Если какие-то компоненты ещё ссылаются на `var(--foreground)` и т.п. — оставить, но перенести в `tokens.css`.

Оставить:
```css
@import url("https://fonts.googleapis.com/...");
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./tours/tour-theme.css";
/* + все @import для lumio-* блоков из app/styles/blocks/ */
```

- [ ] **Step 2: Добавить импорты всех созданных BEM-блоков**

```bash
cd frontend
ls app/styles/blocks/*.css | while read f; do echo "@import \"./styles/blocks/$(basename $f)\";"; done
```

Вставить вывод в конец секции импортов `globals.css`.

- [ ] **Step 3: Build**

```bash
cd frontend
npm run build
```

Expected: успешная сборка, визуально тема не ломается.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css
git commit -m "refactor(frontend): purge Tailwind directives from globals.css"
```

### Task 10.5: Удаление tailwind и postcss конфигов

**Files:**
- Delete: `frontend/tailwind.config.ts` / `.js` (если есть)
- Delete: `frontend/postcss.config.mjs` / `.js` (если используется только для Tailwind)

- [ ] **Step 1: Проверить существование**

```bash
cd frontend
ls tailwind.config.* postcss.config.* 2>/dev/null
```

- [ ] **Step 2: Прочитать postcss.config**

Если он подключает только `tailwindcss` и `autoprefixer` — его можно удалить (Next.js 16 имеет встроенный PostCSS). Если подключает что-то ещё нужное (например, кастомные плагины) — удалить только tailwind-плагин.

- [ ] **Step 3: Удалить**

```bash
rm -f frontend/tailwind.config.ts frontend/tailwind.config.js
# postcss.config удалять только если использовал только tailwind:
# rm frontend/postcss.config.mjs
```

- [ ] **Step 4: Build**

```bash
cd frontend
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "refactor(frontend): remove tailwind and postcss configs"
```

### Task 10.6: Удаление устаревших npm зависимостей

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Удалить зависимости одним махом**

```bash
cd frontend
npm uninstall \
  @heroui/button @heroui/calendar @heroui/chip @heroui/date-picker \
  @heroui/modal @heroui/react @heroui/system @heroui/theme @heroui/tooltip \
  @radix-ui/react-dropdown-menu \
  @mantine/core @mantine/hooks \
  @iconify/react \
  @mui/icons-material \
  tailwindcss tailwind-merge \
  react-select
```

- [ ] **Step 2: Проверить, что `next-themes` всё ещё нужен**

```bash
cd frontend
grep -rn "next-themes" app --include="*.ts" --include="*.tsx"
```

Если `useTheme` из `next-themes` ещё где-то используется (напр. `providers.tsx` для `resolvedTheme`) — оставить. Иначе удалить: `npm uninstall next-themes`.

- [ ] **Step 3: Проверить, что `tw-animate-css` не остался**

```bash
cd frontend
grep -rn "tw-animate" app package.json 2>/dev/null
```

Если есть в `package.json` — `npm uninstall tw-animate-css`.

- [ ] **Step 4: Прогнать всё**

```bash
cd frontend
rm -rf node_modules .next
npm ci
npm run type-check
npm run lint:check
npm test
npm run build
```

Expected: всё зелёное.

- [ ] **Step 5: Сравнить размер бандла с baseline**

```bash
cd frontend
du -sh .next/static
diff <(head -20 ../docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt | tail -5) <(du -sh .next/static)
```

Expected: `.next/static` не больше, чем baseline (ожидаемо — меньше).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "refactor(frontend): remove legacy UI dependencies"
```

### Task 10.7: Удаление storybook-static из репозитория

**Files:**
- Delete: `frontend/storybook-static/`
- Modify: `frontend/.gitignore`

- [ ] **Step 1: Добавить в .gitignore**

```bash
cd frontend
echo "storybook-static/" >> .gitignore
```

Проверить, что такая строка не дублируется.

- [ ] **Step 2: Удалить директорию из индекса git**

```bash
cd frontend
git rm -r --cached storybook-static 2>/dev/null || true
rm -rf storybook-static
```

- [ ] **Step 3: Commit**

```bash
git add frontend/.gitignore
git add -u frontend/storybook-static 2>/dev/null || true
git commit -m "chore(frontend): stop tracking storybook-static build artifacts"
```

### Task 10.8: Финальная верификация

- [ ] **Step 1: Полный прогон**

```bash
cd frontend
npm run type-check
npm run lint:check
npm test
npm run build
```

Expected: всё зелёное.

- [ ] **Step 2: Финальный grep — ни одного остатка**

```bash
cd frontend
{
  echo "=== @heroui ==="
  grep -rn "@heroui" app --include="*.ts" --include="*.tsx"
  echo "=== @radix-ui ==="
  grep -rn "@radix-ui" app --include="*.ts" --include="*.tsx"
  echo "=== @mantine ==="
  grep -rn "@mantine" app --include="*.ts" --include="*.tsx"
  echo "=== @iconify ==="
  grep -rn "@iconify" app --include="*.ts" --include="*.tsx"
  echo "=== @mui/icons-material ==="
  grep -rn "@mui/icons-material" app --include="*.ts" --include="*.tsx"
  echo "=== tailwind in package.json ==="
  grep "tailwind\|@heroui\|@radix-ui\|@mantine\|@iconify/react\|@mui/icons-material" package.json
} | tee /tmp/final-audit.txt
```

Expected: все секции пустые (только заголовки без результатов).

- [ ] **Step 3: Smoke-тест в dev-режиме**

```bash
cd frontend
npm run dev &
DEV_PID=$!
sleep 15
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
kill $DEV_PID
```

Expected: HTTP 200.

- [ ] **Step 4: Push и PR**

```bash
git push -u origin HEAD
gh pr create --title "refactor(frontend): step 10 — remove legacy UI dependencies" --body "$(cat <<'EOF'
## Summary
Final step of MUI/BEM refactor:
- Removes HeroUIProvider and MantineProvider from providers.tsx
- Deletes app/hero.ts and app/mantine-theme.ts
- Purges Tailwind directives from globals.css
- Removes tailwind/postcss configs
- Uninstalls: @heroui/*, @radix-ui/*, @mantine/*, @iconify/react, @mui/icons-material, tailwindcss, tailwind-merge, react-select, tw-animate-css
- Stops tracking storybook-static/ build artifacts

## Test plan
- [x] npm run type-check
- [x] npm run lint:check
- [x] npm test
- [x] npm run build
- [x] Final grep audit — 0 legacy references
- [x] Smoke test dev server

## Bundle size comparison
Baseline: see docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt
Current: < baseline ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Финальные критерии успеха всего рефакторинга

После мержа всех 10 PR должны выполняться:

1. `grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify/react\|@mui/icons-material" frontend/app` → 0 строк.
2. `frontend/package.json` не содержит ни одной из удалённых зависимостей.
3. `frontend/app/providers.tsx` содержит только `ThemeProvider` (MUI) + `LocalizationProvider` как UI-провайдеры (плюс проектные `WorkspaceProvider` и др.).
4. `npm test` — зелёные во frontend.
5. `npm run type-check` — 0 ошибок.
6. `npm run lint:check` — 0 ошибок.
7. `npm run build` — успешная сборка.
8. Визуально: прямоугольные элементы имеют `border-radius: 0`, круглые (Avatar, Switch, CircularProgress) остаются круглыми.
9. Размер production-бандла ≤ baseline из `docs/superpowers/plans/2026-04-11-mui-bem-refactor-audit.txt`.
10. Все BEM-блоки живут в `frontend/app/styles/blocks/lumio-*.css`, подключены через `globals.css`.
