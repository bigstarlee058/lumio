# jscpd Code Deduplication Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the most impactful code duplication detected by jscpd across backend (178 clones, 4.71%) and frontend (39 clones, 2.18%) codebases.

**Architecture:** Extract shared abstractions bottom-up: shared utilities first, then base classes, then cross-module patterns. Each task is independently testable and committable. Migrations are excluded from refactoring (immutable by design).

**Tech Stack:** NestJS, TypeScript, Next.js 14, Jest

---

## Summary of jscpd Findings

| Area | Total Lines | Clones | Duplicate Lines | Duplication % |
|------|-------------|--------|-----------------|---------------|
| Backend | 57,304 | 178 | 2,699 | 4.71% |
| Frontend | 22,378 | 39 | 487 | 2.18% |

**Top Backend Hotspots:**
- `google-drive.service.ts` (20 clones) + `dropbox.service.ts` (17 clones) — cloud storage OAuth/file ops
- `bereke-new.parser.ts` + `bereke-old.parser.ts` (16 clones each) — near-identical bank parsers
- `dashboard.service.ts` (16 clones) — repeated query/aggregation blocks
- `gmail-receipt-parser.service.ts` (10 clones) + `universal-extractor.service.ts` (9 clones) — receipt extraction
- `statements.controller.ts` (13 clones) + sibling controllers — boilerplate patterns
- Entity files (~20 clones combined) — repeated TypeORM column decorators
- Report DTOs — shared filter fields

**Top Frontend Hotspots:**
- `top-spenders.utils.ts` (7), `top-merchants.utils.ts` (5), `top-categories.utils.ts` (4), `spend-over-time.utils.ts` (3) — duplicated analytics helpers
- `dropbox/page.content.ts` + `google-drive/page.content.ts` (3 each) — near-identical i18n
- `googleDrivePicker.ts` + `googleSheetsPicker.ts` — picker initialization

**NOTE:** Migration files (1733000000000-InitBaseSchema.ts etc.) contain ~20 clones but are **excluded** from refactoring because migrations are immutable historical records.

---

## Priority and Ordering

Tasks ordered by: risk (ascending), independence (most isolated first), impact (lines saved).

| # | Cluster | Est. Lines Saved | Risk | Files Touched |
|---|---------|-----------------|------|---------------|
| 1 | Frontend analytics shared utils | ~120 | Low | 4+1 new |
| 2 | Integration i18n content factory | ~80 | Low | 2+1 new |
| 3 | Receipt extraction dedup | ~100 | Medium | 2-3 |
| 4 | Report DTO base class | ~60 | Low | 2+1 new |
| 5 | Dashboard service internal | ~80 | Medium | 1 |
| 6 | Bereke parsers base class | ~300 | Medium | 2+1 new |
| 7 | Cloud storage base class | ~500 | High | 3+1 new |
| 8 | Controller utility extraction | ~60 | Medium | 4-5 |
| 9 | Entity base mixins | ~50 | Low | cosmetic |

---

## Task 1: Extract Shared Frontend Analytics Utilities

**Rationale:** `parseAmount`, `resolveSourceChannel`, `sortAggregateRows`, `buildPreviousPeriodRange`, `getComparisonDelta`, and debit/credit flow resolution are copy-pasted across 4 analytics util files with identical logic.

**Files:**
- Create: `frontend/app/(main)/statements/components/shared-analytics.utils.ts`
- Create: `frontend/app/(main)/statements/components/shared-analytics.utils.test.ts`
- Modify: `frontend/app/(main)/statements/components/top-spenders.utils.ts`
- Modify: `frontend/app/(main)/statements/components/top-merchants.utils.ts`
- Modify: `frontend/app/(main)/statements/components/top-categories.utils.ts`
- Modify: `frontend/app/(main)/statements/components/spend-over-time.utils.ts`
- Test: existing test files for each util

**Step 1: Create the shared utils file**

Extract these functions into `shared-analytics.utils.ts`:
- `parseAmount(value?: number | string | null): number`
- `RECEIPT_FILE_TYPES: Set<string>`
- `resolveSourceChannel(input: { sourceType?: string; fileType?: string | null }): 'gmail' | 'receipt' | 'bank'`
- `sortAggregateRows<T extends { total: number; average: number; count: number }>(rows: T[], key: string): T[]`
- `buildPreviousPeriodRange(currentStart: Date, currentEnd: Date): { start: Date; end: Date } | null`
- `getComparisonDelta(current: number, previous: number): { delta: number; percentage: number; trend: string }`
- `resolveFlowType(input: { amount?: ...; debit?: ...; credit?: ...; transactionType?: string }): { flowType: 'spend' | 'income' | 'expense'; amount: number }`
- `formatDateISO(date: Date): string` (the `YYYY-MM-DD` formatter duplicated in spend-over-time and statement-filters)

