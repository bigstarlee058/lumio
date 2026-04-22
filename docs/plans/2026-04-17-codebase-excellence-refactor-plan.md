# Codebase Excellence Refactor Plan

**Date:** 2026-04-17

**Goal:** Move Lumio from a solid but complexity-heavy product codebase to a codebase that is easy to change, test, reason about, and scale without heroics.

**Scope:** Backend, frontend, shared quality gates, test strategy, and architecture guardrails.

**Non-goals:**
- Rewriting the product from scratch
- Replacing NestJS, Next.js, TypeORM, or MUI wholesale
- Large behavior changes disguised as refactoring
- Schema churn without a product or reliability payoff

---

## 1. Executive Summary

Lumio is not in bad shape. It has a clear repo layout, a meaningful test base, documented architecture, and feature-oriented modules. The problem is not lack of capability. The problem is accumulated complexity at the seams:

- large multi-responsibility backend services
- very client-heavy frontend routes
- manual data fetching and polling across many features
- a high number of lint suppressions around file size, complexity, and hook dependencies
- partially completed refactors that now coexist with older implementations

The codebase already contains the right product concepts. What it lacks is sharper boundaries.

The correct strategy is not a big-bang rewrite. It is a staged refactor program with three principles:

1. Split by responsibility, not by file size alone.
2. Move data-access and workflow orchestration out of controllers/pages.
3. Add hard architectural guardrails so the codebase does not regress after cleanup.

---

## 2. Evidence Snapshot

### 2.1 Strengths

- Clear repo split between `backend/`, `frontend/`, `docs/`, `observability/`
- Feature modules exist already in `backend/src/modules`
- Good amount of tests:
  - backend test files: `314`
  - frontend test files: `325`
- Existing architecture docs in `website/docs/architecture`
- Existing refactor plans indicate the team already refactors incrementally rather than rewriting blindly

### 2.2 Measured complexity signals

- TypeScript files over `500` LOC: `74`
- TypeScript files over `800` LOC: `27`
- TypeScript files over `1200` LOC: `10`
- `frontend/app/page.tsx` route entries using `'use client'`: `49 / 51`
- frontend direct HTTP call sites (`apiClient.*` / `api.*`): `351`
- `react-hooks/exhaustive-deps` suppressions in `frontend/app`: `47`
- `max-lines` suppressions across `frontend/app` and `backend/src`: `177`
- `complexity` suppressions across `frontend/app` and `backend/src`: `108`
- backend `createQueryBuilder(...)` call sites: `100`

### 2.3 Backend hotspots

The following classes are carrying too much responsibility today:

- `backend/src/modules/reports/reports.service.ts`
  - `3116` LOC
  - `13` `createQueryBuilder` call sites
  - reporting, exports, template generation, history, custom table analytics, balance/report logic all in one class
- `backend/src/modules/custom-tables/custom-tables.service.ts`
  - `2290` LOC
  - `12` `createQueryBuilder` call sites
  - permissions, table CRUD, rows, styles, data transforms, imports mixed together
- `backend/src/modules/statements/statements.service.ts`
  - `1466` LOC
  - upload, thumbnails, permissions, manual expense creation, file handling, filtering, mutations
- `backend/src/modules/storage/storage.service.ts`
  - `1408` LOC
  - constructor dependency count signal: `28`
  - read model, sharing, permissions, tags, folders, trash, metrics mixed together
- `backend/src/modules/dashboard/dashboard.service.ts`
  - `797` LOC
  - `13` `createQueryBuilder` call sites
  - aggregation and currency conversion mixed with response assembly
- `backend/src/modules/gmail/gmail.controller.ts`
  - constructor dependency count signal: `26`
  - transport layer mixed with orchestration and integration setup concerns
- `backend/src/modules/import/services/import-session.service.ts`
  - `1024` LOC
  - constructor dependency count signal: `22`
  - session lifecycle, dedup, retry, transaction persistence, event emission all in one place

### 2.4 Frontend hotspots

- `frontend/app/storage/StoragePageContent.tsx`
  - still very large even after partial helper extraction
  - multiple hooks, modal coordination, DnD, filters, bulk actions, preview, trash, folder and tag state in one view shell
