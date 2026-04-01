# Dashboard Dynamic Status Heading — Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the dashboard heading ("All good") dynamic based on actual action items (receipts pending review, statements pending submit, parsing issues, etc.) instead of only checking `dataHealth` fields.

**Architecture:** Extend the backend `DashboardDataHealth` interface with two new fields (`receiptsPendingReview`, `statementsPendingSubmit`), fix the `statementsPendingReview` status mismatch, and update the frontend `resolveDashboardStatusHeading` to check all relevant conditions including receipts. Also fix hardcoded "All good" strings in `DataHealthTab`.

**Tech Stack:** NestJS (backend), Next.js 14 + React (frontend), TypeScript, Vitest

---

## Root Causes (for reference)

1. **`receipts_pending_review` invisible to heading logic** — backend returns it in `data.actions[]` but `resolveDashboardStatusHeading` only checks `data.dataHealth` and `data.snapshot`. No `receiptsPendingReview` field exists in `DashboardDataHealth`.

2. **`statements_pending_submit` invisible to heading logic** — same issue as above. No `statementsPendingSubmit` field in `DashboardDataHealth`.

3. **`statementsPendingReview` status mismatch** — `getActions()` counts `PARSED`+`VALIDATED` as "pending review", but `getDataHealth()` counts `UPLOADED`+`PROCESSING`+`ERROR` as "pending review". These are disjoint sets. If a statement is PARSED, `dataHealth.statementsPendingReview = 0` but the action "X statements need review" appears.

4. **Hardcoded "All good" in `DataHealthTab`** — at line 137, `'All good'` is a raw English string, not using i18n.

---

## Task 1: Backend — Add `receiptsPendingReview` and `statementsPendingSubmit` to `DashboardDataHealth`

**Files:**
- Modify: `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts:53-60`
- Modify: `backend/src/modules/dashboard/dashboard.service.ts:516-588`

**Step 1: Update the backend interface**

In `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts`, add two fields to `DashboardDataHealth`:

```typescript
export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
  statementsPendingSubmit: number;    // NEW
  receiptsPendingReview: number;      // NEW
  unapprovedCash: number;
  lastUploadDate: string | null;
  parsingWarnings: number;
}
```

**Step 2: Add queries in `getDataHealth()`**

In `backend/src/modules/dashboard/dashboard.service.ts`, in the `getDataHealth` method, add two additional parallel queries:

```typescript
// statements pending submit (UPLOADED status)
this.statementRepo.count({
  where: {
    workspaceId,
    status: StatementStatus.UPLOADED,
    deletedAt: IsNull(),
  },
}),
// receipts pending review
this.receiptRepo.count({
  where: {
    workspaceId,
    status: In([ReceiptStatus.NEW, ReceiptStatus.NEEDS_REVIEW]),
  },
}),
```

Destructure the two new results and include them in the return object.

**Step 3: Run backend tests**

Run: `cd backend && npm run test`
Expected: All existing tests pass. New fields are additive — no breaking changes.

**Step 4: Commit**

```bash
git add backend/src/modules/dashboard/
git commit -m "feat(dashboard): add receiptsPendingReview and statementsPendingSubmit to dataHealth"
```

---

## Task 2: Backend — Fix `statementsPendingReview` status set in `getDataHealth()`

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts:539-545`

**Step 1: Fix the status filter**

The current `getDataHealth` counts `UPLOADED`, `PROCESSING`, `ERROR` for `statementsPendingReview`. But `UPLOADED` = pending submit, `ERROR` = has errors (already tracked), `PROCESSING` = in flight. The actual "pending review" should match `getActions`: `PARSED` + `VALIDATED`.

Change line 542 from:
```typescript
status: In([StatementStatus.UPLOADED, StatementStatus.PROCESSING, StatementStatus.ERROR]),
```
to:
```typescript
status: In([StatementStatus.PARSED, StatementStatus.VALIDATED]),
```

This aligns `dataHealth.statementsPendingReview` with the `statements_pending_review` action item.

**Step 2: Run backend tests**

Run: `cd backend && npm run test`

**Step 3: Commit**

```bash
git add backend/src/modules/dashboard/dashboard.service.ts
git commit -m "fix(dashboard): align statementsPendingReview status set between getActions and getDataHealth"
```

---

## Task 3: Frontend — Update `DashboardDataHealth` interface

**Files:**
- Modify: `frontend/app/hooks/useDashboard.ts:65-72`

**Step 1: Add new fields to the frontend interface**

```typescript
export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
  statementsPendingSubmit: number;    // NEW
  receiptsPendingReview: number;      // NEW
  unapprovedCash: number;
  lastUploadDate: string | null;
  parsingWarnings: number;
}
```

**Step 2: Commit**

```bash
git add frontend/app/hooks/useDashboard.ts
git commit -m "feat(dashboard): add new dataHealth fields to frontend interface"
```

---

## Task 4: Frontend — Extend `resolveDashboardStatusHeading` with new conditions

**Files:**
- Modify: `frontend/app/lib/dashboard-status-heading.ts`
- Modify: `frontend/app/lib/dashboard-status-heading.test.ts`

**Step 1: Write failing tests for the new heading keys**

Add these test cases to `dashboard-status-heading.test.ts`:

```typescript
it('returns receiptsNeedReview when receipts are pending', () => {
  const heading = resolveDashboardStatusHeading({
    data: createDashboardData({
      dataHealth: {
        uncategorizedTransactions: 0,
        statementsWithErrors: 0,
        statementsPendingReview: 0,
        statementsPendingSubmit: 0,
        receiptsPendingReview: 11,
        unapprovedCash: 0,
        lastUploadDate: '2026-03-19T00:00:00.000Z',
        parsingWarnings: 0,
      },
    }),
    error: null,
    loading: false,
    now: new Date('2026-03-19T00:00:00.000Z').getTime(),
  });
  expect(heading).toBe('receiptsNeedReview');
});

