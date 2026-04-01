# Tables Reports Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Tables reports" tab to the Statements Insights section that displays categorized, aggregated reports from custom tables (manual + Google Sheets imports), following the Top Merchants UI pattern with server-side aggregation.

**Architecture:** New backend endpoints handle aggregation (by counterparty, category, timeseries). The frontend mirrors the TopMerchantsView component structure — summary cards, trend chart, source pie chart, top bar chart, leaderboard table, drill-down modal — but sources data from custom tables via dedicated API endpoints. A multi-select dropdown lets users filter which tables to include (all selected by default). Google Sheets imports and manual tables are mixed together with a source badge indicator.

**Tech Stack:** NestJS (backend), Next.js 14 (frontend), TypeORM, PostgreSQL JSONB, ECharts, Axios, localStorage for filter persistence.

---

## Phase 1: Backend — New Report Endpoints

### Task 1: Create DTO for aggregated custom table reports

**Files:**
- Create: `backend/src/modules/reports/dto/custom-tables-report.dto.ts`

**Step 1: Write the DTO**

```ts
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum CustomTableReportFlowType {
  ALL = 'all',
  EXPENSE = 'expense',
  INCOME = 'income',
}

export enum CustomTableReportSortKey {
  AMOUNT = 'amount',
  AVERAGE = 'average',
  OPERATIONS = 'operations',
}

export class CustomTablesReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tableIds?: string[];

  @IsOptional()
  @IsEnum(CustomTableReportFlowType)
  flowType?: CustomTableReportFlowType;

  @IsOptional()
  @IsEnum(CustomTableReportSortKey)
  sortBy?: CustomTableReportSortKey;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CustomTablesReportDrillDownDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tableIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

  @IsString()
  counterparty: string;

  @IsOptional()
  @IsEnum(CustomTableReportFlowType)
  flowType?: CustomTableReportFlowType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/reports/dto/custom-tables-report.dto.ts
git commit -m "feat(reports): add DTOs for custom tables report endpoints"
```

---

### Task 2: Define response interfaces for aggregated reports

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts` (add interfaces after existing `CustomTablesSummaryResponse`, around line 82)

**Step 1: Add interfaces**

Add after the existing `CustomTablesSummaryResponse` interface (line ~82):

```ts
export interface CustomTablesReportRow {
  counterparty: string;
  source: 'manual' | 'google_sheets_import';
  tableId: string;
  tableName: string;
  count: number;
  total: number;
  average: number;
  lastDate: string | null;
  currency: string | null;
}

export interface CustomTablesReportResponse {
  totals: {
    total: number;
    manualTotal: number;
    googleSheetsTotal: number;
    operations: number;
  };
  comparison: {
    totalDelta: number;
    totalPercentage: number;
    totalTrend: 'up' | 'down' | 'flat';
    manualDelta: number;
    manualPercentage: number;
    manualTrend: 'up' | 'down' | 'flat';
    googleSheetsDelta: number;
    googleSheetsPercentage: number;
    googleSheetsTrend: 'up' | 'down' | 'flat';
    operationsDelta: number;
    operationsPercentage: number;
    operationsTrend: 'up' | 'down' | 'flat';
  };
  timeseries: Array<{ date: string; amount: number }>;
  sourceSplit: { manual: number; googleSheets: number };
  aggregatedRows: CustomTablesReportRow[];
  tables: Array<{
    id: string;
    name: string;
    source: 'manual' | 'google_sheets_import';
    total: number;
    rows: number;
  }>;
}

export interface CustomTablesReportDrillDownResponse {
  counterparty: string;
  items: Array<{
    rowId: string;
    tableId: string;
    tableName: string;
    source: 'manual' | 'google_sheets_import';
    date: string | null;
    amount: number;
    category: string | null;
    currency: string | null;
  }>;
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts
git commit -m "feat(reports): add response interfaces for custom tables report"
```

---

### Task 3: Implement `getCustomTablesReport` service method

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts` (add new method after `getCustomTablesSummary`)
- Create: `backend/@tests/unit/reports/custom-tables-report.spec.ts`

**Step 1: Write the failing test**

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { CustomTable } from '../../../src/entities/custom-table.entity';
import { CustomTableColumn } from '../../../src/entities/custom-table-column.entity';
import { CustomTableRow } from '../../../src/entities/custom-table-row.entity';
import { Transaction } from '../../../src/entities/transaction.entity';
import { Category } from '../../../src/entities/category.entity';
import { Branch } from '../../../src/entities/branch.entity';
import { Wallet } from '../../../src/entities/wallet.entity';
import { User } from '../../../src/entities/user.entity';
import { ReportHistory } from '../../../src/entities/report-history.entity';

const mockRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  }),
});

