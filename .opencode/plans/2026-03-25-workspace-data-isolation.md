# Workspace Data Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure complete data isolation between workspaces — no data from one workspace leaks into another.

**Architecture:** Add `workspaceId` (NOT NULL) to all business entities currently scoped only by `userId` (Wallet, Branch, Tag, DataEntry, DataEntryCustomField, StorageView). Enforce workspace context via `WorkspaceContextGuard` on all controllers. Convert all service-layer queries from `userId`-based to `workspaceId`-based filtering. Make existing nullable `workspaceId` columns required.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Next.js 14, Axios, React Context

---

## Current State Summary

### What works
- `WorkspaceContextGuard` validates `X-Workspace-Id` header + workspace membership
- `@WorkspaceId()` / `@CurrentWorkspace()` decorators extract workspace from request
- Frontend `WorkspaceProvider` stores `currentWorkspaceId` in localStorage
- Axios interceptor attaches `X-Workspace-Id` header on every request
- Core entities (Transaction, Statement, Category, Payable, Receipt) have `workspaceId`

### Gaps identified
1. **5 entities missing `workspaceId`:** Wallet, Branch, Tag, DataEntry, DataEntryCustomField
2. **1 entity missing `workspaceId`:** StorageView
3. **~10 controllers** don't use `WorkspaceContextGuard`
4. **ReportsService** older methods filter by `statement.userId` instead of `workspaceId`
5. **ClassificationController** queries transactions by ID only (no workspace/user check)
6. **Many `workspaceId` columns are nullable** — allows orphaned records
7. **Notifications/Insights** accept `workspaceId` as optional query param, not enforced via guard

---

## Phase 1: Database Migrations — Add `workspaceId` to Missing Entities

### Task 1.1: Add `workspaceId` to Wallet entity + migration

**Files:**
- Modify: `backend/src/entities/wallet.entity.ts`
- Create: `backend/src/migrations/1764200000000-AddWorkspaceIdToWallets.ts`

**Step 1: Update the Wallet entity**

Add workspace relation to `backend/src/entities/wallet.entity.ts`:

```typescript
import { Workspace } from './workspace.entity';

// Add after the userId column:
@ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'workspace_id' })
workspace: Workspace;

@Column({ name: 'workspace_id' })
workspaceId: string;
```

**Step 2: Create migration**

Create `backend/src/migrations/1764200000000-AddWorkspaceIdToWallets.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToWallets1764200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add nullable column
    await queryRunner.query(`ALTER TABLE "wallets" ADD COLUMN "workspace_id" uuid`);

    // 2. Backfill from user's current workspace
    await queryRunner.query(`
      UPDATE "wallets" w
      SET "workspace_id" = COALESCE(
        u."workspace_id",
        (SELECT wm."workspace_id" FROM "workspace_members" wm WHERE wm."user_id" = w."user_id" ORDER BY wm."created_at" ASC LIMIT 1)
      )
      FROM "users" u
      WHERE w."user_id" = u."id"
    `);

    // 3. Delete orphan records that couldn't be assigned
    await queryRunner.query(`DELETE FROM "wallets" WHERE "workspace_id" IS NULL`);

    // 4. Make NOT NULL
    await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "workspace_id" SET NOT NULL`);

    // 5. Add FK constraint
    await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_wallets_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE`);

    // 6. Add index
    await queryRunner.query(`CREATE INDEX "IDX_wallets_workspace_id" ON "wallets" ("workspace_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_wallets_workspace_id"`);
    await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_wallets_workspace"`);
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "workspace_id"`);
  }
}
```

**Step 3: Run migration**

```bash
cd backend && npm run migration:run
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(wallets): add workspaceId column with data migration"
```

---

### Task 1.2: Add `workspaceId` to Branch entity + migration

**Files:**
- Modify: `backend/src/entities/branch.entity.ts`
- Create: `backend/src/migrations/1764200000001-AddWorkspaceIdToBranches.ts`

**Step 1: Update the Branch entity**

Add to `backend/src/entities/branch.entity.ts` (same pattern as Wallet):

```typescript
import { Workspace } from './workspace.entity';

@ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'workspace_id' })
workspace: Workspace;

@Column({ name: 'workspace_id' })
workspaceId: string;
```

**Step 2: Create migration**

Create `backend/src/migrations/1764200000001-AddWorkspaceIdToBranches.ts` — same pattern as Wallet migration but for `"branches"` table.