it('returns pendingSubmit when statements need submit', () => {
  const heading = resolveDashboardStatusHeading({
    data: createDashboardData({
      dataHealth: {
        uncategorizedTransactions: 0,
        statementsWithErrors: 0,
        statementsPendingReview: 0,
        statementsPendingSubmit: 3,
        receiptsPendingReview: 0,
        unapprovedCash: 0,
        lastUploadDate: '2026-03-19T00:00:00.000Z',
        parsingWarnings: 0,
      },
    }),
    error: null,
    loading: false,
    now: new Date('2026-03-19T00:00:00.000Z').getTime(),
  });
  expect(heading).toBe('pendingSubmit');
});

it('prioritizes receiptsNeedReview over uncategorized', () => {
  const heading = resolveDashboardStatusHeading({
    data: createDashboardData({
      dataHealth: {
        uncategorizedTransactions: 5,
        statementsWithErrors: 0,
        statementsPendingReview: 0,
        statementsPendingSubmit: 0,
        receiptsPendingReview: 2,
        unapprovedCash: 0,
        lastUploadDate: '2026-03-19T00:00:00.000Z',
        parsingWarnings: 0,
      },
    }),
    error: null,
    loading: false,
    now: new Date('2026-03-19T00:00:00.000Z').getTime(),
  });
  expect(heading).toBe('receiptsNeedReview');
});
```

Also update `createDashboardData` helper to include the new fields:
```typescript
dataHealth: {
  ...
  statementsPendingSubmit: 0,
  receiptsPendingReview: 0,
  ...overrides?.dataHealth,
},
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run app/lib/dashboard-status-heading.test.ts`
Expected: FAIL — `receiptsNeedReview` and `pendingSubmit` keys don't exist yet.

**Step 3: Add new keys and conditions to the resolver**

In `dashboard-status-heading.ts`:

1. Add new keys to `DashboardStatusHeadingKey`:
```typescript
export type DashboardStatusHeadingKey =
  | 'error'
  | 'loading'
  | 'empty'
  | 'overdue'
  | 'needsReview'
  | 'pendingSubmit'          // NEW
  | 'receiptsNeedReview'     // NEW
  | 'parsingIssues'
  | 'uncategorized'
  | 'stale'
  | 'negativeFlow'
  | 'positiveFlow'
  | 'breakEven'
  | 'allClear';
