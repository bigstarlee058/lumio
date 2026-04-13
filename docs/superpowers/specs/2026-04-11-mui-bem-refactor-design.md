# MUI + BEM Frontend Refactor — Design Spec

**Date:** 2026-04-11
**Status:** Approved
**Scope:** `frontend/` — полная замена UI-стека на MUI + BEM CSS

---

## 1. Цели и нецели

### Цели

- Удалить из проекта зависимости: `@heroui/*`, `@radix-ui/*`, `@mantine/*`, `tailwindcss`, `tailwind-merge`, `tw-animate-css` (если есть), `@iconify/react`, `@mui/icons-material`, `react-select` (если используется).
- Все UI-компоненты построены исключительно на `@mui/material` + `@mui/x-date-pickers`.
- Все кастомные стили — в отдельных `.css`-файлах по методологии BEM с префиксом `lumio-`.
- Все `border-radius` на прямоугольных элементах = `0`. Круглые по природе элементы (Avatar, Switch, CircularProgress, индикаторы-точки) остаются круглыми.
- Единый набор дизайн-токенов через CSS-переменные + расширенная MUI-тема.
- Иконки: `lucide-react` как единственная библиотека.

### Нецели

- Изменения в бизнес-логике, API-клиентах, хуках, контекстах, роутинге.
- Переписывание графиков (ECharts остаётся как есть).
- Замена DnD (`@dnd-kit` остаётся).
- Изменения в i18n-контенте.
- Улучшения дизайна сверх того, что требует смена библиотеки — только перенос 1:1 с уплощением углов.

---

## 2. Baseline аудит

Перед началом (этап 0) фиксируется снимок текущего состояния:

```bash
cd frontend
grep -rn "@heroui" app --include="*.ts" --include="*.tsx" -l | wc -l     # ~278
grep -rn "@radix-ui" app --include="*.ts" --include="*.tsx" -l | wc -l   # ~12
grep -rn "@mantine" app --include="*.ts" --include="*.tsx" -l | wc -l    # ~8
```

Текущие UI-зависимости в `package.json` (удаляем):
- `@heroui/button`, `@heroui/calendar`, `@heroui/chip`, `@heroui/date-picker`, `@heroui/modal`, `@heroui/react`, `@heroui/system`, `@heroui/theme`, `@heroui/tooltip`
- `@radix-ui/react-dropdown-menu`
- `@mantine/core`, `@mantine/hooks`
- `@iconify/react`
- `@mui/icons-material`
- `tailwindcss`, `tailwind-merge`, `tw-animate-css` (если присутствует)
- `react-select` (если используется)
- `next-themes` (оценить после миграции темы — может остаться для dark mode toggle)

Остаются:
- `@mui/material`, `@emotion/react`, `@emotion/styled`
- `lucide-react` (единственная библиотека иконок)
- `framer-motion` (совместим с MUI)
- `@dnd-kit/*`, `@tanstack/react-table`, `@tanstack/react-virtual`
- `echarts`, `echarts-for-react`
- `date-fns` (peer-зависимость для `@mui/x-date-pickers`)

Добавляется:
- `@mui/x-date-pickers`

---

## 3. Архитектура CSS и темы

### Файловая структура

```
frontend/app/
├── theme.ts                    # createAppTheme — расширяем overrides
├── styles/
│   ├── tokens.css              # CSS-переменные: цвета, отступы, типографика, z-index
│   ├── base.css                # reset, typography base, утилиты u-*
│   └── blocks/
│       ├── lumio-card.css
│       ├── lumio-drawer.css
│       ├── lumio-filter-bar.css
│       ├── lumio-page-header.css
│       ├── lumio-empty-state.css
│       └── ...                 # по одному файлу на BEM-блок
├── globals.css                 # @import tokens.css + base.css + block-файлы
└── providers.tsx               # убираем HeroUIProvider + MantineProvider
```

### Правила BEM

- **Блок:** `lumio-<block>` (`lumio-card`, `lumio-statement-row`).
- **Элемент:** `lumio-<block>__<element>` (`lumio-card__header`).
- **Модификатор:** `lumio-<block>--<modifier>` или `lumio-<block>__<element>--<modifier>`.
- Префикс `lumio-` обязателен — защищает от коллизий с MUI classNames (`Mui-*`).
- Вложенность селекторов внутри блока максимум 2 уровня.
- Никаких глобальных селекторов по тегам внутри блока: `.lumio-card h2` → `.lumio-card__title`.
- Утилиты вне БЭМ-блоков имеют префикс `u-` (`u-visually-hidden`, `u-text-center`) и живут в `base.css`.

### Разделение ответственности MUI vs BEM