**Step 3: Run migration and commit**

```bash
cd backend && npm run migration:run
git add -A && git commit -m "feat(branches): add workspaceId column with data migration"
```

---

### Task 1.3: Add `workspaceId` to Tag entity + migration

**Files:**
- Modify: `backend/src/entities/tag.entity.ts`
- Create: `backend/src/migrations/1764200000002-AddWorkspaceIdToTags.ts`

**Step 1: Update the Tag entity**

Replace `userId` with `workspaceId` in `backend/src/entities/tag.entity.ts`:

```typescript
import { Workspace } from './workspace.entity';

// Remove: @Column({ name: 'user_id', nullable: true }) userId: string | null;
// Add:
@ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'workspace_id' })
workspace: Workspace;

@Column({ name: 'workspace_id' })
workspaceId: string;
```

**Step 2: Create migration**

Same backfill pattern. Additionally drop the `user_id` column after `workspace_id` is populated.

**Step 3: Run migration and commit**

```bash
cd backend && npm run migration:run
git add -A && git commit -m "feat(tags): replace userId with workspaceId"
```

---

### Task 1.4: Add `workspaceId` to DataEntry + DataEntryCustomField entities + migration

**Files:**
- Modify: `backend/src/entities/data-entry.entity.ts`
- Modify: `backend/src/entities/data-entry-custom-field.entity.ts`
- Create: `backend/src/migrations/1764200000003-AddWorkspaceIdToDataEntries.ts`

**Step 1: Update DataEntry entity**

In `backend/src/entities/data-entry.entity.ts`:
- Add `workspaceId` + `workspace` relation (same pattern)
- Update indexes: `['userId', 'type', 'date']` → `['workspaceId', 'type', 'date']`
- Update indexes: `['userId', 'customTabId', 'date']` → `['workspaceId', 'customTabId', 'date']`

**Step 2: Update DataEntryCustomField entity**

In `backend/src/entities/data-entry-custom-field.entity.ts`:
- Add `workspaceId` + `workspace` relation
- Update unique index: `['userId', 'name']` → `['workspaceId', 'name']`

**Step 3: Create combined migration**

Migration must:
1. Add `workspace_id` to both `data_entries` and `data_entry_custom_fields` tables
2. Backfill from user's current workspace
3. Drop old indexes
4. Create new indexes with `workspace_id`
5. Make `workspace_id` NOT NULL

**Step 4: Run migration and commit**

```bash
cd backend && npm run migration:run
git add -A && git commit -m "feat(data-entry): add workspaceId to DataEntry and DataEntryCustomField"
```

---

### Task 1.5: Add `workspaceId` to StorageView entity + migration

**Files:**
- Modify: `backend/src/entities/storage-view.entity.ts`
- Create: `backend/src/migrations/1764200000004-AddWorkspaceIdToStorageViews.ts`

**Step 1: Update StorageView entity**

```typescript
import { Workspace } from './workspace.entity';

@ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'workspace_id' })
workspace: Workspace;

@Column({ name: 'workspace_id' })
workspaceId: string;
```

**Step 2: Create migration** (same backfill pattern)

**Step 3: Run migration and commit**

```bash
cd backend && npm run migration:run
git add -A && git commit -m "feat(storage): add workspaceId to StorageView"
```

---

### Task 1.6: Make existing nullable `workspaceId` columns NOT NULL

**Files:**
- Create: `backend/src/migrations/1764200000005-MakeWorkspaceIdNotNull.ts`
- Modify: entities to remove `| null` from type annotations

**Entities to update (remove nullable from workspaceId):**
- `Transaction` (`backend/src/entities/transaction.entity.ts:35`)
- `Statement` (`backend/src/entities/statement.entity.ts:67`)
- `Category` (`backend/src/entities/category.entity.ts:47`)
- `AuditEvent` (`backend/src/entities/audit-event.entity.ts:104`)
- `Notification` (`backend/src/entities/notification.entity.ts:62`)
- `Insight` (`backend/src/entities/insight.entity.ts:65`)
- `CustomTable` (`backend/src/entities/custom-table.entity.ts:40`)
- `Folder` (`backend/src/entities/folder.entity.ts:31`)
- `TaxRate` (`backend/src/entities/tax-rate.entity.ts:22`)
- `GoogleSheetsCredential` (`backend/src/entities/google-sheets-credential.entity.ts:32`)
- `GoogleSheet` (`backend/src/entities/google-sheet.entity.ts:36`)
- `Integration` (`backend/src/entities/integration.entity.ts:41`)
- `CategorizationRule` (`backend/src/entities/categorization-rule.entity.ts:34`)
- `CategoryLearning` (`backend/src/entities/category-learning.entity.ts:22`)
- `IdempotencyKey` (`backend/src/entities/idempotency-key.entity.ts:32`)