- `frontend/app/storage/[id]/page.tsx`
  - page-level data fetching, preview lifecycle, tab state, download flow and UI all mixed together
- `frontend/app/(main)/statements/components/StatementsListView.tsx`
  - large page container with debouncing, filtering, manual polling, upload, preview and routing behaviors
- `frontend/app/(main)/statements/components/hooks/useStatementsListData.ts`
  - manual loading, polling, skeleton coordination, routing side-effects, and toast behavior in one hook
- `frontend/app/(main)/custom-tables/[id]/page.tsx`
  - improved compared to older pages, but still acts as orchestration hub for too many hooks and view concerns
- `frontend/app/(main)/reports/components/BalanceSheet.tsx`
  - large stateful component with multiple lint suppressions
- `frontend/app/lib/api.ts`
  - transport, auth token refresh, workspace header injection, and multiple feature clients in one module
- `frontend/app/hooks/useAuth.ts`
  - auth bootstrap, redirect logic, locale sync, theme event emission, storage cleanup in one hook
- `frontend/app/contexts/WorkspaceContext.tsx`
  - multiple `exhaustive-deps` suppressions and imperative bootstrap logic

### 2.5 Signals of incomplete refactors

- `frontend/app/(main)/reports/components/useBalanceSheet.ts` exists but is not used anywhere
- `frontend/app/(main)/custom-tables/[id]/hooks/useRowActions.ts` and `useRowMutations.ts` overlap in responsibility
- `StoragePageContent` has extracted helper modules, but the orchestration shell is still oversized

This matters because unfinished refactors are worse than untouched code: they create two competing abstractions instead of one.

---

## 3. North-Star Target Architecture

### 3.1 Backend

Each feature module should converge on four explicit layers:

1. `controller`
   - HTTP transport only
   - validation, serialization, status codes, streaming helpers
   - no domain orchestration

2. `application`
   - use-case orchestration
   - coordinates repositories, policies, events, and transactions

3. `domain`
   - business rules, calculators, classifiers, policy objects, value objects

4. `infrastructure`
   - TypeORM query objects, repository adapters, cloud integrations, file IO

### 3.2 Frontend

Each feature should converge on five explicit layers:

1. `route entry`
   - server-first where possible
   - assembles page shell and feature modules

2. `feature container`
   - composes query hooks and local UI state

3. `presentational components`
   - render only
   - no direct HTTP calls

4. `feature data layer`
   - query hooks, mutation hooks, optimistic updates, polling

5. `transport client`
   - a thin, shared HTTP layer with auth/session concerns only

### 3.3 Cross-cutting rules

- No direct `apiClient` usage in page components or presentational components
- No `createQueryBuilder` in controllers
- Complex SQL/query composition lives in dedicated `queries/` or repository adapters
- No unresolved duplicate abstractions
- No lint suppressions in newly touched production code

---

## 4. Success Criteria

The refactor program is done only when the codebase satisfies the following measurable conditions.

### 4.1 Structural metrics

- no production service class above `700` LOC
- no production page/container component above `350` LOC
- no controller above `250` LOC
- no service/controller constructor with more than `8` injected dependencies
- no route entry that is forced client-side unless the entire page is truly interaction-heavy
- client route entries reduced from `49 / 51` to at most `20 / 51`

### 4.2 Data layer metrics

- zero direct `apiClient.*` calls inside page components and presentational components
- all frontend polling handled by a single standardized query/mutation layer
- all complex backend read queries live in `queries/` or repository adapters, not in orchestration services

### 4.3 Quality metrics

- `react-hooks/exhaustive-deps` suppressions in production code reduced to `0`
- `max-lines` and `complexity` suppressions in production code reduced by at least `80%`
- no unused parallel refactor files reported by `knip`
- raw `console.error` / `console.warn` removed from application code except for explicit browser-only third-party script shims

### 4.4 Testing metrics

- characterization tests added before every major extraction
- integration tests for `reports`, `storage`, `custom-tables`, `statements`, `gmail`
- frontend smoke coverage for the main workflows:
  - auth bootstrap
  - statements list and edit
  - storage browse and share
  - custom table detail and row editing
  - reports load and export