```

2. Add the checks in priority order (after `needsReview`, before `parsingIssues`):

```typescript
  // ... existing overdue check ...

  if (data.dataHealth.statementsPendingReview > 0) {
    return 'needsReview';
  }

  if (data.dataHealth.statementsPendingSubmit > 0) {    // NEW
    return 'pendingSubmit';
  }

  if (data.dataHealth.receiptsPendingReview > 0) {       // NEW
    return 'receiptsNeedReview';
  }

  if (data.dataHealth.parsingWarnings > 0) {
    return 'parsingIssues';
  }

  // ... rest of conditions ...
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run app/lib/dashboard-status-heading.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/lib/dashboard-status-heading.ts frontend/app/lib/dashboard-status-heading.test.ts
git commit -m "feat(dashboard): add receiptsNeedReview and pendingSubmit heading keys"
```

---

## Task 5: Frontend — Add i18n strings for new heading keys

**Files:**
- Modify: `frontend/app/page.content.ts:188-221`

**Step 1: Add i18n entries for the new keys**

In the `statusHeading` object, add:

```typescript
pendingSubmit: t({
  ru: 'Ожидает отправки',
  en: 'Pending submit',
  kk: 'Жіберуді күтуде',
}),
receiptsNeedReview: t({
  ru: 'Чеки на проверке',
  en: 'Receipts need review',
  kk: 'Чектерді тексеру керек',
}),
```

**Step 2: Commit**

```bash
git add frontend/app/page.content.ts
git commit -m "feat(dashboard): add i18n strings for new status heading keys"
```

---

## Task 6: Frontend — Add receipts to DataHealthTab

**Files:**
- Modify: `frontend/app/components/dashboard/DataHealthTab.tsx`

**Step 1: Add `receiptsPendingReview` metric card**

Add a 5th card to the `metricCards` array:

```typescript
{
  key: 'receiptsPendingReview',
  label: 'RECEIPTS PENDING',
  value: dataHealth.receiptsPendingReview,
  severity: (dataHealth.receiptsPendingReview > 0 ? 'amber' : 'green') as SeverityKey,
},
```

**Step 2: Add receipts to quick links**

```typescript
if (dataHealth.receiptsPendingReview > 0) {
  quickLinks.push({
    label: `Review ${dataHealth.receiptsPendingReview} receipt${dataHealth.receiptsPendingReview !== 1 ? 's' : ''}`,
    href: '/statements?missingCategory=true',
  });
}
```

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/DataHealthTab.tsx
git commit -m "feat(dashboard): add receipts pending review to DataHealthTab metrics"
```

---

## Task 7: Frontend — Add TODO for client-side parsing warnings injection

**Files:**
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx:32-40`

**Step 1: Add TODO comment**

Parsing warnings are NOT returned as a backend action item — they're injected client-side in OverviewTab. Add a `TODO` comment:

```typescript
// TODO: move parsing_warnings to backend getActions() to avoid client-side injection
if (data.dataHealth?.parsingWarnings > 0) {
  ...
}
```

**Step 2: Commit**

```bash
git add frontend/app/components/dashboard/OverviewTab.tsx
git commit -m "chore(dashboard): add TODO for parsing warnings action injection"
```

---

## Task 8: Update test fixtures with new `dataHealth` fields

**Files:**
- Modify: `frontend/app/components/dashboard/__tests__/OverviewTab.test.tsx:26-33`
- Modify: `frontend/app/components/dashboard/__tests__/ActionRequired.test.tsx` (if needed)

**Step 1: Add `statementsPendingSubmit: 0` and `receiptsPendingReview: 0` to all test fixtures**

In `OverviewTab.test.tsx`, update `emptyDashboardData.dataHealth`:

```typescript
dataHealth: {
  uncategorizedTransactions: 0,
  statementsWithErrors: 0,
  statementsPendingReview: 0,
  statementsPendingSubmit: 0,    // NEW
  receiptsPendingReview: 0,      // NEW
  unapprovedCash: 0,
  lastUploadDate: null,
  parsingWarnings: 0,
},
```

**Step 2: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/__tests__/
git commit -m "test(dashboard): update fixtures with new dataHealth fields"
```

---

## Task 9: Final verification

**Step 1: Run full backend test suite**

Run: `cd backend && npm run test`
Expected: All pass.

**Step 2: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All pass.

**Step 3: Run linter**

Run: `make lint`
Expected: No errors.

**Step 4: Manual verification checklist**

- [ ] When receipts need review → heading shows "Receipts need review" (not "All good")
- [ ] When statements pending submit → heading shows "Pending submit"
- [ ] When statements pending review (PARSED/VALIDATED) → heading shows "Needs review"
- [ ] When no issues → heading shows "All good"
- [ ] DataHealthTab shows receipts metric card
- [ ] Action Required section in OverviewTab shows all action items

---

## Summary of changes

| Layer | File | Change |
|-------|------|--------|
| Backend interface | `dashboard-response.interface.ts` | Add `receiptsPendingReview`, `statementsPendingSubmit` fields |
| Backend service | `dashboard.service.ts` | Add queries for new fields + fix `statementsPendingReview` status set |
| Frontend interface | `useDashboard.ts` | Mirror new fields |
| Frontend logic | `dashboard-status-heading.ts` | Add `receiptsNeedReview`, `pendingSubmit` keys |
| Frontend tests | `dashboard-status-heading.test.ts` | Tests for new keys |
| Frontend i18n | `page.content.ts` | Add translations for new keys |
| Frontend UI | `DataHealthTab.tsx` | Add receipts metric card + quick link |
| Frontend tests | `OverviewTab.test.tsx` | Update fixtures |
