# Lumio Codebase Excellence — Приоритетный План Рефакторинга

## Контекст

Основано на анализе `docs/plans/2026-04-17-codebase-excellence-refactor-plan.md` и живом аудите кодовой базы на 2026-04-18.

**Проблема:** Кодовая база Lumio функциональна, но накопила сложность — монолитные сервисы (до 3116 LOC), 29 зависимостей в конструкторах, 49 подавлений exhaustive-deps, мёртвый код от незавершённых рефакторингов, отсутствие архитектурных метрик в CI.

**Цель:** Превратить кодовую базу в модульную, тестируемую и устойчивую к деградации архитектуру без переписывания с нуля.

---

## Текущее состояние (измерено 2026-04-18)

### Backend — Горячие точки

| Файл | LOC | `createQueryBuilder` | Constructor deps |
|------|-----|---------------------|-----------------|
| `reports.service.ts` | **3,116** | 16 | — |
| `custom-tables.service.ts` | **2,290** | 16 | — |
| `statements.service.ts` | **1,466** | — | — |
| `storage.service.ts` | **1,408** | — | **29** |
| `import-session.service.ts` | **1,024** | — | 17 |
| `gmail.controller.ts` | **871** | — | 20 |
| `dashboard.service.ts` | **797** | 16 | — |

**Ни один из этих файлов ещё не был разделён.**

### Frontend — Горячие точки

| Файл | LOC |
|------|-----|
| `custom-tables/[id]/page.tsx` | **890** |
| `storage/[id]/page.tsx` | **830** |
| `BalanceSheet.tsx` | **566** |
| `StatementsListView.tsx` | **345** |
| `useStatementsListData.ts` | **259** |
| `lib/api.ts` | **267** |

### Незавершённые рефакторинги (мёртвый код)

- `useBalanceSheet.ts` (287 LOC) — **не импортируется нигде**
- `useRowMutations.ts` (75 LOC) — **не импортируется нигде** (только ссылается на себя)

### Инфраструктура качества

- 49 подавлений `react-hooks/exhaustive-deps`
- TanStack Query **не установлен** (только `@tanstack/react-table`)
- Knip настроен, но с **80+ исключениями**, не запускается в CI
- Нет скрипта архитектурных метрик
- Нет правил импорт-границ
- Frontend тестов: **~0**, Backend тестов: **25 spec-файлов**

---

## Приоритетные цели

1. **Остановить деградацию** — метрики + guardrails в CI
2. **Удалить мёртвый код** — убрать путаницу от незавершённых рефакторингов
3. **Разбить backend-монолиты** — начиная с самых больших (reports, dashboard)
4. **Создать frontend data layer** — TanStack Query + разделение транспорта
5. **Разбить оставшиеся backend-сервисы** — storage, statements, custom-tables
6. **Декомпозировать frontend-страницы** — custom-tables, storage, BalanceSheet

---

## Фаза 1: Guardrails и очистка мёртвого кода

**Цель:** Установить baseline, запретить регрессию, убрать путаницу.

### PR 1.1: Скрипт архитектурных метрик

**Создать:**
- `scripts/arch-metrics.mjs`

Скрипт измеряет и выводит таблицу:
- Файлы > 250 / 500 / 700 / 1000 LOC (backend / frontend)
- Constructor dependency counts > 8
- `createQueryBuilder` call sites по файлам
- Количество `eslint-disable` подавлений (exhaustive-deps, max-lines, complexity)
- Прямые `apiClient`/`api.` вызовы в page-файлах

**Модифицировать:**
- `.github/workflows/ci.yml` — добавить job, который запускает скрипт и постит результат в PR-комментарий

**Верификация:** Запустить скрипт локально, сверить цифры с baseline из этого документа.

### PR 1.2: Knip в CI

**Модифицировать:**
- `.github/workflows/ci.yml` — добавить `npx knip` в lint job
- `knip.json` — ревью 80+ исключений, удалить устаревшие