---

## 5. Phase Plan

## Phase 0. Baseline, Guardrails, and Safety Nets

**Objective:** Stop the codebase from getting worse while refactoring is in progress.

### Tasks

- Create a repeatable architecture metrics script that records:
  - large files
  - constructor dependency counts
  - `createQueryBuilder` locations
  - `'use client'` page count
  - lint suppressions
- Add a CI job that runs:
  - `biome check`
  - frontend `eslint`
  - root `knip`
  - architecture metrics script
- Introduce import-boundary rules:
  - page components cannot import transport directly
  - presentational components cannot import data clients
  - controllers cannot import repositories other than through injected services
- Define an ADR template for major architecture decisions
- Add a `docs/architecture/refactor-target.md` that documents the target layering

### Acceptance Criteria

- CI fails on new lint suppressions in production code
- CI reports architecture metrics on every PR
- `knip` becomes part of the default hygiene pipeline

### Why this phase comes first

Without guardrails, each refactor PR competes against ongoing entropy and the codebase regresses faster than it improves.

---

## Phase 1. Finish Incomplete Refactors Before Starting New Ones

**Objective:** Remove overlapping abstractions and converge half-finished cleanups into a single direction.

### Target areas

- `frontend/app/(main)/reports/components/BalanceSheet.tsx`
- `frontend/app/(main)/reports/components/useBalanceSheet.ts`
- `frontend/app/(main)/custom-tables/[id]/hooks/useRowActions.ts`
- `frontend/app/(main)/custom-tables/[id]/hooks/useRowMutations.ts`
- `frontend/app/storage/StoragePageContent.tsx`
- `frontend/app/storage/helpers/*`

### Tasks

- Finish the `BalanceSheet` refactor:
  - move all data loading and export logic to `useBalanceSheet`
  - keep the component as a renderer plus interaction wiring only
  - delete stale inline logic from the component
- Converge `useRowActions` and `useRowMutations` into one abstraction
  - pick one name and one implementation
  - keep helper functions in `helpers/rowActionHelpers.ts`
  - remove the duplicate API and overlapping mutation logic
- Continue extracting `StoragePageContent`
  - split into `StoragePageShell`, `StorageToolbar`, `StorageMainTableSection`, `StorageFolderManager`, `StorageConfirmations`
  - ensure the page shell orchestrates but does not compute or fetch directly

### Acceptance Criteria

- no duplicate hook pairs for the same workflow
- no unused refactor artifacts left behind
- `BalanceSheet` and `StoragePageContent` lose their current file-level lint suppressions

---

## Phase 2. Backend Read/Write Boundary Refactor

**Objective:** Split oversized backend services into focused use-case and query layers.

## Workstream 2A. Reports and Dashboard

### Current problems

- `reports.service.ts` is simultaneously:
  - a query layer
  - an export engine
  - a template/document generator
  - a history service
  - a custom table analytics engine
- `dashboard.service.ts` duplicates reporting-style aggregation logic and mixes read-model assembly with currency conversion

### Target architecture

`backend/src/modules/reports/`

- `reports.facade.ts`
- `queries/`
  - `statements-summary.query.ts`
  - `top-categories.query.ts`
  - `spend-over-time.query.ts`
  - `custom-tables-report.query.ts`
- `export/`
  - `workspace-export.service.ts`
  - `report-export.service.ts`
  - `report-file-writer.service.ts`
- `templates/`
  - `pnl-template.service.ts`
  - `cash-flow-template.service.ts`
  - `expense-by-category-template.service.ts`
- `history/`
  - `report-history.service.ts`
- `formatters/`
  - CSV, Excel, PDF, DOCX formatters

`backend/src/modules/dashboard/`

- `dashboard.facade.ts`
- `queries/`
  - `dashboard-snapshot.query.ts`
  - `dashboard-actions.query.ts`
  - `dashboard-top-merchants.query.ts`
  - `dashboard-top-categories.query.ts`
- `services/`
  - `dashboard-window.service.ts`
  - `currency-normalization.service.ts`

### Required actions

