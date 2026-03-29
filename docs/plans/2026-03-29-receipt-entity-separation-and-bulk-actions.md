# Receipt Entity Separation and Bulk Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make bank statements, scanned store receipts, and Gmail receipts behave as distinct document types so bulk export/delete works for scanned receipts without allowing unsupported Gmail operations.

**Architecture:** Keep the current unified statements UI, but stop collapsing all receipt-like records into `source: 'gmail'`. Frontend will distinguish `scan` from `gmail` and route bulk actions to the correct API. Backend will add an explicit link from scanned `Receipt` records to their derived `Statement` records so delete flows can clean up both sides consistently.

**Tech Stack:** Next.js 14, Vitest, NestJS, TypeORM, Jest.

---

### Task 1: Lock in frontend source semantics with failing tests

**Files:**
- Modify: `frontend/app/(main)/statements/components/gmail-receipt-mapping.test.ts`
- Modify: `frontend/app/(main)/statements/components/StatementsListView.test.tsx`

**Step 1: Write the failing test**

- Extend `gmail-receipt-mapping.test.ts` so a scanned receipt expects `source === 'scan'` while Gmail receipts still expect `source === 'gmail'`.
- Add `StatementsListView.test.tsx` coverage for:
  - exporting a selected scanned receipt through the receipts file endpoint,
  - deleting a selected scanned receipt through the receipts delete endpoint,
  - keeping Gmail-only selections blocked with one error toast and closing the bulk menu.

**Step 2: Run test to verify it fails**

Run: `npm run test -- "app/(main)/statements/components/gmail-receipt-mapping.test.ts" "app/(main)/statements/components/StatementsListView.test.tsx"`

Expected: FAIL because scanned receipts still map to `source: 'gmail'` and bulk actions still hit statement-only logic.

**Step 3: Write minimal implementation**

- Do not change production code yet beyond what is needed to make the new tests compile.

**Step 4: Run test to verify it still fails for the intended reason**

Run the same command and confirm failures point to the missing scan-vs-gmail behavior.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/gmail-receipt-mapping.test.ts frontend/app/(main)/statements/components/StatementsListView.test.tsx
git commit -m "test(frontend): cover scan receipt bulk actions"
```

### Task 2: Implement frontend document-type separation and bulk action routing

**Files:**
- Modify: `frontend/app/(main)/statements/components/gmail-receipt-mapping.ts`
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsListItem.tsx`
- Modify: `frontend/app/(main)/statements/components/gmail-receipt-mapping.test.ts`
- Modify: `frontend/app/(main)/statements/components/StatementsListView.test.tsx`

**Step 1: Write the failing test**

Use the tests from Task 1 as the failing test suite.

**Step 2: Run test to verify it fails**

Run: `npm run test -- "app/(main)/statements/components/gmail-receipt-mapping.test.ts" "app/(main)/statements/components/StatementsListView.test.tsx"`

Expected: FAIL.

**Step 3: Write minimal implementation**

- Update the mapped statement type so scanned receipts become `source: 'scan'` and Gmail receipts remain `source: 'gmail'`.
- Update any UI helpers that currently treat all receipts as Gmail-only.
- Route scan exports to `GET /receipts/:id/file`.
- Route scan deletes to `DELETE /receipts/:id`.
- Leave Gmail delete/export blocked, but close the menu before returning and dedupe the error toast.
- Preserve existing behavior for real bank statements.

**Step 4: Run test to verify it passes**