**Верификация:** `npx knip` проходит локально и в CI.

### PR 1.3: Удаление мёртвого кода

**Удалить:**
- `frontend/app/(main)/reports/components/useBalanceSheet.ts` (287 LOC, 0 импортов)
- `frontend/app/(main)/custom-tables/[id]/hooks/useRowMutations.ts` (75 LOC, 0 импортов)

**Модифицировать:**
- `knip.json` — убрать исключения для удалённых файлов

**Верификация:** `npm run build` (frontend), `npx knip` — без ошибок.

### PR 1.4: ESLint import boundary rules (warn-level)

**Модифицировать:**
- `frontend/eslint.config.mjs` — добавить `no-restricted-imports` правила:
  - `page.tsx` файлы не могут импортировать `apiClient` напрямую из `lib/api`
  - `components/` файлы не могут импортировать из `lib/api`
  - Уровень: `warn` (не блокирует сборку, документирует нарушения)

**Верификация:** ESLint показывает warnings для ~21 page-файлов с нарушениями.

---

## Фаза 2: Backend — Разделение Reports и Dashboard

**Цель:** Разбить самый большой файл (3,116 LOC) и dashboard (797 LOC) на фокусированные модули.

**Почему вторая:** Reports — самый большой файл, паттерн разделения станет шаблоном для всех последующих.

### PR 2.1: Characterization-тесты для Reports

**Создать:**
- `backend/@tests/unit/modules/reports/reports.service.spec.ts`

Покрыть snapshot/contract тестами ключевые публичные методы:
- `generateDailyReport`, `generateMonthlyReport`, `generateCustomReport`
- `getCustomTablesSummary`, `getCustomTablesReport`
- `exportReport`

**Верификация:** Минимум 8 тест-кейсов проходят на неизменённом коде.

### PR 2.2: Извлечение query-объектов из Reports

**Создать:**
- `backend/src/modules/reports/queries/custom-tables-summary.query.ts`
- `backend/src/modules/reports/queries/custom-tables-report.query.ts`
- `backend/src/modules/reports/queries/transaction-report.query.ts`
- `backend/src/modules/reports/queries/statements-summary.query.ts`

**Модифицировать:**
- `backend/src/modules/reports/reports.service.ts` — заменить inline-запросы на вызовы query-объектов
- `backend/src/modules/reports/reports.module.ts` — зарегистрировать новые провайдеры

**Верификация:** Characterization-тесты проходят. Каждый query-файл < 400 LOC.

### PR 2.3: Извлечение export-сервисов из Reports

**Создать:**
- `backend/src/modules/reports/export/report-export.service.ts` — оркестрация Excel/CSV/PDF экспорта
- `backend/src/modules/reports/export/report-file-writer.service.ts` — temp-файлы, стриминг, cleanup
- `backend/src/modules/reports/export/workspace-export.service.ts` — экспорт на уровне workspace

**Модифицировать:**
- `backend/src/modules/reports/reports.service.ts` — делегировать export-сервисам
- `backend/src/modules/reports/reports.module.ts`

**Верификация:** Тесты проходят. `reports.service.ts` < 1500 LOC.

### PR 2.4: Извлечение template-сервисов из Reports

**Создать:**
- `backend/src/modules/reports/templates/pnl-template.service.ts`
- `backend/src/modules/reports/templates/cash-flow-template.service.ts`
- `backend/src/modules/reports/templates/expense-by-category-template.service.ts`

**Модифицировать:**
- `backend/src/modules/reports/reports.service.ts` — делегировать template-вызовы
- `backend/src/modules/reports/reports.module.ts`

**Верификация:** `reports.service.ts` < 700 LOC.

### PR 2.5: Извлечение history-сервиса, финализация Reports facade

**Создать:**
- `backend/src/modules/reports/history/report-history.service.ts`