describe('ReportsService.getCustomTablesReport', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(CustomTable), useFactory: mockRepo },
        { provide: getRepositoryToken(CustomTableColumn), useFactory: mockRepo },
        { provide: getRepositoryToken(CustomTableRow), useFactory: mockRepo },
        { provide: getRepositoryToken(Transaction), useFactory: mockRepo },
        { provide: getRepositoryToken(Category), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(Wallet), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: getRepositoryToken(ReportHistory), useFactory: mockRepo },
        { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: 'AuditService', useValue: {} },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  it('returns proper shape for empty workspace', async () => {
    const result = await service.getCustomTablesReport('workspace-1', {});
    expect(result).toHaveProperty('totals');
    expect(result).toHaveProperty('comparison');
    expect(result).toHaveProperty('timeseries');
    expect(result).toHaveProperty('sourceSplit');
    expect(result).toHaveProperty('aggregatedRows');
    expect(result).toHaveProperty('tables');
    expect(result.totals.total).toBe(0);
    expect(result.aggregatedRows).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern custom-tables-report.spec.ts --no-coverage`
Expected: FAIL — `service.getCustomTablesReport is not a function`

**Step 3: Implement the service method**

Add to `reports.service.ts` after the existing `getCustomTablesSummary` method. The method:

1. Loads tables (optionally filtered by `dto.tableIds`)
2. Loads columns and auto-detects date/amount/category/counterparty columns via existing `pickBestColumnKey` + scoring functions
3. Fetches rows updated in the current period and previous period (for comparison)
4. Processes rows into typed records with flow detection (positive = income, negative = expense)
5. Applies flow type and search filters
6. Computes totals split by source (manual vs google_sheets)
7. Computes period-over-period comparison deltas
8. Builds timeseries (daily amounts)
9. Aggregates by counterparty (grouped by flow:source:counterparty key)
10. Sorts by selected sort key and limits results
11. Builds per-table breakdown

Key implementation details:
- Reuses existing `parseNumber`, `parseDate`, `normalizeText`, `toDateKey` private methods
- Reuses existing `scoreDateColumn`, `scoreAmountColumn`, `scoreCategoryColumn`, `scoreCounterpartyColumn`, `pickBestColumnKey` methods
- Currency detection: heuristically scans column titles for "валют"/"currency"
- Returns `emptyReportResponse()` helper for empty cases

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern custom-tables-report.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts backend/@tests/unit/reports/custom-tables-report.spec.ts
git commit -m "feat(reports): implement getCustomTablesReport service method with aggregation"
```

---

### Task 4: Implement drill-down service method

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/@tests/unit/reports/custom-tables-report.spec.ts`

**Step 1: Add test case**

```ts
it('returns drill-down items for a specific counterparty', async () => {
  const result = await service.getCustomTablesReportDrillDown('workspace-1', {
    counterparty: 'Vendor A',
  });
  expect(result).toHaveProperty('counterparty', 'Vendor A');
  expect(result).toHaveProperty('items');
  expect(Array.isArray(result.items)).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern custom-tables-report.spec.ts --no-coverage`
Expected: FAIL — `service.getCustomTablesReportDrillDown is not a function`

**Step 3: Implement the method**

The drill-down method follows the same column mapping pattern as `getCustomTablesReport`, but filters rows by matching counterparty name (case-insensitive). Returns individual row details sorted by date descending.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern custom-tables-report.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts backend/@tests/unit/reports/custom-tables-report.spec.ts
git commit -m "feat(reports): implement drill-down by counterparty for custom tables report"
```

---

### Task 5: Add controller endpoints

**Files:**
- Modify: `backend/src/modules/reports/reports.controller.ts`

**Step 1: Add three new endpoints**

Import new DTOs and add after existing `getCustomTablesSummary`:

| Method | Route | Body/Params | Description |
|---|---|---|---|
| `POST` | `/reports/custom-tables/report` | `CustomTablesReportDto` | Main aggregated report |
| `POST` | `/reports/custom-tables/report/drill-down` | `CustomTablesReportDrillDownDto` | Counterparty drill-down |
| `GET` | `/reports/custom-tables/available` | — | List tables for filter dropdown |

All endpoints use `JwtAuthGuard`, `WorkspaceContextGuard`, `PermissionsGuard` with `REPORT_VIEW` permission.

**Step 2: Add `getAvailableCustomTables` method to service**

Returns `Array<{ id, name, source, rowCount }>` for all custom tables in the workspace.

**Step 3: Commit**

```bash
git add backend/src/modules/reports/reports.controller.ts backend/src/modules/reports/reports.service.ts
git commit -m "feat(reports): add controller endpoints for custom tables report, drill-down, and available tables"
```

---

## Phase 2: Frontend — Page Route & Side Panel

### Task 6: Create the page route

**Files:**
- Create: `frontend/app/(main)/statements/tables-reports/page.tsx`

**Step 1: Create the page file** (follows exact same pattern as all other statement pages)

```tsx
'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import TablesReportsView from '../components/TablesReportsView';

export default function StatementsTablesReportsPage() {
  return (
    <>
      <StatementsSidePanel activeItem="tables-reports" />
      <TablesReportsView />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/tables-reports/page.tsx
git commit -m "feat(frontend): add tables-reports page route"
```

---

### Task 7: Add navigation item to StatementsSidePanel

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`

**Step 1: Add the "Tables reports" nav item**

In the insights section items array (after "top-categories" item, ~line 533):

```tsx
{
  id: 'tables-reports',
  label: (t as any)?.sidePanel?.tablesReports?.value ?? 'Tables reports',
  icon: <TableChartOutlinedIcon sx={{ fontSize: 20 }} />,
  badge: tablesReportsCount,
  badgeLoading: countsLoading,
  badgeVariant: 'default',
  emphasis: 'low',
  href: '/statements/tables-reports',
  active: activeItem === 'tables-reports',
},
```

**Step 2:** Import MUI icon `TableChartOutlinedIcon`, add `tablesReportsCount` state, fetch table count in existing data-loading effect via `GET /custom-tables`, update `activeItem` prop union type.

**Step 3: Commit**

```bash
git add frontend/app/\(main\)/statements/components/StatementsSidePanel.tsx
git commit -m "feat(frontend): add tables-reports navigation item to side panel"
```

---

## Phase 3: Frontend — TablesReportsView Component

### Task 8: Create utility types and helpers

**Files:**
- Create: `frontend/app/(main)/statements/components/tables-reports.utils.ts`

Contains:
- TypeScript interfaces mirroring backend response shapes
- Filter types (`TablesReportsFilters`) and defaults
- localStorage persistence helpers (`loadTablesReportsFilters`, `saveTablesReportsFilters`)
- Display helpers (`formatAmount`, `getSourceLabel`, `getComparisonColor`, `getComparisonArrow`)
- Date preset options and `resolveDays` helper

**Step 1: Write the file** (see full code in the implementation details above)

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/tables-reports.utils.ts
git commit -m "feat(frontend): add types and utilities for tables reports"
```

---

### Task 9: Create TablesReportsView — API layer and state

**Files:**
- Create: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

**Step 1: Component skeleton**

Mirrors TopMerchantsView architecture:
- State: `loading`, `report`, `availableTables`, `filters`, `searchInput`, `activeFlowType`, `sortKey`, `selectedDays`, `selectedTableIds`, `tableDropdownOpen`, `selectedRowId`, `drillDown`, `drillDownLoading`
- `useEffect` for loading persisted filters from localStorage
- `useEffect` for fetching available tables (`GET /reports/custom-tables/available`)
- `fetchReport` callback that POSTs to `/reports/custom-tables/report`
- `handleRowClick` callback that POSTs to `/reports/custom-tables/report/drill-down`
- AbortController pattern for cancelling in-flight requests

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "feat(frontend): create TablesReportsView component skeleton with data fetching"
```

---

### Task 10: Add chart configurations

**Files:**
- Modify: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

Three `useMemo` ECharts option objects:

1. **Trend Chart** — line with area fill, daily amounts, sky-blue color, smooth line
2. **Source Split Donut** — two slices: Manual (sky) vs Google Sheets (emerald), radius `['35%', '72%']`
3. **Top Counterparties Bar** — horizontal bar, top 12 counterparties reversed, 28px max bar width

**Step 1: Add the chart useMemo blocks**

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "feat(frontend): add ECharts configurations for tables reports"
```

---

### Task 11: Build full render JSX

**Files:**
- Modify: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

Layout (top-to-bottom):
1. **Header block** (shrink-0): title + flow type toggle (All/Expenses/Income), search input + table multi-select dropdown + date preset dropdown
2. **Scrollable content**: loading spinner | empty state | data view:
   - Summary cards (4-col grid): Total, Manual tables, Google Sheets, Operations — each with comparison vs previous period
   - Charts row (3-col grid): Trend line (2 cols) + Source donut (1 col)
   - Top counterparties bar chart
   - Sort buttons (Amount / Average / Operations)
   - Leaderboard table: Counterparty | Source (badge) | Table | Operations | Average | Amount | Last operation
3. **Drill-down modal** (fixed overlay): Header with counterparty name + close button, table with Date | Source | Table | Category | Amount

**Step 1: Write the JSX**

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "feat(frontend): complete TablesReportsView UI with charts, leaderboard, and drill-down"
```

---

## Phase 4: Integration & Polish

### Task 12: Outside-click handler for table dropdown

**Files:**
- Modify: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

Add ref + mousedown event listener to close dropdown when clicking outside.

**Step 1: Add the handler**

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "fix(frontend): close table dropdown on outside click"
```

---

### Task 13: Debounced search

**Files:**
- Modify: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

Add 400ms debounce on `searchInput` before triggering API refetch.

**Step 1: Add debounce logic**

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "feat(frontend): debounce search input for tables reports"
```

---

### Task 14: Dark mode and responsive polish

**Files:**
- Modify: `frontend/app/(main)/statements/components/TablesReportsView.tsx`

1. Detect dark mode from `document.documentElement.classList.contains('dark')`
2. Use appropriate chart colors for dark mode (`#0EA5E9` lines, `#94A3B8` axis labels, transparent bg)
3. Make summary cards responsive: `grid-cols-2 md:grid-cols-4`
4. Make charts row responsive: `grid-cols-1 lg:grid-cols-3`

**Step 1: Apply changes**

**Step 2: Commit**

```bash
git add frontend/app/\(main\)/statements/components/TablesReportsView.tsx
git commit -m "fix(frontend): dark mode and responsive polish for tables reports"
```

---

### Task 15: End-to-end verification

**Step 1: Run backend tests**

```bash
cd backend && npx jest --testPathPattern custom-tables-report.spec.ts --no-coverage
```
Expected: all tests PASS

**Step 2: Run linter**

```bash
make lint
```
Expected: no errors in new/modified files

**Step 3: Run frontend build**

```bash
cd frontend && npm run build
```
Expected: build succeeds, no type errors

**Step 4: Manual smoke test checklist**

1. Navigate to `/statements/tables-reports`
2. Side panel shows "Tables reports" item with icon and badge
3. Summary cards render with totals and comparison
4. Trend chart, source donut, and bar chart render
5. Flow type toggle (All/Expenses/Income) re-fetches data
6. Table dropdown shows available tables with checkboxes
7. Date preset selector changes period
8. Search filters by counterparty/category/table name (debounced)
9. Click leaderboard row opens drill-down modal
10. Close drill-down works (click X or overlay)
11. Dark mode renders correctly
12. Empty state when no custom tables exist

**Step 5: Final commit (if any straggling changes)**

```bash
git add -A
git commit -m "feat(statements): add tables reports tab with server-side aggregation and drill-down"
```

---

## File Summary

### New files (5):
| File | Description |
|---|---|
| `backend/src/modules/reports/dto/custom-tables-report.dto.ts` | DTOs for report & drill-down endpoints |
| `backend/@tests/unit/reports/custom-tables-report.spec.ts` | Unit tests for report service methods |
| `frontend/app/(main)/statements/tables-reports/page.tsx` | Next.js page route |
| `frontend/app/(main)/statements/components/tables-reports.utils.ts` | Types, helpers, filter persistence |
| `frontend/app/(main)/statements/components/TablesReportsView.tsx` | Main view component (~600 lines) |

### Modified files (3):
| File | Changes |
|---|---|
| `backend/src/modules/reports/reports.service.ts` | Response interfaces + 3 new methods + empty helper |
| `backend/src/modules/reports/reports.controller.ts` | 3 new endpoints |
| `frontend/app/(main)/statements/components/StatementsSidePanel.tsx` | New nav item + badge count fetch |

---

## Architecture Diagram

```
User clicks "Tables reports" in side panel
       |
       v
/statements/tables-reports (page.tsx)
       |
       +-- StatementsSidePanel (activeItem="tables-reports")
       +-- TablesReportsView
              |
              +-- GET /reports/custom-tables/available
              |     -> table list for multi-select filter dropdown
              |
              +-- POST /reports/custom-tables/report
              |     body: { days, tableIds?, flowType, sortBy, search?, limit }
              |     -> { totals, comparison, timeseries, sourceSplit, aggregatedRows, tables }
              |
              +-- POST /reports/custom-tables/report/drill-down (on row click)
              |     body: { counterparty, days, tableIds?, flowType, limit }
              |     -> { counterparty, items[] }
              |
              +-- Renders:
                   [Summary Cards: Total | Manual | Google Sheets | Operations]
                   [Trend Chart (2/3)] [Source Donut (1/3)]
                   [Top Counterparties Bar Chart]
                   [Sort: Amount | Average | Operations]
                   [Leaderboard Table -> click -> Drill-Down Modal]
```