**Step 2: Write tests for shared utils**

Move/consolidate the existing test cases from `top-merchants.utils.test.ts` and `top-spenders.utils.test.ts` that test shared functions into `shared-analytics.utils.test.ts`.

**Step 3: Update the 4 consumer files**

Replace local definitions with imports from `shared-analytics.utils.ts`. Each consumer keeps only its domain-specific logic (e.g., `resolveMerchantFlowForRow`, `resolveTopCategoryData`, bucket grouping).

**Step 4: Run existing tests**

```bash
cd frontend && npx jest --testPathPattern="statements/components" --no-coverage
```

Expected: all tests pass with no changes to test expectations.

**Step 5: Commit**

```bash
git add frontend/app/\(main\)/statements/components/
git commit -m "refactor(frontend): extract shared analytics utilities from statement components"
```

---

## Task 2: Extract Integration Page Content Factory

**Rationale:** `dropbox/page.content.ts` and `google-drive/page.content.ts` share ~80% identical i18n content (status strings, sync labels, error messages, button text). Only the provider name and a few provider-specific strings differ.

**Files:**
- Create: `frontend/app/integrations/shared/make-cloud-storage-content.ts`
- Modify: `frontend/app/integrations/dropbox/page.content.ts`
- Modify: `frontend/app/integrations/google-drive/page.content.ts`

**Step 1: Create the content factory**

Build `makeCloudStorageContent(provider: { name: { ru, en, kk }, key: string })` that returns the shared i18n object with provider name interpolated. Include the common: `status`, `sync`, `errors`, `buttons`, `table`, `emptyState` sections.

**Step 2: Reduce consumer files to factory calls + overrides**

Each page.content.ts becomes:
```typescript
import { makeCloudStorageContent } from '../shared/make-cloud-storage-content';
const base = makeCloudStorageContent({ name: { ru: 'Dropbox', en: 'Dropbox', kk: 'Dropbox' }, key: 'dropbox' });
export const content = { ...base, /* provider-specific overrides */ };
```

**Step 3: Verify**

```bash
cd frontend && npx jest --testPathPattern="integrations" --no-coverage 2>/dev/null; echo "Check manually if integration pages render"
```

**Step 4: Commit**

```bash
git commit -m "refactor(frontend): extract cloud storage integration i18n content factory"
```

---

## Task 3: Deduplicate Receipt Extraction Logic

**Rationale:** `gmail-receipt-parser.service.ts` and `universal-extractor.service.ts` share ~6 blocks of duplicated code. The utilities `receipt-text.util.ts` and `receipt-amount.util.ts` already exist in `common/utils/` but the services still contain their own copies.

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Modify: `backend/src/modules/parsing/services/universal-extractor.service.ts`
- Reference: `backend/src/common/utils/receipt-text.util.ts`
- Reference: `backend/src/common/utils/receipt-amount.util.ts`
- Reference: `backend/src/common/utils/ai-response.util.ts`

**Step 1: Identify remaining inline copies**

The receipt-amount and receipt-text utils already exist. The services still have inline copies of:
- Amount parsing/extraction logic (matches `receipt-amount.util.ts`)
- Text extraction/normalization (matches `receipt-text.util.ts`)
- AI response cleanup (matches `ai-response.util.ts`)
- Shared merchant-reparse patterns between `gmail-merchant-reparse.service.ts` and `gmail-receipt-parser.service.ts`

**Step 2: Replace inline copies with imports**

