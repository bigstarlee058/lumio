# Eliminate All `any` Types Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all ~790 `any` type annotations from the codebase and add a Biome lint rule to prevent future regressions.

**Architecture:** The work is grouped into 12 independent task groups by pattern/category. Each group creates shared types/interfaces where needed, then applies them across all affected files. A final Biome lint rule prevents regression.

**Tech Stack:** TypeScript, NestJS, Next.js 14, TypeORM, Biome, Axios, react-intlayer, xlsx, googleapis, dropbox SDK

**Key constraints:**
- Backend has `noImplicitAny: false` and `strictNullChecks: false` — types don't need to be as defensive
- Frontend has `strict: true` — types must be precise
- NestJS `LoggerService` interface mandates `any` in its method signatures — these are exempted
- `Record<string, any>` for truly dynamic JSON → typed unions or `Record<string, unknown>`

---

## Task 1: Shared Backend Infrastructure Types

Create foundational types used across the backend.

**Files:**
- Create: `backend/src/common/interfaces/authenticated-request.interface.ts`
- Create: `backend/src/common/interfaces/routed-request.interface.ts`

### Step 1: Create `AuthenticatedRequest` interface

```typescript
// backend/src/common/interfaces/authenticated-request.interface.ts
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  workspace?: {
    id: string;
    name?: string;
    [key: string]: unknown;
  };
  workspaceMemberPermissions?: Record<string, boolean>;
  requestId?: string;
  traceId?: string;
}
```

### Step 2: Create `RoutedRequest` interface

```typescript
// backend/src/common/interfaces/routed-request.interface.ts
import type { Request } from 'express';

export interface RoutedRequest extends Request {
  baseUrl: string;
  route?: { path: string };
}
```

### Step 3: Commit

```
feat(types): add AuthenticatedRequest and RoutedRequest interfaces
```

---

## Task 2: Shared Frontend API Error Utilities

Create a shared error handling utility to replace all `catch (err: any)` patterns in the frontend.

**Files:**
- Create: `frontend/app/lib/api-error.ts`
- Modify: `frontend/app/lib/api.ts`

### Step 1: Create shared `ApiErrorResponse` type and helpers

```typescript
// frontend/app/lib/api-error.ts
import type { AxiosError } from 'axios';

/** Matches the HttpExceptionFilter response shape from the backend */
export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'An error occurred',
): string {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) return error.response?.status;
  return undefined;
}

function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}
```

### Step 2: Commit

```
feat(frontend): add shared API error handling utilities
```

---

## Task 3: Shared Custom Table Types

Create typed interfaces for all custom table JSON columns.

**Files:**
- Create: `backend/src/modules/custom-tables/interfaces/custom-table-types.ts`
- Modify: `backend/src/entities/custom-table.entity.ts`
- Modify: `backend/src/entities/custom-table-row.entity.ts`
- Modify: `backend/src/entities/custom-table-column.entity.ts`
- Modify: `backend/src/entities/custom-table-column-style.entity.ts`
- Modify: `backend/src/entities/custom-table-cell-style.entity.ts`
- Modify: `backend/src/entities/custom-table-import-job.entity.ts`
- Modify: all custom-tables DTOs

### Step 1: Create shared types file