- **MUI (`sx`, `styled`, theme overrides)** — компонентная логика: состояния `disabled/hover/focus`, темизация через palette, size-варианты, типографика через `Typography`.
- **BEM/CSS** — layout блоков страниц, композиция нескольких MUI-компонентов, кастомные блоки, которых нет в MUI.
- Правило: один MUI-компонент со стилями → `sx`. Композиция + layout → новый BEM-блок.

### Расширение темы (`app/theme.ts`)

```ts
shape: { borderRadius: 0 },
components: {
  MuiButton:        { styleOverrides: { root: { borderRadius: 0, textTransform: 'none' } } },
  MuiCard:          { styleOverrides: { root: { borderRadius: 0 } } },
  MuiPaper:         { styleOverrides: { rounded: { borderRadius: 0 } } },
  MuiDialog:        { styleOverrides: { paper: { borderRadius: 0 } } },
  MuiTextField:     { defaultProps: { variant: 'outlined' } },
  MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 0 } } },
  MuiChip:          { styleOverrides: { root: { borderRadius: 0 } } },
  MuiAlert:         { styleOverrides: { root: { borderRadius: 0 } } },
  MuiMenu:          { styleOverrides: { paper: { borderRadius: 0 } } },
  MuiPopover:       { styleOverrides: { paper: { borderRadius: 0 } } },
  MuiTooltip:       { styleOverrides: { tooltip: { borderRadius: 0 } } },
  // Avatar, Switch, CircularProgress — НЕ трогаем (остаются круглыми)
}
```

---

## 4. Маппинг компонентов

| HeroUI / shadcn / Radix / Mantine | → MUI |
|---|---|
| `@heroui/button`, `components/ui/button` | `@mui/material/Button` |
| `@heroui/modal`, `components/ui/modal-shell` | `@mui/material/Dialog` |
| `@heroui/chip`, `components/ui/badge` | `@mui/material/Chip` |
| `@heroui/tooltip` | `@mui/material/Tooltip` |
| `@heroui/date-picker`, `@heroui/calendar` | `@mui/x-date-pickers` |
| `components/ui/input` | `@mui/material/TextField` |
| `components/ui/select`, `react-select` | `@mui/material/Select` + `Autocomplete` для поиска |
| `components/ui/checkbox` | `@mui/material/Checkbox` |
| `components/ui/dropdown-menu`, `@radix-ui/react-dropdown-menu` | `@mui/material/Menu` |
| `components/ui/card` | `@mui/material/Card` (`variant="outlined"`) |
| `components/ui/separator` | `@mui/material/Divider` |
| `components/ui/spinner` | `@mui/material/CircularProgress` |
| `components/ui/alert` | `@mui/material/Alert` |
| `components/ui/pagination` | `@mui/material/Pagination` |
| `@heroui/react` (Accordion, Tabs, Switch, Table, Popover, Autocomplete и т.д.) | соответствующие `@mui/material` компоненты |
| `@mantine/core` | соответствующие `@mui/material` компоненты |
| `@iconify/react`, `@mui/icons-material` | `lucide-react` |
| HeroUI props: `isIconOnly` | MUI `IconButton` |
| HeroUI props: `startContent` / `endContent` | MUI `startIcon` / `endIcon` |
| HeroUI props: `variant="flat"` | MUI `variant="text"` или `"outlined"` в зависимости от контекста |

### Date picker

- Добавляется `@mui/x-date-pickers`.
- `LocalizationProvider` с `AdapterDateFns` оборачивает приложение (в `providers.tsx` на этапе 0).
- `date-fns` уже в `package.json` — не требует отдельной установки.
- `CustomDatePicker` в `app/components/CustomDatePicker.tsx` переписывается на этапе 2.

---

## 5. Порядок миграции по этапам

Каждый этап = отдельный PR. Мержится в `main` самостоятельно. Между этапами HeroUI и MUI сосуществуют — оба провайдера уже подключены в `providers.tsx`.

### Этап 0. Подготовка инфраструктуры (1 PR)
- Добавить `@mui/x-date-pickers` в `package.json`.
- Создать `app/styles/tokens.css`, `app/styles/base.css`, `app/styles/blocks/.gitkeep`.
- Расширить `app/theme.ts` overrides для всех MUI-компонентов с `borderRadius: 0`.
- Обернуть приложение в `LocalizationProvider` с `AdapterDateFns`.
- Зафиксировать baseline аудит (grep) в `docs/superpowers/specs/2026-04-11-mui-bem-refactor-audit.txt`.
- Ничего не удалять, ничего не мигрировать.
- **Verification:** `npm run build`, `npm run type-check`, `npm run lint:check` — зелёные.