In each service file, replace the duplicated blocks with imports from the existing utils. Verify parameter signatures match.

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="gmail|parsing" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): use existing receipt utils instead of inline copies"
```

---

## Task 4: Extract Report DTO Base Class

**Rationale:** `spend-over-time-query.dto.ts` and `top-categories-query.dto.ts` share ~60 lines of identical filter fields (dateFrom, dateTo, type, currencies, statuses, keywords, amountMin, amountMax, approved, billable). Similarly, `filter-payables.dto.ts` and `filter-statements.dto.ts` share ~27 lines.

**Files:**
- Create: `backend/src/modules/reports/dto/base-report-query.dto.ts`
- Modify: `backend/src/modules/reports/dto/spend-over-time-query.dto.ts`
- Modify: `backend/src/modules/reports/dto/top-categories-query.dto.ts`
- Create: `backend/src/common/dto/base-filter.dto.ts` (shared date/amount/status filters)
- Modify: `backend/src/modules/payables/dto/filter-payables.dto.ts`
- Modify: `backend/src/modules/statements/dto/filter-statements.dto.ts`

**Step 1: Create base DTO with shared validated fields**

```typescript
// base-report-query.dto.ts
export class BaseReportQueryDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsIn(['income', 'expense', 'all']) type?: 'income' | 'expense' | 'all';
  @IsOptional() @IsString() currencies?: string;
  @IsOptional() @IsString() statuses?: string;
  @IsOptional() @IsString() keywords?: string;
  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : Number(value))) @Min(0) amountMin?: number;
  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : Number(value))) @Min(0) amountMax?: number;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === true || value === 'true') approved?: boolean;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === true || value === 'true') billable?: boolean;
}
```

**Step 2: Extend in consumer DTOs**

```typescript
export class SpendOverTimeQueryDto extends BaseReportQueryDto {
  @IsOptional() @IsIn(['day', 'week', 'month']) groupBy?: string;
}
```

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="reports|payables|statements" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): extract base report query DTO to reduce filter duplication"
```

---

## Task 5: Refactor Dashboard Service Internal Duplication

**Rationale:** `dashboard.service.ts` (791 lines) has ~16 internal clones. The repeated patterns are: date-range query builders, period comparison calculations, and wallet/category aggregation blocks that appear 3-4 times with minor parameter differences.

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`
- Test: `backend/@tests/unit/` or `backend/@tests/e2e/` (dashboard-related)

**Step 1: Extract internal helper methods**

Identify the 3 repeated patterns:
1. **Date-range query builder** — repeated at ~lines 119, 299, 330, 776 — extract to `private buildDateRangeWhere(start, end, field)`
2. **Period comparison block** — repeated at ~lines 288-311, 702-725 — extract to `private calculatePeriodComparison(current, previous)`
3. **Aggregation block** — repeated at ~lines 328-374, 730-769 — extract to `private aggregateByField(data, field, options)`

**Step 2: Replace inline blocks with method calls**

Each repetition becomes a call to the extracted private method.

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="dashboard" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): extract repeated dashboard query helpers into private methods"
```

---

## Task 6: Merge Bereke Parsers via Base Class

**Rationale:** `bereke-new.parser.ts` (565 lines) and `bereke-old.parser.ts` (581 lines) are nearly identical — 16 clone blocks totaling ~400+ lines. The differences are format-specific details (column positions, date formats, header patterns).

**Files:**
- Create: `backend/src/modules/parsing/parsers/bereke-base.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/bereke-new.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/bereke-old.parser.ts`
- Test: existing parser tests

**Step 1: Create abstract base class**

```typescript
export abstract class BerekeBaseParser {
  abstract readonly formatVersion: string;
  abstract getColumnMapping(): Record<string, number>;
  abstract parseDateValue(raw: string): Date;
  abstract getHeaderPattern(): RegExp;

  // All shared logic goes here:
  // - parse() main flow
  // - row iteration
  // - amount extraction
  // - transaction building
  // - validation
}
```

**Step 2: Reduce each parser to overrides only**

Each parser becomes ~50-80 lines (just the abstract method implementations and any truly unique logic).

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="bereke" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): extract Bereke base parser class, deduplicate old/new variants"
```

---

## Task 7: Extract Cloud Storage Integration Base Class

**Rationale:** This is the largest duplication cluster. `dropbox.service.ts` (785 lines), `google-drive.service.ts` (742 lines), and `gmail-oauth.service.ts` (391 lines) share massive blocks of OAuth flow, token refresh, file listing, file download, sync orchestration, and error handling.

**Files:**
- Create: `backend/src/common/services/cloud-storage-base.service.ts`
- Modify: `backend/src/modules/dropbox/dropbox.service.ts`
- Modify: `backend/src/modules/google-drive/google-drive.service.ts`
- Modify: `backend/src/modules/gmail/services/gmail-oauth.service.ts`
- Test: existing integration tests

**Step 1: Create abstract base class**

Shared infrastructure:
- `abstract getProviderName(): string`
- `abstract buildAuthUrl(state): string`
- `abstract exchangeCodeForTokens(code): Promise<Tokens>`
- `abstract refreshAccessToken(refreshToken): Promise<Tokens>`
- `abstract listFiles(credentials, folder): Promise<File[]>`
- `abstract downloadFile(credentials, fileId): Promise<Buffer>`
- Shared: `handleOAuthCallback()`, `ensureValidToken()`, `syncFiles()`, `disconnectIntegration()`, `getIntegrationStatus()`

**Step 2: Refactor each service to extend base**

Each service only implements the provider-specific abstract methods and any unique endpoints.

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="dropbox|google-drive|gmail" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): extract cloud storage base service for OAuth/sync deduplication"
```