**Migration:**
1. For each table, backfill NULL `workspace_id` using user's current workspace
2. Delete orphan records where `workspace_id` is still NULL
3. `ALTER COLUMN workspace_id SET NOT NULL`

**Also update entity TypeScript types:** remove `| null` from `workspaceId` property, change `nullable: true` to remove nullable option in `@Column` decorator.

**Commit:**

```bash
cd backend && npm run migration:run
git add -A && git commit -m "feat(entities): make workspaceId NOT NULL on all business entities"
```

---

## Phase 2: Backend Guards — Protect All Controllers

### Task 2.1: Add `WorkspaceContextGuard` to unprotected controllers

**Files to modify:**
1. `backend/src/modules/wallets/wallets.controller.ts`
2. `backend/src/modules/branches/branches.controller.ts`
3. `backend/src/modules/data-entry/data-entry.controller.ts`
4. `backend/src/modules/reports/reports.controller.ts`
5. `backend/src/modules/storage/storage.controller.ts`
6. `backend/src/modules/notifications/notifications.controller.ts`
7. `backend/src/modules/insights/insights.controller.ts`
8. `backend/src/modules/classification/classification.controller.ts`

**For each controller:**

1. Import `WorkspaceContextGuard` and `WorkspaceId` decorator:
```typescript
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
```

2. Add guard at class level:
```typescript
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
```

3. Add `@WorkspaceId() workspaceId: string` parameter to each handler method.

4. Pass `workspaceId` instead of `user.id` to service methods.

**Special cases:**
- **StorageController**: Has 2 `@Public()` endpoints for shared links — these must remain without workspace guard. Apply `WorkspaceContextGuard` per-method on non-public endpoints instead of class-level.
- **NotificationsController**: Remove `@Query('workspaceId')` parameter — use `@WorkspaceId()` decorator instead.
- **InsightsController**: Same as Notifications.

**Commit:**

```bash
git add -A && git commit -m "feat(guards): add WorkspaceContextGuard to all business controllers"
```

---

## Phase 3: Service-Level Workspace Filtering

### Task 3.1: Update WalletsService to use workspaceId

**File:** `backend/src/modules/wallets/wallets.service.ts`

Replace `userId` parameter with `workspaceId` in all methods:

| Method | Before | After |
|--------|--------|-------|
| `create` | `create(userId, dto)` → `{ userId, ...dto }` | `create(workspaceId, dto)` → `{ workspaceId, ...dto }` |
| `findAll` | `where: { userId }` | `where: { workspaceId }` |
| `findOne` | `where: { id, userId }` | `where: { id, workspaceId }` |
| `update` | `update(id, userId, dto)` | `update(id, workspaceId, dto)` |
| `remove` | `remove(id, userId)` | `remove(id, workspaceId)` |

**Commit:**
```bash
git add -A && git commit -m "feat(wallets): scope all queries by workspaceId"
```

---

### Task 3.2: Update BranchesService to use workspaceId

**File:** `backend/src/modules/branches/branches.service.ts`

Same pattern as WalletsService — replace `userId` with `workspaceId` in all methods.

**Commit:**
```bash
git add -A && git commit -m "feat(branches): scope all queries by workspaceId"
```

---

### Task 3.3: Update DataEntryService to use workspaceId

**File:** `backend/src/modules/data-entry/data-entry.service.ts`

1. Replace `userId` filtering with `workspaceId` in all query methods
2. Update `ensureCanEditDataEntry` — it already loads workspace context, adapt to use the passed `workspaceId` directly
3. Update `ListParams` interface: `userId: string` → `workspaceId: string`
4. Update `listCustomFields`: query by `workspaceId`
5. Update `createCustomField`/`updateCustomField`/`removeCustomField`: query by `workspaceId`
6. Update `removeBaseTab`: use `workspaceId` when deleting entries