**Модифицировать:**
- `backend/src/modules/reports/reports.service.ts` → переименовать в `reports.facade.ts` (~400–500 LOC)
- `backend/src/modules/reports/reports.module.ts`

**Верификация:** Facade < 500 LOC. Все тесты проходят.

### PR 2.6: Разделение Dashboard

**Создать:**
- `backend/src/modules/dashboard/queries/dashboard-snapshot.query.ts`
- `backend/src/modules/dashboard/queries/dashboard-cashflow.query.ts`
- `backend/src/modules/dashboard/queries/dashboard-categories.query.ts`
- `backend/src/modules/dashboard/queries/dashboard-merchants.query.ts`

**Модифицировать:**
- `backend/src/modules/dashboard/dashboard.service.ts` — становится facade (~200 LOC)
- `backend/src/modules/dashboard/dashboard.module.ts`

**Верификация:** `dashboard.service.ts` < 300 LOC. Все 16 `createQueryBuilder` перенесены в query-файлы.

---

## Фаза 3: Frontend Data Layer

**Цель:** Установить TanStack Query, разделить `api.ts`, создать паттерн data-хуков.

**Почему третья:** Это фундамент, без которого декомпозиция frontend-компонентов просто перемещает fetch-логику без улучшения корректности.

### PR 3.1: Установка TanStack Query

**Модифицировать:**
- `frontend/package.json` — добавить `@tanstack/react-query`, `@tanstack/react-query-devtools`
- `frontend/app/providers.tsx` — обернуть в `QueryClientProvider`

**Создать:**
- `frontend/app/lib/query-client.ts` — QueryClient factory с дефолтами (stale, cache, retry)

**Верификация:** Приложение запускается. Devtools видны в dev-режиме. Поведение не изменилось.

### PR 3.2: Разделение api.ts на транспорт + feature-клиенты

**Создать:**
- `frontend/app/lib/http/client.ts` — axios instance, base URL
- `frontend/app/lib/http/auth-interceptors.ts` — token refresh, 401/403
- `frontend/app/lib/http/workspace-header.ts` — workspace ID injection
- `frontend/app/features/gmail/api/gmail-receipts.client.ts` — вынести `gmailReceiptsApi`
- `frontend/app/features/receipts/api/receipts.client.ts` — вынести `receiptsApi`

**Модифицировать:**
- `frontend/app/lib/api.ts` — оставить ре-экспорт `client` для обратной совместимости (< 50 LOC)
- Все файлы, импортирующие `gmailReceiptsApi` / `receiptsApi` — обновить импорты

**Верификация:** `npm run build` проходит. `api.ts` < 50 LOC.

### PR 3.3: Пилот TanStack Query — Statements List

**Создать:**
- `frontend/app/features/statements/api/statements.client.ts`
- `frontend/app/features/statements/hooks/useStatementsQuery.ts`
- `frontend/app/features/statements/hooks/useStatementsMutations.ts`

**Модифицировать:**
- `frontend/app/(main)/statements/components/hooks/useStatementsListData.ts` — заменить manual fetch/poll на `useStatementsQuery`
- `frontend/app/(main)/statements/components/StatementsListView.tsx` — убрать loading/polling boilerplate

**Верификация:** Список statements загружается. Polling через `refetchInterval`. Минимум 2 `exhaustive-deps` подавления убраны.

### PR 3.4: Пилот TanStack Query — BalanceSheet

**Создать:**
- `frontend/app/features/reports/api/reports.client.ts`
- `frontend/app/features/reports/hooks/useBalanceSheetQuery.ts`

**Модифицировать:**
- `frontend/app/(main)/reports/components/BalanceSheet.tsx` — вынести все `apiClient` вызовы и `useEffect` data loading в query-хук. Компонент = рендеринг + interaction wiring.

**Верификация:** BalanceSheet загружается и рендерится. Экспорт работает. Компонент < 350 LOC.

---