---

## Task 8: Extract Controller Utility Functions

**Rationale:** Controllers share: import stacks, decorator patterns, stream response handling (~32 lines), MIME type detection, and pagination query parsing. Extracting utilities reduces ~60 lines per controller pair.

**Files:**
- Create: `backend/src/common/utils/stream-response.util.ts`
- Create: `backend/src/common/decorators/workspace-endpoint.decorator.ts` (optional)
- Modify: `backend/src/modules/statements/statements.controller.ts`
- Modify: `backend/src/modules/storage/storage.controller.ts`
- Modify: `backend/src/modules/receipts/receipts.controller.ts`

**Step 1: Extract stream response helper**

The repeated `streamFile(res, buffer, filename, mimeType)` pattern appears in statements.controller.ts (~lines 276-302) and storage.controller.ts (~lines 364-395).

```typescript
// stream-response.util.ts
export function streamFileResponse(res: Response, buffer: Buffer, filename: string, mimeType: string) {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}
```

**Step 2: Replace inline blocks with utility calls**

**Step 3: Run tests**

```bash
cd backend && npx jest --testPathPattern="controller" --no-coverage
```

**Step 4: Commit**

```bash
git commit -m "refactor(backend): extract shared controller stream/response utilities"
```

---

## Task 9: Entity Base Column Mixins (Low Priority / Cosmetic)

**Rationale:** ~20 clones across entity files from repeated TypeORM column decorator patterns (`@Column`, `@CreateDateColumn`, `@UpdateDateColumn`, `@ManyToOne`, workspace relations). This is mostly structural ORM boilerplate. Also, `drive-settings.entity.ts` and `dropbox-settings.entity.ts` are near-identical (32 lines shared).

**Recommendation:** This is the lowest-impact task. The entity duplication is largely inherent to TypeORM's decorator pattern and aggressive extraction would hurt readability.

**Optional actions:**
- Merge `drive-settings.entity.ts` and `dropbox-settings.entity.ts` into a `cloud-storage-settings.entity.ts` with a discriminator column
- Create a `WorkspaceOwnedEntity` base class with `workspace`, `createdAt`, `updatedAt` columns that ~15 entities could extend

**Risk:** Changing entity inheritance affects TypeORM metadata, table generation, and all repositories. Only do this if the team is comfortable with the migration implications.

---

## Excluded from Refactoring

1. **Migration files** (~20 clones in `backend/src/migrations/`) — Migrations are immutable historical records. Deduplicating them would break the migration chain.

2. **Test file duplication** (~10 clones in test files) — Test data setup duplication is often intentional for test isolation. Can be addressed separately with shared test fixtures if desired.

3. **Entity TypeORM decorators** (most of Task 9) — Extracting too aggressively hurts readability. Keep as optional/cosmetic.

---

## Estimated Impact

| Metric | Before | After (estimated) |
|--------|--------|-------------------|
| Backend clones | 178 | ~90-100 |
| Backend dup % | 4.71% | ~2.5% |
| Frontend clones | 39 | ~15-20 |
| Frontend dup % | 2.18% | ~1.0% |
| Lines removed | — | ~800-1000 |
| New shared files | — | ~8 |

---

## Verification

After all tasks complete, run full jscpd scan to verify reduction:

```bash
jscpd backend/src --min-lines 5 --min-tokens 50 --format "typescript" --reporters json --output /tmp/jscpd-after-backend
jscpd frontend/app --min-lines 5 --min-tokens 50 --format "typescript,typescriptreact" --ignore "**/node_modules/**,**/.next/**" --reporters json --output /tmp/jscpd-after-frontend
```

Then run full test suite:

```bash
make test
```