- Extract all `createQueryBuilder` logic from `ReportsService` and `DashboardService`
- Move file-generation concerns to dedicated export services
- Move temp-file streaming and cleanup to a shared infrastructure helper
- Split custom tables report logic from statement report logic
- Create characterization tests around existing report payloads before moving anything

### Acceptance Criteria

- `ReportsController` depends on a small facade, not a megaservice
- `ReportsService` no longer exists as a 3000+ line god class
- `DashboardService` becomes a thin facade over query/read services
- all report payloads are covered by snapshot or contract-style tests

## Workstream 2B. Statements, Storage, and Custom Tables

### Current problems

- `StatementsService` mixes file IO, permission checks, upload, manual expense creation, mutation flows, and read filtering
- `StorageService` mixes read-model enrichment, sharing, tags, folders, permissions, trash, metrics, and file availability
- `CustomTablesService` mixes metadata, rows, styles, permissions, imports, and schema fallback behavior

### Target architecture

`backend/src/modules/statements/`

- `statement-read.service.ts`
- `statement-write.service.ts`
- `manual-expense.service.ts`
- `statement-file.service.ts`
- `statement-thumbnail.service.ts`
- `statement-permission.service.ts`

`backend/src/modules/storage/`

- `storage-read.service.ts`
- `sharing.service.ts`
- `folder.service.ts`
- `tag.service.ts`
- `storage-trash.service.ts`
- `file-availability.service.ts`

`backend/src/modules/custom-tables/`

- `custom-table-read.service.ts`
- `custom-table-meta.service.ts`
- `custom-table-row.service.ts`
- `custom-table-column.service.ts`
- `custom-table-style.service.ts`
- `custom-table-permission.service.ts`
- `custom-table-import.service.ts`

### Required actions

- Move permission checks into dedicated policy services shared across features
- Move file availability logic to a service reused by both `statements` and `storage`
- Move table row mutation logic to a dedicated service with narrow tests
- Separate read-side filtering from mutation workflows
- Move schema fallback / helpful migration error logic to infrastructure helpers instead of feature service core

### Acceptance Criteria

- no service in these modules injects more than `8` dependencies
- read models can be tested independently of write use-cases
- frontend no longer depends on backend responses assembled from giant multi-purpose services

## Workstream 2C. Gmail and Integrations

### Current problems

- `gmail.controller.ts` is over-injected and owns orchestration that belongs in application services
- transport concerns and integration setup are mixed together

### Target architecture

`backend/src/modules/gmail/`

- `gmail.controller.ts`
  - transport only
- `gmail-integration.facade.ts`
- `gmail-receipt-read.service.ts`
- `gmail-receipt-mutation.service.ts`
- `gmail-sync-orchestrator.service.ts`
- `gmail-watch-orchestrator.service.ts`

### Required actions

- Keep controller methods as thin request/response mapping
- Move sync, watch setup, disconnect cleanup, export, duplicate handling, and settings updates behind a facade
- Reuse the existing OAuth base abstractions and avoid feature-specific duplication

### Acceptance Criteria

- controller dependency count drops drastically
- controller methods do not contain orchestration logic
- integration flows are testable without HTTP transport

---

## Phase 3. Frontend Data Layer and Route Architecture

**Objective:** Reduce client-side orchestration and standardize data loading/mutation patterns.

## Workstream 3A. Split transport from feature data access

### Current problems

- `frontend/app/lib/api.ts` is both low-level transport and a bag of feature-specific API helpers
- `351` direct HTTP call sites indicate transport leakage into feature and page code

### Target architecture

`frontend/app/lib/http/`

- `client.ts`
- `auth-interceptors.ts`
- `workspace-header.ts`

`frontend/app/features/<feature>/api/`

- `statements.client.ts`
- `storage.client.ts`
- `reports.client.ts`
- `custom-tables.client.ts`
- `gmail.client.ts`

### Required actions

- Reduce `lib/api.ts` to transport only
- Move feature endpoints into per-feature clients
- Prefer generated API types from backend OpenAPI, or extract a shared contract package if generation is not adopted
- Make page/components import feature clients or query hooks, never transport directly

### Acceptance Criteria