```typescript
// backend/src/modules/custom-tables/interfaces/custom-table-types.ts

/** Cell value types for custom table row data */
export type CellValue = string | number | boolean | Date | null;

/** Row data keyed by dynamic column keys */
export type RowData = Record<string, CellValue>;

/** Text formatting options for a cell */
export interface TextFormat {
  foregroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

/** Style for a single cell (from Google Sheets import or manual) */
export interface SheetCellStyle {
  backgroundColor?: string;
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'CENTER' | 'BOTTOM';
  textFormat?: TextFormat;
}

/** Column style payload stored in column_style entity */
export interface ColumnStylePayload {
  header?: SheetCellStyle;
  cell?: SheetCellStyle;
}

/** Cell style payload stored in cell_style entity */
export interface CellStylePayload {
  header?: SheetCellStyle;
  cell?: SheetCellStyle;
}

/** Row-level styles */
export interface RowStyles {
  manualFill?: string;
  manualTag?: 'heading' | 'total';
  [columnKey: string]: SheetCellStyle | string | undefined;
}

/** View settings for a custom table */
export interface CustomTableViewSettings {
  columns?: Record<string, CustomTableViewColumnSettings>;
}

export interface CustomTableViewColumnSettings {
  width?: number;
}

/** Column configuration */
export interface CustomTableColumnConfig {
  source?: {
    kind: 'data_entry_field' | 'data_entry_custom_field';
    field?: string;
    name?: string;
  };
  icon?: string;
  selectOptions?: string[];
}

/** Import job payload — discriminated by import type */
export interface GoogleSheetsImportPayload {
  type: 'google_sheets';
  tableId: string;
  spreadsheetId: string;
  sheetTitle?: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  workspaceId?: string;
}

export type ImportJobPayload = GoogleSheetsImportPayload;

/** Import job result */
export interface ImportJobResult {
  rowsImported?: number;
  columnsCreated?: number;
  errors?: string[];
  warnings?: string[];
}
```

### Step 2: Apply types to entities

Replace all `Record<string, any>` in custom table entities with the proper types from the shared file:

- `custom-table.entity.ts`: `viewSettings: CustomTableViewSettings`
- `custom-table-row.entity.ts`: `data: RowData`, `styles?: RowStyles | null`
- `custom-table-column.entity.ts`: `config: CustomTableColumnConfig | null`
- `custom-table-column-style.entity.ts`: `style: ColumnStylePayload`
- `custom-table-cell-style.entity.ts`: `style: CellStylePayload`
- `custom-table-import-job.entity.ts`: `payload: ImportJobPayload`, `result: ImportJobResult | null`

### Step 3: Apply types to DTOs

- `create-custom-table-row.dto.ts`: `data: RowData`, `styles?: RowStyles`
- `update-custom-table-row.dto.ts`: `data: RowData`, `styles?: RowStyles`
- `batch-create-custom-table-rows.dto.ts`: `data: RowData`
- `create-custom-table-column.dto.ts`: `config?: CustomTableColumnConfig | null`

### Step 4: Commit

```
feat(custom-tables): add typed interfaces for all JSON columns
```

---

## Task 4: Storage and Workspace Entity Types

**Files:**
- Create: `backend/src/modules/storage/interfaces/storage-view-filters.interface.ts`
- Modify: `backend/src/entities/storage-view.entity.ts`
- Modify: `backend/src/entities/workspace.entity.ts`
- Modify: `backend/src/entities/idempotency-key.entity.ts`
- Modify: `backend/src/entities/statement.entity.ts`
- Modify: `backend/src/entities/parsing-rule.entity.ts`
- Modify: `backend/src/entities/receipt-processing-job.entity.ts`
- Modify: `backend/src/modules/storage/dto/storage-view.dto.ts`
- Modify: `backend/src/modules/workspaces/dto/workspace-response.dto.ts`

### Step 1: Create StorageViewFilters interface

```typescript
// backend/src/modules/storage/interfaces/storage-view-filters.interface.ts
export interface StorageViewFilters {
  search?: string;
  bankName?: string;
  availability?: 'disk' | 'db' | 'both' | 'missing';
  scope?: 'mine' | 'shared' | 'all';
  folderId?: string | null;
  tagIds?: string[];
  deleted?: 'only' | 'include';
}
```

### Step 2: Apply types to entities

- `storage-view.entity.ts`: `filters: StorageViewFilters`
- `workspace.entity.ts`: `settings: Record<string, unknown> | null` (truly unknown shape, placeholder)
- `idempotency-key.entity.ts`: `responseData: Record<string, unknown>` (caches arbitrary responses)
- `statement.entity.ts`: `transaction?: Record<string, unknown>`, `importPreview?: Record<string, unknown>`, `importCommit?: Record<string, unknown>`
- `parsing-rule.entity.ts`: `columnMappings: Record<string, unknown>`, `validationRules: Record<string, unknown>`
- `receipt-processing-job.entity.ts`: `result: unknown`