## Фаза 4: Backend — Разделение Storage и Statements

**Цель:** Разбить следующие по размеру backend-сервисы и их oversized контроллеры.

### PR 4.1: Characterization-тесты для Storage

**Создать:**
- `backend/@tests/unit/modules/storage/storage.service.spec.ts`

Покрыть: `getStorageFiles`, `getFileDetails`, share/permission flows, folder/tag CRUD, trash operations.

### PR 4.2: Извлечение Storage sub-сервисов

**Создать:**
- `backend/src/modules/storage/services/storage-tag.service.ts`
- `backend/src/modules/storage/services/storage-folder.service.ts`
- `backend/src/modules/storage/services/storage-sharing.service.ts`
- `backend/src/modules/storage/services/storage-trash.service.ts`
- `backend/src/modules/storage/services/file-availability.service.ts`

**Модифицировать:**
- `backend/src/modules/storage/storage.service.ts` → facade (~300 LOC)
- `backend/src/modules/storage/storage.module.ts`

**Верификация:** `storage.service.ts` < 400 LOC. Ни один конструктор > 8 deps. Тесты проходят.

### PR 4.3: Разделение Statements Service

**Создать:**
- `backend/src/modules/statements/services/statement-read.service.ts`
- `backend/src/modules/statements/services/statement-write.service.ts`
- `backend/src/modules/statements/services/manual-expense.service.ts`
- `backend/src/modules/statements/services/statement-file.service.ts`

**Модифицировать:**
- `backend/src/modules/statements/statements.service.ts` → facade (~400 LOC)
- `backend/src/modules/statements/statements.module.ts`

**Верификация:** `statements.service.ts` < 500 LOC. Существующие тесты проходят.

---

## Зависимости между фазами

```
Фаза 1 (Guardrails) ─── обязательна первой
  │
  ├──► Фаза 2 (Reports/Dashboard Backend) ─── может начаться сразу после Фазы 1
  │
  ├──► Фаза 3 (Frontend Data Layer) ─── может идти параллельно с Фазой 2
  │        └── PR 3.4 (BalanceSheet) лучше делать после PR 2.5 (Reports facade)
  │
  └──► Фаза 4 (Storage/Statements) ─── после Фазы 2 (использует тот же паттерн)
```

Фазы 2 и 3 могут выполняться параллельно двумя разработчиками.

---

## Оценка объёма

| Фаза | PRs | Усилия |
|------|-----|--------|
| 1: Guardrails | 4 | 2–3 дня |
| 2: Reports/Dashboard | 6 | 8–10 дней |
| 3: Frontend Data Layer | 4 | 5–7 дней |
| 4: Storage/Statements | 3 | 5–7 дней |
| **Итого** | **17** | **20–27 дней** |

---

## Общая верификация после каждой фазы

1. `npm run build` проходит для backend и frontend
2. `npm run test` проходит для backend
3. `npm run lint:check` проходит для обоих
4. `scripts/arch-metrics.mjs` показывает улучшение метрик (после Фазы 1)
5. `npx knip` — без нового мёртвого кода
6. Swagger — все endpoints на месте
7. Smoke-тест: login → statements → storage → reports → dashboard

---

## Последующие фазы (не детализированы, выполнять после Фаз 1–4)

- **Фаза 5:** Разделение `custom-tables.service.ts` (2,290 LOC) — meta, rows, columns, styles, import, permissions
- **Фаза 6:** Декомпозиция frontend-страниц — `custom-tables/[id]/page.tsx` (890 LOC), `storage/[id]/page.tsx` (830 LOC)
- **Фаза 7:** Gmail controller → facade + application services
- **Фаза 8:** Auth/Workspace bootstrap cleanup (`useAuth`, `WorkspaceContext`)
- **Фаза 9:** Import pipeline refactor (`import-session.service.ts`, parsing services)
- **Фаза 10:** Dead code cleanup, boundary hardening, ADR templates