Run: `npm run test -- "app/(main)/statements/components/gmail-receipt-mapping.test.ts" "app/(main)/statements/components/StatementsListView.test.tsx"`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/gmail-receipt-mapping.ts frontend/app/(main)/statements/components/StatementsListView.tsx frontend/app/(main)/statements/components/StatementsListItem.tsx frontend/app/(main)/statements/components/gmail-receipt-mapping.test.ts frontend/app/(main)/statements/components/StatementsListView.test.tsx
git commit -m "fix(frontend): separate scan and gmail receipt actions"
```

### Task 3: Lock in backend receipt-scan lifecycle with failing tests

**Files:**
- Modify: `backend/@tests/unit/modules/receipts/receipts.service.spec.ts`
- Modify: `backend/@tests/unit/modules/statements/receipt-statement.service.spec.ts` (create if missing)

**Step 1: Write the failing test**

- Add receipt service coverage that deleting a scanned receipt also removes or trashes its linked statement and cleans up file paths.
- Add receipt-statement service coverage that creating a statement from a scan stores a link back on the receipt.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- receipts.service.spec.ts receipt-statement.service.spec.ts`

Expected: FAIL because receipts have no statement link and delete is a bare repository delete.

**Step 3: Write minimal implementation**

- Only add the smallest type/test scaffolding needed so failures clearly target missing linkage/cascade behavior.

**Step 4: Run test to verify it still fails for the intended reason**

Run the same command and confirm the failures point to missing linkage/cascade cleanup.

**Step 5: Commit**

```bash
git add backend/@tests/unit/modules/receipts/receipts.service.spec.ts backend/@tests/unit/modules/statements/receipt-statement.service.spec.ts
git commit -m "test(backend): cover scan receipt deletion lifecycle"
```

### Task 4: Implement backend receipt-statement linkage and cascading cleanup

**Files:**
- Create: `backend/src/migrations/202603290001-link-scan-receipts-to-statements.ts`
- Modify: `backend/src/entities/receipt.entity.ts`
- Modify: `backend/src/modules/statements/services/receipt-statement.service.ts`
- Modify: `backend/src/modules/receipts/receipts.service.ts`
- Modify: `backend/src/modules/statements/statements.service.ts`
- Modify: `backend/@tests/unit/modules/receipts/receipts.service.spec.ts`
- Modify: `backend/@tests/unit/modules/statements/receipt-statement.service.spec.ts`

**Step 1: Write the failing test**

Use the failing backend tests from Task 3.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- receipts.service.spec.ts receipt-statement.service.spec.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

- Add nullable `statementId` to `Receipt` plus a migration.
- When a scanned receipt creates a derived statement, persist the link.
- Update receipt delete flow to:
  - load the receipt first,
  - delete attached files best-effort,
  - clean up the linked statement/transactions when present,
  - avoid leaving orphaned rows.
- Update statement delete flow to clean up linked scan receipts when appropriate.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- receipts.service.spec.ts receipt-statement.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/migrations/202603290001-link-scan-receipts-to-statements.ts backend/src/entities/receipt.entity.ts backend/src/modules/statements/services/receipt-statement.service.ts backend/src/modules/receipts/receipts.service.ts backend/src/modules/statements/statements.service.ts backend/@tests/unit/modules/receipts/receipts.service.spec.ts backend/@tests/unit/modules/statements/receipt-statement.service.spec.ts
git commit -m "fix(receipts): link scanned receipts to statements"
```

### Task 5: Verify end-to-end behavior stays correct

**Files:**
- Modify only if verification reveals regressions.

**Step 1: Run focused frontend verification**

Run: `cd frontend && npm run test -- "app/(main)/statements/components/gmail-receipt-mapping.test.ts" "app/(main)/statements/components/StatementsListView.test.tsx"`

Expected: PASS.

**Step 2: Run focused backend verification**

Run: `cd backend && npm run test -- receipts.service.spec.ts receipt-statement.service.spec.ts`

Expected: PASS.

**Step 3: Run broader regression checks**

Run: `make test-frontend` and `make test-backend` if time/cost is acceptable, otherwise run the nearest affected suites.

Expected: PASS, or document any unrelated pre-existing failures.

**Step 4: Commit**

```bash
git add <only files changed during verification>
git commit -m "test: verify receipt entity separation flows"
```