**Commit:**
```bash
git add -A && git commit -m "feat(data-entry): scope all queries by workspaceId"
```

---

### Task 3.4: Update StorageService — tags, views, folders

**File:** `backend/src/modules/storage/storage.service.ts`

1. **Tags CRUD** (lines 386-446): Replace `userId` with `workspaceId`:
   - `createTag(dto, workspaceId)` — create with `workspaceId`
   - `listTags(workspaceId)` — `where: { workspaceId }` (remove the `OR userId IS NULL` fallback)
   - `updateTag(tagId, dto, workspaceId)` — `where: { id: tagId, workspaceId }`
   - `deleteTag(tagId, workspaceId)` — `where: { id: tagId, workspaceId }`

2. **Views CRUD** (lines 616-641): Replace `userId` with `workspaceId`:
   - `createView(dto, workspaceId)` — create with `workspaceId`
   - `listViews(workspaceId)` — `where: { workspaceId }`
   - `deleteView(id, workspaceId)` — `where: { id, workspaceId }`

3. **getStorageFiles** (lines 94-282): Already has some workspace awareness via `getUserContext`, but needs to consistently use `workspaceId` parameter from guard rather than deriving from user lookup.

**Commit:**
```bash
git add -A && git commit -m "feat(storage): scope tags, views, and files by workspaceId"
```

---

### Task 3.5: Fix ReportsService — replace userId with workspaceId

**File:** `backend/src/modules/reports/reports.service.ts`

**Critical fix.** The older report methods use `statement.userId` which aggregates across ALL workspaces.

Methods to update (replace `.where('statement.userId = :userId', { userId })` with `.where('transaction.workspaceId = :workspaceId', { workspaceId })`):
1. `generateDailyReport` (line 528)
2. `generateMonthlyReport` (lines 629, 703)
3. `generateCustomReport` (line 825)
4. `getStatementsSummary` (line 1086)
5. `getTopCategoriesReport` (line 1175)
6. `getSpendOverTimeReport` (line 1445)
7. `getLatestTransactionDate` (line 800)
8. `getCustomTablesSummary` (line 330): `.find({ where: { userId } })` → `.find({ where: { workspaceId } })`

**Update method signatures:** All methods that accept `userId: string` should accept `workspaceId: string` instead. Update the controller to pass `@WorkspaceId()` value.

**Commit:**
```bash
git add -A && git commit -m "fix(reports): scope all report queries by workspaceId instead of userId"
```

---

### Task 3.6: Fix ClassificationController — add workspace scoping

**File:** `backend/src/modules/classification/classification.controller.ts`

**Security fix:** Currently queries `{ where: { id } }` with no user/workspace check.

Update `classifyTransaction`:
```typescript
// Before:
const transaction = await this.transactionRepository.findOne({ where: { id } });

// After:
const transaction = await this.transactionRepository.findOne({
  where: { id, workspaceId },
});
```

Same for `classifyBulk` and `recordLearning`.

**Commit:**
```bash
git add -A && git commit -m "fix(classification): add workspaceId filter to prevent cross-workspace access"
```

---

### Task 3.7: Fix Notifications and Insights — enforce workspace via guard

**Files:**
- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/insights/insights.controller.ts`
- `backend/src/modules/insights/insights.service.ts`

**Notifications:**
1. Remove `@Query('workspaceId') workspaceId?: string` from handlers
2. Use `@WorkspaceId() workspaceId: string` (from guard, always present)
3. Update service methods to require `workspaceId` (not optional)

**Insights:**
1. Same pattern — remove optional query param, use guard-provided `@WorkspaceId()`
2. Update `refresh`, `list`, `summary` to require `workspaceId`

**Commit:**
```bash
git add -A && git commit -m "fix(notifications,insights): enforce workspaceId via guard instead of optional query param"
```

---

## Phase 4: Cross-Workspace ID Access Protection

### Task 4.1: Audit and fix all findOne/update/delete by ID

**Goal:** Every query that loads a record by its UUID must also include `workspaceId` in the WHERE clause.

**Pattern to apply everywhere:**
```typescript
// Before:
await repo.findOne({ where: { id } });