### Этап 1. UI-примитивы (`app/components/ui/*`) (1 PR)
- Переписать все ~21 файл из `components/ui/`: `button`, `input`, `select`, `checkbox`, `card`, `modal-shell`, `drawer-shell`, `dropdown-menu`, `pagination`, `badge`, `alert`, `spinner`, `separator`, `label`, `filter-chip-button`, `detail-action-button`, `CurrencyDisplayToggle`, `CurrencyFilterDropdown`.
- Каждый компонент становится тонкой обёрткой над MUI, сохраняет текущий интерфейс пропсов (чтобы не ломать 278 потребителей).
- Обновить тесты `modal-shell.test.tsx`, `pagination.test.tsx`.
- **Verification:** тесты зелёные, `build` успешен.

### Этап 2. Общие компоненты (`app/components/*`) (1 PR)
- Все файлы в `app/components/` кроме `ui/`: `Navigation`, `AppChrome`, `Breadcrumbs`, `ConfirmModal`, `CustomDatePicker`, `PDFPreviewModal`, `NotificationDropdown`, `GoogleAuthButton`, `LogoAvatar` и т.д.
- Дочерние директории: `dashboard/`, `side-panel/`.
- `CustomDatePicker` переезжает на `@mui/x-date-pickers`, прогоняется через все 3 локали (en/ru/kk).
- Обновить тесты общих компонентов.

### Этап 3. Auth + admin (1 PR)
- `app/(auth)/*` — login, register, reset password.
- `app/admin/*` — admin dashboard.
- Проверка качества миграции на простом срезе.

### Этап 4. Statements (1-2 PR)
- `app/(main)/statements/*` — список, upload, edit, `ParsingWarningsPanel`, `StatementsListItem`, `UnapprovedCashView`, `DateFilterDropdown`.
- При необходимости разбивается на (4a) список + фильтры, (4b) детальные экраны.

### Этап 5. Transactions + categories + classification (1 PR)
- `app/(main)/transactions/*`, `app/categories/*`, всё, что связано с категоризацией.

### Этап 6. Custom tables (1 PR)
- `app/(main)/custom-tables/*` — TanStack Table + editable cells.

### Этап 7. Reports + charts (1 PR)
- `app/reports/*` — ECharts не трогаем, меняются только обёрточные панели и фильтры.

### Этап 8. Workspaces + settings + integrations (1 PR)
- `app/(main)/workspaces/*`, `app/settings/*`, `app/integrations/*`.

### Этап 9. Storage + data-entry (1 PR)
- `app/storage/*`, `app/data-entry/*`.

### Этап 10. Очистка и удаление зависимостей (1 PR, финальный)
- `grep -r "@heroui\|@radix-ui\|@mantine\|tailwind\|@iconify\|@mui/icons-material" frontend/app` → 0 совпадений.
- Убрать из `package.json`: `@heroui/*`, `@radix-ui/*`, `@mantine/*`, `tailwindcss`, `tailwind-merge`, `@iconify/react`, `@mui/icons-material`, `tw-animate-css` (если есть), `react-select` (если был), опционально `next-themes`.
- Удалить `app/hero.ts`, `app/mantine-theme.ts`, `tailwind.config.*`, `postcss.config.*` (если только для Tailwind).
- Убрать `HeroUIProvider` и `MantineProvider` из `providers.tsx`.
- Почистить `globals.css` от Tailwind директив.
- Удалить `storybook-static/` из репо (артефакт сборки).
- Обновить `providers.test.tsx`.
- **Verification:** `build`, `type-check`, `lint:check`, `test` — всё зелёное. Сравнение размера production-бандла с baseline (ожидаемо — меньше).

---

## 6. Процесс миграции одного файла (чек-лист)

Применяется к каждому `.tsx`-файлу на этапах 1-9:

1. Прочитать файл целиком, понять используемые компоненты.
2. Заменить импорты по таблице маппинга (раздел 4).
3. Заменить иконки `@iconify/react`, `@mui/icons-material` → `lucide-react`.
4. Заменить Tailwind-классы в `className=`:
   - Утилиты (`flex`, `gap-4`, `p-4`, `mt-2`, `w-full`, `text-sm`, `text-gray-500`) → `sx={{ ... }}` (если локально) или BEM-класс (если композиция).
   - `rounded-*` на прямоугольных элементах — удаляются.
   - `rounded-full` на аватарах/switch — остаётся как `borderRadius: '50%'` в `sx` или в BEM.
5. Выбор между `sx` и BEM: одиночный компонент → `sx`, композиция → новый BEM-блок `lumio-<name>` в `app/styles/blocks/lumio-<name>.css`, подключается в `globals.css`.
6. Убрать `clsx + tailwind-merge` combo. `clsx` допустимо оставить для условного BEM-модификатора.
7. Корректно замаппить HeroUI-специфичные пропсы (`isIconOnly`, `variant="flat"`, `startContent`/`endContent`) на MUI-аналоги.
8. Обновить тесты файла (селекторы HeroUI → MUI: `role="dialog"`, `role="button"`, `data-testid`).
9. Локально прогнать `type-check` + тесты файла.
10. Мелкий коммит `refactor(frontend): migrate <file> to MUI`.