- `apiClient.*` no longer appears inside pages or presentational components
- feature contracts live close to the feature
- backend/frontend type drift is reduced

## Workstream 3B. Standardize query and mutation state

### Recommendation

Adopt **TanStack Query** as the default client-side server-state layer for interactive screens that cannot become server-first immediately.

This is the single highest ROI frontend architecture change because the codebase currently duplicates:

- loading state
- error mapping
- ref-based stale data avoidance
- polling loops
- invalidation logic
- optimistic updates

### Pilot migrations

- `StatementsListView` and `useStatementsListData`
- `StoragePageContent` and storage hooks
- custom table detail row loading and mutations
- workspace management screens

### Required actions

- Replace manual polling with query polling
- Replace manual ref synchronization with query cache/invalidation
- Centralize toast and retry policies at mutation boundaries
- Keep local component state only for UI state, not server-state synchronization

### Acceptance Criteria

- no manual polling loops in feature components/hooks
- no `loading + useRef + request sequence + abort` boilerplate repeated across features
- feature reload behavior becomes predictable and consistent

## Workstream 3C. Server-first route entries

### Current problems

- `49 / 51` route entries are client components
- route-level client rendering makes auth bootstrap, data hydration, and initial loading states heavier than needed

### Required actions

- Convert read-mostly routes to server route entries with client islands
- Keep heavy interactivity inside nested client components only
- Prioritize:
  - settings pages with mostly form bootstrapping
  - report entry screens
  - read-only storage/detail views where possible
  - content or guide-like pages

### Acceptance Criteria

- client route entry count reduced to `20` or fewer
- route entries become assembly points instead of orchestration engines

## Workstream 3D. Page/container decomposition

### High-priority targets

- `frontend/app/storage/StoragePageContent.tsx`
- `frontend/app/storage/[id]/page.tsx`
- `frontend/app/(main)/statements/components/StatementsListView.tsx`
- `frontend/app/(main)/custom-tables/[id]/page.tsx`
- `frontend/app/(main)/reports/components/BalanceSheet.tsx`

### Target pattern

For each large route:

- `PageShell`
- `FeatureContainer`
- `ViewModel hooks`
- `Presentational sections`
- `pure helpers`

### Acceptance Criteria

- route containers mostly compose hooks and sections
- reusable sections become testable without HTTP mocks
- lint suppressions disappear because responsibilities are actually smaller

---

## Phase 4. Auth, Workspace, and Session Bootstrap Cleanup

**Objective:** Move app bootstrap logic into explicit session providers and remove storage-driven side effects from many unrelated places.

### Current problems

- `useAuth` combines:
  - token presence checks
  - profile fetch
  - redirect behavior
  - locale sync
  - theme event emission
  - storage cleanup
- `WorkspaceContext` manages bootstrap and mutations with multiple dependency suppressions
- workspace and auth state leak into transport headers and page effects in an ad hoc way

### Required actions

- Introduce an explicit `AuthSessionProvider`
- Introduce an explicit `WorkspaceSessionProvider`
- Local storage access should be isolated to session/bootstrap modules and transport middleware only
- Move onboarding redirect rules to a clear route guard or bootstrap policy layer
- Make auth bootstrap testable as a single unit

### Acceptance Criteria

- `useAuth` becomes a thin consumer hook, not the owner of bootstrap orchestration
- `WorkspaceContext` no longer needs hook dependency suppressions
- session bootstrap logic is centralized and deterministic

---

## Phase 5. Parsing and Import Pipeline Refactor

**Objective:** Keep the high-value ingestion pipeline reliable while making it maintainable.

### Current problems

The parsing module is powerful but still contains several very large services:

- `intelligent-deduplication.service.ts` `1419` LOC
- `quality-metrics.service.ts` `1172` LOC
- `statement-processing.service.ts` `1161` LOC
- `checksum-auto-fix.service.ts` `850` LOC
- `column-auto-fix.service.ts` `843` LOC
- `metadata-extraction.service.ts` `755` LOC

### Target architecture

- explicit pipeline stages with typed hand-off objects
- a `PipelineContext` passed through stages
- isolated rule evaluators for:
  - date normalization
  - amount normalization
  - column validation
  - metadata extraction
  - dedup classification