// After:
await repo.findOne({ where: { id, workspaceId } });
```

**Services to audit:**
- `TransactionsService` — verify all CRUD includes workspaceId (should already be done)
- `StatementsService` — verify
- `CategoriesService` — verify
- `WalletsService` — will have workspaceId after Task 3.1
- `BranchesService` — will have workspaceId after Task 3.2
- `DataEntryService` — will have workspaceId after Task 3.3
- `StorageService` — tags/views/files
- `PayablesService` — verify
- `CustomTablesService` — verify
- `TaxRatesService` — verify
- `FoldersService` — verify (entity already has workspaceId)

**Commit:**
```bash
git add -A && git commit -m "fix(security): ensure all findOne/update/delete queries include workspaceId"
```

---

## Phase 5: Frontend — Workspace Switch Cache Invalidation

### Task 5.1: Clear React Query cache on workspace switch

**File:** `frontend/app/contexts/WorkspaceContext.tsx`

In the `switchWorkspace` function, after successful switch, invalidate all queries:

```typescript
import { useQueryClient } from '@tanstack/react-query';

// Inside WorkspaceProvider:
const queryClient = useQueryClient();

const switchWorkspace = async (id: string) => {
  // ... existing switch logic ...
  
  // After successful switch:
  queryClient.clear(); // Remove all cached data
};
```

**Note:** Check if `useQueryClient` can be used inside the provider. If `WorkspaceProvider` is not wrapped by `QueryClientProvider`, pass `queryClient` instance directly or restructure provider hierarchy.

---

### Task 5.2: Verify localStorage isolation

**Files to check:**
- Search `frontend/app/` for `localStorage.getItem` / `localStorage.setItem` to find workspace-specific cached data (filters, sort preferences, view states)
- If any localStorage keys store data without workspace prefix, add workspace prefix or clear on switch

---

### Task 5.3: Commit frontend changes

```bash
git add -A && git commit -m "feat(frontend): clear all caches on workspace switch"
```

---

## Phase 6: Testing

### Task 6.1: Unit tests for workspace isolation

**Files to create:**
- `backend/@tests/unit/wallets/wallets-workspace-isolation.spec.ts`
- `backend/@tests/unit/branches/branches-workspace-isolation.spec.ts`
- `backend/@tests/unit/reports/reports-workspace-isolation.spec.ts`

**Test pattern for each service:**
```typescript
describe('WorkspaceIsolation', () => {
  it('should not return data from another workspace', async () => {
    const walletA = await service.create(workspaceIdA, { name: 'Test' });
    
    const walletsB = await service.findAll(workspaceIdB);
    expect(walletsB).not.toContainEqual(expect.objectContaining({ id: walletA.id }));
  });

  it('should not allow access by ID from another workspace', async () => {
    const walletA = await service.create(workspaceIdA, { name: 'Test' });
    
    await expect(service.findOne(walletA.id, workspaceIdB))
      .rejects.toThrow(NotFoundException);
  });
});
```

---

### Task 6.2: E2E test for workspace isolation

**File:** `backend/@tests/e2e/workspace-isolation.e2e-spec.ts`

Test that:
1. Create 2 workspaces for the same user
2. Create wallets, branches, tags, data entries in workspace A
3. Switch to workspace B (change X-Workspace-Id header)
4. API calls should return empty results
5. API calls with IDs from workspace A should return 404

---

### Task 6.3: Run all tests and fix failures

```bash
make test
```

**Commit:**
```bash
git add -A && git commit -m "test: add workspace isolation tests"
```

---

## Execution Order

```
Phase 1 (Tasks 1.1-1.6): Database migrations
  ↓
Phase 2 (Task 2.1): Controller guards
  ↓
Phase 3 (Tasks 3.1-3.7): Service-level filtering
  ↓
Phase 4 (Task 4.1): ID access protection audit
  ↓
Phase 5 (Tasks 5.1-5.3): Frontend cache invalidation
  ↓
Phase 6 (Tasks 6.1-6.3): Testing
```

## Risk Mitigation

1. **Data loss during migration:** Backfill strategy uses `COALESCE(user.workspaceId, first workspace member)`. Records with no assignable workspace are deleted (should be 0 in practice).
2. **Breaking API contracts:** Controllers that previously accepted `userId` now require `X-Workspace-Id` header. Frontend already sends this header — no client changes needed for existing endpoints.
3. **Performance:** New `workspaceId` indexes replace `userId` indexes, maintaining query performance.
4. **Rollback:** Each migration has a `down()` method. Entity changes can be reverted alongside migration rollback.