### Запрещённые паттерны

- Смешивать MUI и HeroUI импорты в одном файле. Файл либо полностью на MUI, либо ещё не мигрирован.
- Импортировать из `components/ui/*` в этапах ≥2 до завершения этапа 1.
- Оставлять Tailwind-классы «на потом». Файл мигрируется целиком за один проход.
- Создавать новые shadcn-style файлы в `components/ui/*`. Новые примитивы — либо прямое использование MUI, либо новый BEM-блок.

### Verification в конце каждого этапа

```bash
cd frontend
npm run type-check
npm run lint:check
npm test -- <changed paths>
npm run build
grep -rn "@heroui\|@radix-ui\|@mantine\|tailwind\|rounded-[^0]" app/<etap-path> | wc -l  # 0
```

---

## 7. Тесты и Storybook

- **Тесты** обновляются в том же PR, что и компонент. Селекторы HeroUI (`data-slot`, `data-*`) заменяются на MUI (`role="dialog"`, `role="button"`, `data-testid`). Запрещено мержить этап с красными тестами.
- **Storybook** — истории обновляются параллельно с компонентами в тех же PR. `storybook-static/` удаляется в этапе 10 (артефакт сборки, не должен храниться в репо).

---

## 8. Риски и митигации

| Риск | Вероятность | Impact | Митигация |
|---|---|---|---|
| Промежуточное состояние между этапами: визуальные дефекты, старые HeroUI рядом с новыми MUI | Высокая | Низкий | Принимаем как норму. Оба UI-кита работают, логика не ломается. В `main` мержим только после `build` + `test`. |
| Regressions в тестах из-за разных селекторов | Высокая | Средний | Тесты обновляются в том же PR, что и компонент. Запрещено мержить с красными тестами. |
| Непокрытые тестами UI-регрессии (layout, отступы) | Средняя | Средний | После каждого этапа — ручная smoke-проверка ключевых экранов. Storybook-истории обновляются в том же PR. |
| Раздувание bundle из-за MUI рядом с HeroUI | Низкая | Низкий | MUI уже в deps. Промежуточный рост bundle — норма, финально — падение. Зафиксировать baseline в этапе 0, сравнить в этапе 10. |
| Конфликты с параллельной работой на тех же файлах | Высокая | Высокий | Этапы мержатся быстро (1-3 дня). Между этапами `rebase on main`. Авторы крупных feature-веток уведомляются до начала этапа, затрагивающего их файлы. |
| `@mui/x-date-pickers` требует `LocalizationProvider` + `date-fns` adapter | Средняя | Низкий | `date-fns` уже в deps. В этапе 0 оборачиваем приложение в `LocalizationProvider`. |
| `CustomDatePicker` — i18n-риск для 3 локалей | Средняя | Средний | Мигрируется в этапе 2 отдельным коммитом, прогоняется через en/ru/kk. |
| Потеря framer-motion анимаций HeroUI | Низкая | Низкий | MUI имеет собственные transitions (`Grow`, `Fade`, `Slide`). Не воспроизводим точь-в-точь, принимаем как визуальную разницу. |
| Неполный список файлов в аудите (barrel re-exports) | Средняя | Средний | В этапе 0 полный аудит: `grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify\|@mui/icons-material\|tailwind\|rounded-\|cn(" frontend/app > audit.txt`, сохраняется как baseline. После каждого этапа — сверка. |
| `storybook-static/` в git | Низкая | Низкий | Удаляется в этапе 10, добавляется в `.gitignore`. |
| Global CSS коллизии между `lumio-*` и MUI `Mui-*` | Очень низкая | Низкий | Префикс `lumio-` гарантирует неконфликт. |

---

## 9. Критерии успеха

1. `grep -rn "@heroui\|@radix-ui\|@mantine\|@iconify/react\|@mui/icons-material\|tailwind\|rounded-[^0]" frontend/app` → 0 совпадений.
2. `package.json` не содержит ни одной из удалённых зависимостей.
3. `providers.tsx` содержит только `ThemeProvider` (MUI) + `LocalizationProvider` из UI-провайдеров.
4. Все существующие тесты (`npm test`) — зелёные.
5. `npm run type-check` — 0 ошибок.
6. `npm run lint:check` — 0 ошибок.
7. Визуально: прямоугольные элементы имеют `border-radius: 0`, круглые (Avatar, Switch, CircularProgress, индикаторы-точки) остаются круглыми.
8. Размер production-бандла ≤ baseline, зафиксированного в этапе 0.