### Step 3: Apply to DTOs

- `storage-view.dto.ts`: `filters?: StorageViewFilters`
- `workspace-response.dto.ts`: `settings: Record<string, unknown> | null`

### Step 4: Commit

```
feat(entities): type JSON columns in storage/workspace/statement entities
```

---

## Task 5: Auth Controller and Guards

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/guards/jwt-refresh.guard.ts`
- Modify: `backend/src/common/guards/workspace-context.guard.ts`
- Modify: `backend/src/common/decorators/workspace.decorator.ts`

### Step 1: Fix auth.controller.ts

Replace all `@Req() req: any` with proper types:
- `extractSessionContext(req: Request)` — import `Request` from `express`
- `register(@Req() req: Request)` — public route, only passes to extractSessionContext
- `login(@Req() req: Request)` — public route
- `loginWithGoogle(@Req() req: Request)` — public route
- `refresh(@Req() req: Request)` — uses `req.headers.authorization`
- `logout(@Req() req: AuthenticatedRequest)` — uses `req.user.currentSessionId`
- `getSessions(@Req() req: AuthenticatedRequest)` — uses `req.user.currentSessionId`

### Step 2: Fix auth.module.ts

Replace `useFactory: (...): any =>` with `useFactory: (...): JwtModuleOptions =>` (import from `@nestjs/jwt`).

### Step 3: Fix auth.service.ts

Replace `} as any);` TypeORM casts with proper `FindOneOptions` types or restructure queries.

### Step 4: Fix jwt-refresh.guard.ts

```typescript
// Replace:
handleRequest(err: any, user: any, _info?: any, _context?: any): any {
// With:
handleRequest<TUser = AuthenticatedUser>(err: Error | null, user: TUser | false, _info?: unknown, _context?: ExecutionContext): TUser {
```

### Step 5: Fix workspace-context.guard.ts

Replace inline `{ workspace?: any; user?: any; workspaceMemberPermissions?: any }` with `AuthenticatedRequest` interface.

### Step 6: Fix workspace.decorator.ts

Replace `Request & { workspace?: any }` with `AuthenticatedRequest`.

### Step 7: Commit

```
fix(auth): replace all any types with proper interfaces
```

---

## Task 6: Storage Controller — `@CurrentUser() user: any`

**Files:**
- Modify: `backend/src/modules/storage/storage.controller.ts` (37 occurrences)
- Modify: `backend/src/modules/storage/storage.service.ts`

### Step 1: Fix storage.controller.ts

Add import: `import { User } from '../../entities/user.entity';`

Use find-replace to change all 37 occurrences:
```
@CurrentUser() user: any  →  @CurrentUser() user: User
```

### Step 2: Fix storage.service.ts

Replace the various `as any` casts:
- `(s: any)` filter callbacks → `(s: Statement)` with proper Statement type
- `(s as any).folderId` → access via proper Statement type (which has folderId)
- `(statement as any)?.fileData` → create a typed file data extraction utility or use proper entity relations
- `{ onDisk: false, inDb: false, status: 'unknown' } as any` → create a `FileAvailability` interface

### Step 3: Commit

```
fix(storage): replace all any types in storage controller and service
```

---

## Task 7: NestJS Interceptors and Observability

**Files:**
- Modify: `backend/src/common/interceptors/logging.interceptor.ts`
- Modify: `backend/src/common/observability/app-logger.service.ts`
- Modify: `backend/src/common/observability/request-context.middleware.ts`
- Modify: `backend/src/modules/observability/http-metrics.interceptor.ts`
- Modify: `backend/src/modules/audit/interceptors/audit.interceptor.ts`
- Modify: `backend/src/common/filters/http-exception.filter.ts`

### Step 1: Fix logging.interceptor.ts

```typescript
// Replace Observable<any> with Observable<unknown>
// Use RoutedRequest for request access
import { RoutedRequest } from '../interfaces/routed-request.interface';

intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  const request = context.switchToHttp().getRequest<RoutedRequest>();
  // Now request.baseUrl and request.route?.path are typed
```

### Step 2: Fix http-metrics.interceptor.ts

Same pattern — use `RoutedRequest` and `Observable<unknown>`.

### Step 3: Fix audit.interceptor.ts

- Change `Observable<any>` → `Observable<unknown>`
- Change `body?: any` → `body?: unknown`
- Change `entityType: metadata.entityType as any` → fix `AuditMetadata` interface to use `EntityType` enum instead of `string`
- Change `extractEntityId(payload: any)` → `extractEntityId(payload: unknown)` with proper narrowing

### Step 4: Fix app-logger.service.ts

- **Keep** `message: any` on log/error/warn/debug/verbose — mandated by NestJS `LoggerService` interface
- Fix `(payload as any).trace = trace` → use `Record<string, unknown>` for payload construction
- Add Biome `// biome-ignore lint/suspicious/noExplicitAny: required by NestJS LoggerService interface` comments for the interface-mandated `any` types

### Step 5: Fix request-context.middleware.ts

```typescript
// Replace:
(req as any).requestId = requestId;
(req as any).traceId = traceId;
// With: use AuthenticatedRequest which includes these fields
const typedReq = req as AuthenticatedRequest;
typedReq.requestId = requestId;
typedReq.traceId = traceId;
```

### Step 6: Fix http-exception.filter.ts

Replace all `as any` casts with proper type narrowing:
- `(exception as any)?.stack` → `exception instanceof Error ? exception.stack : undefined`
- `(message as any).message` → `typeof message === 'object' && message !== null && 'message' in message`
- `(request as any)?.user?.locale` → use `AuthenticatedRequest`

### Step 7: Commit

```
fix(observability): type interceptors, logger, and exception filter
```

---

## Task 8: Parsing Module Types

This is the largest single module with `any` usage.

**Files:**
- Modify: `backend/src/modules/parsing/services/column-auto-fix.service.ts`
- Modify: `backend/src/modules/parsing/services/column-validation.service.ts`
- Modify: `backend/src/modules/parsing/services/intelligent-deduplication.service.ts`
- Modify: `backend/src/modules/parsing/services/quality-metrics.service.ts`
- Modify: `backend/src/modules/parsing/services/quality-logging.service.ts`
- Modify: `backend/src/modules/parsing/services/metadata-extraction.service.ts`
- Modify: `backend/src/modules/parsing/services/checksum-validation.service.ts`
- Modify: `backend/src/modules/parsing/services/checksum-auto-fix.service.ts`
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts`
- Modify: `backend/src/modules/parsing/services/feature-flag.service.ts`
- Modify: `backend/src/modules/parsing/parsers/csv.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/excel.parser.ts`
- Modify: `backend/src/modules/parsing/helpers/ai-transaction-extractor.helper.ts`
- Modify: `backend/src/modules/parsing/helpers/ai-parse-validator.helper.ts`
- Modify: `backend/src/modules/parsing/helpers/ai-document-extractor.helper.ts`
- Modify: `backend/src/modules/parsing/interfaces/enhanced-parsed-statement.interface.ts`

### Step 1: Fix enhanced-parsed-statement.interface.ts

Replace:
- `customFields?: Record<string, any>` → `customFields?: Record<string, unknown>`
- `before: any; after: any;` → `before: unknown; after: unknown;`
- `input?: any; output?: any; details?: any;` → `input?: unknown; output?: unknown; details?: unknown;`
- `details?: any;` → `details?: unknown;`
- `function isValidParsedStatement(obj: any)` → `(obj: unknown)`
- `function isValidProcessingRequest(obj: any)` → `(obj: unknown)`

### Step 2: Fix excel.parser.ts

```typescript
// xlsx sheet_to_json returns unknown[][] with header:1
type ExcelCellValue = string | number | boolean | Date | null;
type ExcelRow = ExcelCellValue[];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as ExcelRow[];
const headers = data[0].map(h => String(h).toLowerCase().trim());
const rows = data.slice(1);
```

### Step 3: Fix csv.parser.ts

```typescript
// Replace .on('data', (row: any) => {
.on('data', (row: Record<string, string>) => {
```

### Step 4: Fix column-auto-fix.service.ts

- `defaultValue?: any` → `defaultValue?: CellValue` (where `CellValue = string | number | boolean | Date | null`)
- `(transaction as any)[field]` → use `ParsedTransaction` with helper:
  ```typescript
  function getTransactionField(tx: ParsedTransaction, field: string): unknown {
    return (tx as Record<string, unknown>)[field];
  }
  ```
- Return types `): any {` → use specific return types based on what is actually returned

### Step 5: Fix column-validation.service.ts

- `expectedValue?: any; actualValue?: any` → `expectedValue?: unknown; actualValue?: unknown`
- `value: any` → `value: unknown`
- `correctedValue?: any` → `correctedValue?: unknown`
- `getDefaultValue(...): any` → `getDefaultValue(...): CellValue`
- `parseBoolean(value: any)` → `parseBoolean(value: unknown)`

### Step 6: Fix intelligent-deduplication.service.ts

- All `tx1: any, tx2: any` match method params → `tx1: ParsedTransaction, tx2: ParsedTransaction`
- `normalizeTransaction(...): any` → return proper type
- `extractFeatures(...): any` → define `TransactionFeatures` interface
- `(transaction as any)[field]` → use the same `getTransactionField` helper
- `preprocessedTransactions: any[]` → `preprocessedTransactions: ParsedTransaction[]`
- `master: any, duplicates: any[]` → `master: ParsedTransaction, duplicates: ParsedTransaction[]`
- `algorithm: algorithm as any` → fix the DeduplicationAlgorithm type to include all variants

### Step 7: Fix quality-metrics.service.ts

- `data: any` in `QualityInsight` → `data: Record<string, unknown>`
- All `results: any`, `context: any` params → define specific interfaces per method or use `unknown` with narrowing

### Step 8: Fix remaining parsing services

Apply similar patterns to:
- `quality-logging.service.ts`: `metadata: Record<string, unknown>`, `details?: Record<string, unknown>`
- `metadata-extraction.service.ts`: return types and parameter types → use specific interfaces
- `checksum-validation.service.ts`: `transactionTotals: any` → define `TransactionTotals` interface
- `checksum-auto-fix.service.ts`: `getControlTotalPatterns(): any[]` → return specific type
- `statement-processing.service.ts`: `(withData as any)?.fileData` → use proper entity relation access
- `feature-flag.service.ts`: `value?: any` → `value?: unknown`, `customProperties?: Record<string, unknown>`

### Step 9: Fix AI helpers

- `ai-transaction-extractor.helper.ts`: `.map((tx: any) =>` → `.map((tx: Record<string, unknown>) =>`
- `ai-parse-validator.helper.ts`: same pattern
- `ai-document-extractor.helper.ts`: `callModel(contents: any[])` → `callModel(contents: unknown[])`, `normalizeResult(raw: any)` → `normalizeResult(raw: unknown)`

### Step 10: Commit

```
fix(parsing): eliminate all any types in parsing module
```

---

## Task 9: Other Backend Modules

**Files to modify:**
- `backend/src/modules/gmail/` — all files with `any`
- `backend/src/modules/google-sheets/` — all files with `any`
- `backend/src/modules/google-drive/` — `google-drive.service.ts`
- `backend/src/modules/dropbox/` — `dropbox.service.ts`
- `backend/src/modules/custom-tables/` — service, import service, processor, jobs service, controller
- `backend/src/modules/reports/` — service and controller
- `backend/src/modules/users/` — service and controller
- `backend/src/modules/data-entry/` — service and DTO
- `backend/src/modules/audit/` — rollback service
- `backend/src/modules/transactions/` — service and controller
- `backend/src/modules/classification/` — services and controller
- `backend/src/common/services/` — idempotency, openrouter, timezones, file-storage
- `backend/src/common/utils/` — ai-response, advanced-language-detector, pdf-parser, feature-flags, bank-profiles, language-cache
- `backend/src/common/helpers/` — base-ai.helper.ts
- `backend/src/app.controller.ts`

### Patterns to apply:

**A. `catch (error: any)` in backend** → `catch (error: unknown)` with narrowing:
```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  // For Google API errors:
  const code = error instanceof Error && 'code' in error ? (error as { code: number }).code : undefined;
}
```

**B. `} as any)` for TypeORM casts** → Use `satisfies FindOneOptions<Entity>` or restructure the query. Where TypeORM types are genuinely incompatible, use `as FindOneOptions<Entity>`.

**C. `(error as any)?.driverError?.code`** → Create a helper:
```typescript
function getDriverErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'driverError' in error) {
    const driver = (error as { driverError: unknown }).driverError;
    if (typeof driver === 'object' && driver !== null && 'code' in driver) {
      return String((driver as { code: unknown }).code);
    }
  }
  return undefined;
}
```

**D. `@Req() req: any` in any remaining controllers** → Use `Request` from express or `AuthenticatedRequest`.

**E. Gmail module specific:**
- `handlePubSubNotification(@Body() body: any)` → define `PubSubNotificationBody` interface
- `findBody(part: any)` → define `GmailMessagePart` interface based on Gmail API types
- `parseReceipt(): Promise<any>` → define return type based on actual return shape
- `getMessage(): Promise<any>` → use Gmail API types from googleapis

**F. Google Sheets specific:**
- `(this.oauth2Client as any).refreshToken(...)` → use proper OAuth2Client methods or augment types
- `rowToValues(row): any[]` → `rowToValues(row): CellValue[]`
- `catch (error: any)` → `catch (error: unknown)` with Google-specific error handling

**G. Dropbox specific:**
- `(dbx as any).auth.*` → import proper Dropbox types or create a typed wrapper
- `tokenResponse: any` → define token response shape
- `fileMetadata = meta.result as any` → use Dropbox file metadata type

**H. Reports module:**
- `new Date(value as any)` → proper date coercion
- Dynamic import casts for pdfmake → use proper import type assertions
- `reportData: any` → define `ReportData` type

**I. Users module:**
- `where: any = { deletedAt: null }` → `where: FindOptionsWhere<User>`
- `const { passwordHash, ...safeUser } = updatedUser as any` → use `Omit<User, 'passwordHash'>`

**J. Transactions module:**
- `'expense' as any` → fix enum type to include proper values
- `body: ... | { ids: string[]; updates: any }` → define `BulkUpdatePayload`

**K. Common services:**
- `idempotency.service.ts`: `data: any` → `data: unknown`, `response: any` → `response: unknown`
- `openrouter.service.ts`: `messages: any[]` → define OpenRouter message type, fix API client casts
- `timezones.service.ts`: `(Intl as any).supportedValuesOf` → use proper polyfill type
- `file-storage.service.ts`: `(withData as any)?.fileData` → define `EntityWithFileData` interface
- `pdf-parser.util.ts`: all `any` params → define PdfPlumber types
- `feature-flags.util.ts`: `value: any` → `value: unknown`
- `bank-profiles.util.ts`: `profile: any` → `profile: unknown`
- `base-ai.helper.ts`: `contents: any[]` → `contents: unknown[]`

### Commit in sub-groups:

```
fix(gmail): eliminate all any types in gmail module
fix(google-sheets): eliminate all any types in google-sheets module
fix(integrations): eliminate all any types in google-drive and dropbox modules
fix(custom-tables): eliminate all any types in custom-tables services
fix(reports): eliminate all any types in reports module
fix(users): eliminate all any types in users module
fix(data-entry): eliminate all any types in data-entry module
fix(audit): eliminate all any types in audit rollback service
fix(transactions): eliminate all any types in transactions module
fix(classification): eliminate all any types in classification module
fix(common): eliminate all any types in common services and utils
```

---

## Task 10: Frontend Error Catch Blocks

Apply the shared `getApiErrorMessage` utility from Task 2 across all frontend files.

**Files to modify (~54 catch blocks):**
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/register/page.tsx`
- `frontend/app/contexts/WorkspaceContext.tsx`
- `frontend/app/(main)/statements/[id]/edit/page.tsx` (7 blocks)
- `frontend/app/(main)/statements/components/StatementsListView.tsx`
- `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx`
- `frontend/app/(main)/reports/components/BalanceSheet.tsx` (3 blocks)
- `frontend/app/(main)/custom-tables/import/google-sheets/page.tsx` (2 blocks)
- `frontend/app/(main)/workspaces/components/CreateWorkspaceModal.tsx`
- `frontend/app/components/GoogleAuthButton.tsx`
- `frontend/app/components/GoogleSheetsPickerButton.tsx`
- `frontend/app/components/PermissionsPanel.tsx` (2 blocks)
- `frontend/app/shared/[token]/page.tsx`
- All other files with `catch (err: any)` or `catch (error: any)`

### Pattern:

```typescript
// Before:
} catch (err: any) {
  setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed');
}

// After:
import { getApiErrorMessage, getApiErrorStatus } from '@/app/lib/api-error';

} catch (error) {
  setError(getApiErrorMessage(error, 'Failed'));
}

// If status code is also checked:
} catch (error) {
  if (getApiErrorStatus(error) === 404) { ... }
  setError(getApiErrorMessage(error, 'Failed'));
}
```

### Commit:

```
fix(frontend): replace all catch(err: any) with typed error handling
```

---

## Task 11: Frontend Intlayer `as any` Casts and Component Types

**Files to modify:**
- All frontend files using `useIntlayer(...) as any` or `useIntlayer('key' as any) as any`
- `frontend/app/tours/components/TourMenu.tsx`
- `frontend/app/tours/TourManager.ts`
- `frontend/app/tours/statements-tour.ts`
- `frontend/app/storage/StoragePageContent.tsx`
- `frontend/app/(main)/custom-tables/page.tsx`
- `frontend/app/(main)/custom-tables/[id]/page.tsx`
- `frontend/app/(main)/statements/components/*.tsx`
- `frontend/app/components/Navigation.tsx`
- `frontend/app/components/PDFPreviewModal.tsx`
- `frontend/app/shared/[token]/page.tsx`
- `frontend/app/lib/googleSheetsPicker.ts`
- `frontend/app/lib/googleDrivePicker.ts`
- `frontend/app/lib/api.ts`
- All other frontend files with `any`

### Sub-step A: Fix useIntlayer `as any` casts

For each file with `useIntlayer('key' as any) as any`:
1. Remove `as any` from the key argument
2. Remove `as any` from the return value
3. Where `.value` is needed for string contexts, access it explicitly
4. Where `(t as any).someKey` is used for nested access, use proper typed access

If after running `intlayer build`, the types are correct:
```typescript
// Before:
const t = useIntlayer('dashboardPage' as any) as any;
// After:
const t = useIntlayer('dashboardPage');
// Then access: t.title (ReactNode for JSX) or t.title.value (string)
```

If types are NOT available for some keys, use module augmentation or `as never` ONLY where genuinely needed with a comment.

### Sub-step B: Fix TourMenu.tsx helper functions

```typescript
// Replace: function unwrapIntlayerNode(node: any): any
// With:
function unwrapIntlayerNode(node: unknown): string {
  if (typeof node === 'string') return node;
  if (node && typeof node === 'object' && 'value' in node) {
    return typeof (node as { value: unknown }).value === 'string'
      ? (node as { value: string }).value : '';
  }
  return '';
}
```

### Sub-step C: Fix TourManager.ts

- `(window as any).analytics` → declare global augmentation or use conditional access with type guard
- `side: 'center' as any` → check what the tour library expects and use the correct type

### Sub-step D: Fix Google Picker globals

```typescript
// Create frontend/types/google-picker.d.ts
declare global {
  interface Window {
    google?: {
      picker?: {
        PickerBuilder: new () => unknown;
        ViewId: Record<string, string>;
        Action: Record<string, string>;
      };
    };
  }
}
export {};
```

### Sub-step E: Fix frontend custom-tables types

- `frontend/app/(main)/custom-tables/[id]/page.tsx`: Replace `Record<string, any>` with properly typed imports
- `frontend/app/(main)/custom-tables/[id]/utils/stylingUtils.ts`: Replace all 12 `Record<string, any>` with proper types
- `frontend/app/(main)/custom-tables/[id]/components/RowDrawer.tsx`: Replace with proper types

### Sub-step F: Fix frontend component types

- `PDFPreviewModal.tsx`: `React.ComponentType<any>` → specific PDF component props
- `GoogleDriveStorageWidget.tsx`, `DropboxStorageWidget.tsx`: `(item: any)` → define ImportResult interface
- `StoragePageContent.tsx`: `t: any` prop → use intlayer type or define props interface
- `api.ts`: `data: any` → specific data types per endpoint

### Commits:

```
fix(frontend): remove useIntlayer as-any casts with proper types
fix(frontend): type tour system components
fix(frontend): add Google Picker global type declarations
fix(frontend): type custom-tables frontend components
fix(frontend): type remaining frontend component any usages
```

---

## Task 12: Biome Lint Rule and Final Cleanup

**Files:**
- Modify: `biome.json`

### Step 1: Enable `noExplicitAny` in Biome

Change `"noExplicitAny": "off"` to `"noExplicitAny": "error"` in the main rules section.

Keep `"noExplicitAny": "off"` in the test files override only.

For the NestJS-mandated `any` types, add inline biome-ignore comments:
```typescript
// biome-ignore lint/suspicious/noExplicitAny: required by NestJS LoggerService interface
log(message: any, context?: string): void {
```

### Step 2: Run `make lint` and fix any remaining violations

```bash
make lint 2>&1 | grep noExplicitAny
```

Fix any missed occurrences.

### Step 3: Run tests to ensure no regressions

```bash
make test-backend
make test-frontend
```

### Step 4: Commit

```
chore: enable noExplicitAny Biome lint rule to prevent any regressions
```

---

## Execution Order and Dependencies

```
Task 1 (shared backend types)     ─┐
Task 2 (shared frontend api-error) ├─→ Tasks 5-9 (backend modules) ─┐
Task 3 (custom table types)        │                                 │
Task 4 (storage/entity types)     ─┘                                 ├─→ Task 12 (Biome rule)
                                                                     │
Task 10 (frontend error catches) ─────────────────────────────────────┤
Task 11 (frontend intlayer + components) ─────────────────────────────┘
```

Tasks 1-4 can run in parallel (infrastructure types).
Tasks 5-9 depend on Tasks 1 and 4 (backend modules use shared types).
Tasks 10-11 depend on Task 2 (frontend uses shared error util).
Task 12 runs last (validates everything).

---

## Exemptions (NOT to be changed)

These `any` usages are mandated by third-party interfaces and should have `// biome-ignore` comments:

1. **`app-logger.service.ts`** — `log(message: any)`, `error(message: any)`, `warn(message: any)`, `debug(message: any)`, `verbose(message: any)`, `write(level, message: any)` — required by NestJS `LoggerService` interface
2. **`audit-event.entity.ts`** — `[key: string]: any` index signature on `AuditEventMeta` — consider `[key: string]: unknown` first

Total exempted: ~7 lines with biome-ignore comments.

---

## Estimated Effort

| Task Group | Files | ~`any` Removed | Complexity |
|---|---|---|---|
| Task 1: Backend infra types | 2 new | 0 (enables others) | Low |
| Task 2: Frontend error util | 1 new | 0 (enables others) | Low |
| Task 3: Custom table types | 1 new + 10 modified | ~50 | Medium |
| Task 4: Storage/entity types | 1 new + 9 modified | ~20 | Low |
| Task 5: Auth module | 6 modified | ~25 | Medium |
| Task 6: Storage controller | 2 modified | ~50 | Low-Medium |
| Task 7: Interceptors/observability | 6 modified | ~30 | Medium |
| Task 8: Parsing module | 16 modified | ~200 | High |
| Task 9: Other backend modules | ~30 modified | ~200 | High |
| Task 10: Frontend error catches | ~15 modified | ~54 | Medium |
| Task 11: Frontend intlayer + components | ~25 modified | ~150 | High |
| Task 12: Biome rule + cleanup | 1 modified | remaining | Low |
| **Total** | **~120 files** | **~790** | |