- bank/profile configuration separated from execution code

### Required actions

- Split `statement-processing.service.ts` into orchestration plus stage services
- Extract rule-heavy logic from `quality-metrics`, `checksum-auto-fix`, and `column-auto-fix`
- Standardize pipeline logging and metrics
- Add golden tests for bank-specific parsing and regressions

### Acceptance Criteria

- pipeline steps can be tested in isolation
- new bank parser work no longer requires editing large orchestration files
- parsing regressions are caught by golden tests before release

---

## Phase 6. Testing, Observability, and Developer Experience

**Objective:** Make the cleaned architecture stay clean.

## Workstream 6A. Test strategy rebalance

### Current gap

There are many tests, but coverage is not evenly aligned with the riskiest modules. The hottest modules by complexity should also be the most protected by integration and characterization tests.

### Required actions

- Add characterization suites before refactoring:
  - reports payloads
  - storage permissions and sharing
  - custom table row/column/style behavior
  - statements upload/manual expense workflows
  - gmail sync and receipt actions
- Add browser-level smoke coverage for top business flows
- Keep unit tests around extracted pure helpers and policies

### Acceptance Criteria

- every hotspot module has both unit tests and at least one integration-style suite
- refactor PRs can prove behavior preservation rather than relying on manual QA

## Workstream 6B. Logging and error policy

### Current problem

The codebase still contains many raw `console.error` and `console.warn` calls across frontend features and some backend flows.

### Required actions

- Backend:
  - standardize on Nest `Logger` or a wrapped structured logger
  - no raw `console.*`
- Frontend:
  - create a browser logger with environment-aware behavior
  - centralize toast creation and API error mapping
  - third-party script loaders may keep scoped diagnostics, but through a wrapper

### Acceptance Criteria

- error handling becomes consistent across features
- logging is searchable and intentional

## Workstream 6C. Dead code and boundary enforcement

### Required actions

- run and fix `knip` regularly
- add dependency boundary rules
- remove stale files and duplicate hooks after each feature refactor
- add per-feature `README.md` files for major modules

### Acceptance Criteria

- no unused refactor leftovers
- architecture intent is documented near the code

---

## 6. Refactor Order of Execution

This order minimizes risk and avoids creating even more overlapping abstractions.

1. Phase 0 guardrails and metrics
2. Finish incomplete frontend refactors already started
3. Reports and dashboard backend split
4. Frontend transport/data-layer split
5. Storage and statements backend decomposition
6. Custom tables backend and frontend convergence
7. Auth/workspace bootstrap cleanup
8. Gmail controller/application split
9. Parsing/import pipeline split
10. Final dead-code cleanup and boundary hardening

---

## 7. Immediate High-ROI Backlog

If the team can only fund the first ten refactor PRs, start here.

1. Turn `frontend/app/lib/api.ts` into transport only and create feature API clients.
2. Finish the `BalanceSheet` refactor and delete the duplicate unused flow.
3. Merge `useRowActions` and `useRowMutations`.
4. Split `reports.service.ts` into query, export, and template services.
5. Split `dashboard.service.ts` into query/read services.
6. Split `storage.service.ts` into read, sharing, tags/folders, and trash services.
7. Split `statements.service.ts` into read, write, file, and manual-expense services.
8. Split `custom-tables.service.ts` into meta, rows, columns, styles, and import services.
9. Slim `gmail.controller.ts` behind a facade.
10. Replace manual polling in `useStatementsListData` with a standardized query layer.

---

## 8. Definition of Done for an “Exemplary” Lumio Codebase

Lumio should be considered exemplary when the following are true at the same time:

- new features fit naturally into existing architectural seams
- large files are rare exceptions, not the default
- transport, orchestration, domain rules, and persistence are visibly separate
- frontend route entries are mostly server-first or thin client shells
- server-state logic is standardized across features
- no half-finished refactors coexist with old abstractions
- the riskiest flows are protected by tests before and after refactors
- lint rules reflect reality instead of being bypassed routinely

That is the difference between a codebase that merely works and a codebase that compounds engineering speed.

