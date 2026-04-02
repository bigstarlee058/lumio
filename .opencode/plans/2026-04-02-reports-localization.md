# Reports & Balance Sheet Full Localization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the entire Reports section (page, templates, generator, history, balance sheet UI, account names, and exports) fully localized in ru/en/kk using existing intlayer i18n infrastructure and backend `nameEn`/`nameKk` fields.

**Architecture:** Backend returns localized account names based on user locale passed via query parameter. Frontend replaces all hardcoded strings with intlayer translations. Export files respect user locale.

**Tech Stack:** intlayer (frontend i18n), NestJS (backend), TypeORM, pdf-lib, xlsx

---

## Summary of Problems

1. **`page.tsx`** — hardcoded English strings ("Back to templates", "Balance Sheet", "Reports", "Templates", "History") instead of using translations from `page.content.ts`
2. **`TEMPLATES` array** — English-only names/descriptions; not using intlayer
3. **`ReportGenerator.tsx`** — hardcoded English labels ("Date from", "Date to", "Format", "Generate & Download", "Cancel", "Generating...")
4. **`ReportHistory.tsx`** — hardcoded English table headers and empty state text ("Report", "Period", "Format", "Generated", "Size", "Download", "No reports generated yet", "Just now", "Yesterday", "days ago", etc.)
5. **Backend `getBalanceSheet()`** — returns only `account.name` (Russian), ignoring `nameEn`/`nameKk` fields that already exist in the DB entity
6. **Backend exports** — Excel uses hardcoded Russian ("Баланс на", "Активы", "Итого", "Разница", "Да/Нет"), PDF uses hardcoded English ("Balance sheet as of", "Assets:", "Liabilities:", "Difference:")

---

### Task 1: Add missing translation keys to `page.content.ts`

**Files:**
- Modify: `frontend/app/(main)/reports/page.content.ts`

**Step 1: Add all missing keys to `page.content.ts`**

Add these keys inside the existing `labels` object (after line 103, before the closing `}`):

```ts
      // Balance Sheet page title
      balanceSheetTitle: t({ ru: 'Баланс', en: 'Balance Sheet', kk: 'Баланс парағы' }),

      // ReportGenerator extra labels
      generateAndDownload: t({
        ru: 'Сформировать и скачать',
        en: 'Generate & Download',
        kk: 'Жасау және жүктеу',
      }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),

      // ReportHistory labels
      historyReport: t({ ru: 'Отчёт', en: 'Report', kk: 'Есеп' }),
      historyGenerated: t({ ru: 'Создан', en: 'Generated', kk: 'Жасалған' }),
      historyEmptyHint: t({
        ru: 'Выберите шаблон и создайте первый отчёт.',
        en: 'Select a template and generate your first report.',
        kk: 'Үлгіні таңдап, бірінші есепті жасаңыз.',
      }),
      justNow: t({ ru: 'Только что', en: 'Just now', kk: 'Жаңа ғана' }),
      minutesAgo: t({ ru: 'м назад', en: 'm ago', kk: 'мин бұрын' }),
      hoursAgo: t({ ru: 'ч назад', en: 'h ago', kk: 'сағ бұрын' }),
      yesterday: t({ ru: 'Вчера', en: 'Yesterday', kk: 'Кеше' }),
      daysAgo: t({ ru: 'дн. назад', en: 'days ago', kk: 'күн бұрын' }),
```

Note: `dateFrom`, `dateTo`, `format`, `generate`, `generating`, `backToTemplates` already exist at lines 65-70 — **do NOT duplicate** them. Only add the keys listed above.

**Step 2: Verify file has no syntax errors**

Run: `cd frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "page.content"`
Expected: No errors related to this file.

**Step 3: Commit**

```bash
git add frontend/app/(main)/reports/page.content.ts
git commit -m "feat(reports): add missing i18n keys for generator, history, and balance sheet title"
```

---

### Task 2: Localize `page.tsx` — page titles, back link, tabs, and template data

**Files:**
- Modify: `frontend/app/(main)/reports/page.tsx`

**Step 1: Import `useIntlayer` and use translations**

Add import at top:
```ts
import { useIntlayer } from '@/app/i18n';
```

Inside `ReportsPage()` function body, add:
```ts
const t = useIntlayer('reportsPage');
const labels = t.labels as Record<string, { value?: string } | undefined>;
const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;
```

**Step 2: Replace hardcoded TEMPLATES array**

Move `TEMPLATES` from a module-level constant to inside the component body so it can use `text()`:

```ts
const templates: ReportTemplate[] = [
  {
    id: 'pnl',
    name: text('templatePnlName', 'Profit & Loss (P&L)'),
    description: text('templatePnlDescription', 'Income and expenses summary with net profit for a period'),
    icon: DollarSign,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'balance-sheet',
    name: text('templateBalanceName', 'Balance Sheet'),
    description: text('templateBalanceDescription', 'Assets, liabilities and equity snapshot'),
    icon: Scale,
    category: 'financial',
    formats: ['pdf', 'excel'],
  },
  {
    id: 'cash-flow',
    name: text('templateCashFlowName', 'Cash Flow Statement'),
    description: text('templateCashFlowDescription', 'Cash inflows and outflows over a period'),
    icon: BarChart3,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'expense-by-category',
    name: text('templateExpenseByCategoryName', 'Expense by Category'),
    description: text('templateExpenseByCategoryDescription', 'Breakdown of expenses by category with totals'),
    icon: PieChart,
    category: 'operational',
    formats: ['pdf', 'excel', 'csv'],
  },
];
```

**Step 3: Replace hardcoded strings in JSX**

In the balance sheet view (lines 76-93), replace:
- `← Back to templates` → `← {text('backToTemplates', 'Back to templates')}`
- `Balance Sheet` → `{text('balanceSheetTitle', 'Balance Sheet')}`

In the main view (lines 96-153), replace:
- `<h1>Reports</h1>` → `<h1>{text('title', 'Reports')}</h1>`
- `<p>Generate financial reports...</p>` → `<p>{text('subtitle', 'Generate financial reports and export documents')}</p>`
- `<Tab ... label="Templates" />` → `<Tab ... label={text('tabTemplates', 'Templates')} />`
- `<Tab ... label="History" />` → `<Tab ... label={text('tabHistory', 'History')} />`
- Update the grid to use `templates` (local var) instead of `TEMPLATES`

**Step 4: Run type check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 5: Commit**

```bash
git add frontend/app/(main)/reports/page.tsx
git commit -m "feat(reports): localize page titles, tabs, back link, and template cards"
```

---

### Task 3: Localize `ReportGenerator.tsx`

**Files:**
- Modify: `frontend/app/(main)/reports/components/ReportGenerator.tsx`

**Step 1: Add i18n hook and helper**

Add imports and hook at the top of the component:

```ts
import { useIntlayer } from '@/app/i18n';

export function ReportGenerator({ template, onClose, onGenerate }: ReportGeneratorProps) {
  const t = useIntlayer('reportsPage');
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;
  // ... rest of state
```

**Step 2: Replace all hardcoded strings**

- Line 77: `Date from` → `{text('dateFrom', 'Date from')}`
- Line 94: `Date to` → `{text('dateTo', 'Date to')}`
- Line 107: `Format` → `{text('format', 'Format')}`
- Line 134: `Generating...` → `{text('generating', 'Generating…')}`
- Line 139: `Generate & Download` → `{text('generateAndDownload', 'Generate & Download')}`
- Line 143: `Cancel` → `{text('cancel', 'Cancel')}`

**Step 3: Run type check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/app/(main)/reports/components/ReportGenerator.tsx
git commit -m "feat(reports): localize report generator form labels"
```

---

### Task 4: Localize `ReportHistory.tsx`

**Files:**
- Modify: `frontend/app/(main)/reports/components/ReportHistory.tsx`

**Step 1: Add i18n hook and helper**

```ts
import { useIntlayer, useLocale } from '@/app/i18n';
```

Inside the component:
```ts
const t = useIntlayer('reportsPage');
const { locale } = useLocale();
const labels = t.labels as Record<string, { value?: string } | undefined>;
const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;
```

**Step 2: Move `getRelativeTime` inside the component to use translations**

Change `getRelativeTime` from a module-level function to a function inside the component:

```ts
const getRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return text('justNow', 'Just now');
  if (diffMins < 60) return `${diffMins}${text('minutesAgo', 'm ago')}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}${text('hoursAgo', 'h ago')}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return text('yesterday', 'Yesterday');
  if (diffDays < 7) return `${diffDays} ${text('daysAgo', 'days ago')}`;

  const resolvedLocale = locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleDateString(resolvedLocale, { month: 'short', day: 'numeric' });
};
```

**Step 3: Replace hardcoded strings in JSX**

- Line 89: `No reports generated yet` → `{text('historyEmpty', 'No reports generated yet')}`
- Line 90: `Select a template...` → `{text('historyEmptyHint', 'Select a template and generate your first report.')}`
- Line 101: `Report` header → `{text('historyReport', 'Report')}`
- Line 104: `Period` header → `{text('historyPeriod', 'Period')}`
- Line 107: `Format` header → `{text('historyFormat', 'Format')}`
- Line 110: `Generated` header → `{text('historyGenerated', 'Generated')}`
- Line 113: `Size` header → `{text('historySize', 'Size')}`
- Line 116: `Download` header → `{text('historyDownload', 'Download')}`

**Step 4: Run type check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 5: Commit**

```bash
git add frontend/app/(main)/reports/components/ReportHistory.tsx
git commit -m "feat(reports): localize report history table and relative time strings"
```

---

### Task 5: Backend — return localized account names in balance sheet API

**Files:**
- Modify: `backend/src/modules/balance/balance.service.ts:25-36,272-309`
- Modify: `backend/src/modules/balance/balance.controller.ts:22-29,31-38`
- Modify: `backend/src/modules/balance/dto/balance-query.dto.ts`

**Step 1: Add `locale` query parameter to `BalanceQueryDto`**

In `backend/src/modules/balance/dto/balance-query.dto.ts`, add:

```ts
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}
```

**Step 2: Update `BalanceAccountNode` type to include `nameEn` and `nameKk`**

In `balance.service.ts`, update the `BalanceAccountNode` type:

```ts
type BalanceAccountNode = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameKk: string | null;
  accountType: BalanceAccountType;
  isEditable: boolean;
  isAutoComputed: boolean;
  isExpandable: boolean;
  amount: number;
  children: BalanceAccountNode[];
  position: number;
};
```

**Step 3: Update node building in `getBalanceSheet()`**

In the loop at line 296-309, add the new fields:

```ts
nodesById.set(account.id, {
  id: account.id,
  code: account.code,
  name: account.name,
  nameEn: account.nameEn,
  nameKk: account.nameKk,
  accountType: account.accountType,
  isEditable: account.isEditable,
  isAutoComputed: account.isAutoComputed,
  isExpandable: account.isExpandable,
  amount: 0,
  children: [],
  position: account.position,
});
```

**Step 4: Add locale-aware name resolution helper**

Add private methods to `BalanceService`:

```ts
private resolveAccountName(node: BalanceAccountNode, locale?: string): string {
  if (locale === 'en' && node.nameEn) return node.nameEn;
  if (locale === 'kk' && node.nameKk) return node.nameKk;
  return node.name; // Russian is default
}

private localizeTree(nodes: BalanceAccountNode[], locale?: string): void {
  for (const node of nodes) {
    node.name = this.resolveAccountName(node, locale);
    if (node.children.length > 0) {
      this.localizeTree(node.children, locale);
    }
  }
}
```

**Step 5: Apply localization in `getBalanceSheet()`**

Add `locale` parameter to `getBalanceSheet()` signature and call `localizeTree` before returning:

```ts
async getBalanceSheet(workspaceId: string, date?: string, locale?: string): Promise<BalanceSheetResponse> {
  // ... existing logic ...

  // Before return, localize the names
  this.localizeTree(assets, locale);
  this.localizeTree(liabilities, locale);

  return { ... };
}
```

**Step 6: Update controller to pass locale**

In `balance.controller.ts`, update `getSheet()` and `getAccounts()`:

```ts
@Get('sheet')
@RequirePermission(Permission.REPORT_VIEW)
async getSheet(
  @WorkspaceId() workspaceId: string,
  @Query() query: BalanceQueryDto,
  @CurrentUser() user: User,
): Promise<unknown> {
  const locale = query.locale || user.locale || 'ru';
  return this.balanceService.getBalanceSheet(workspaceId, query.date, locale);
}

@Get('accounts')
@RequirePermission(Permission.REPORT_VIEW)
async getAccounts(
  @WorkspaceId() workspaceId: string,
  @Query() query: BalanceQueryDto,
  @CurrentUser() user: User,
): Promise<unknown> {
  const locale = query.locale || user.locale || 'ru';
  return this.balanceService.getAccountsTree(workspaceId, query.date, locale);
}
```

Add import for `User` and `CurrentUser` if not already present.

**Step 7: Update `getAccountsTree()` to pass locale**

```ts
async getAccountsTree(workspaceId: string, date?: string, locale?: string) {
  const sheet = await this.getBalanceSheet(workspaceId, date, locale);
  return {
    assets: sheet.assets.sections,
    liabilities: sheet.liabilities.sections,
    date: sheet.date,
  };
}
```

**Step 8: Run backend tests**

Run: `cd backend && npm run test -- --testPathPattern=balance`
Expected: Tests pass (may need minor updates to match new `nameEn`/`nameKk` in node structure).

**Step 9: Commit**

```bash
git add backend/src/modules/balance/
git commit -m "feat(balance): return localized account names based on user locale"
```

---

### Task 6: Frontend — pass locale to balance sheet API call

**Files:**
- Modify: `frontend/app/(main)/reports/components/BalanceSheet.tsx:134-137`

**Step 1: Pass locale in the API request**

In `BalanceSheet.tsx`, update the `loadSheet` function to include locale:

```ts
const response = await apiClient.get('/reports/balance/sheet', {
  params: {
    ...(date ? { date } : {}),
    locale,
  },
});
```

Add `locale` to the `useCallback` dependency array for `loadSheet`.

**Step 2: Update the `BalanceAccountNode` type to include `nameEn` and `nameKk`**

Update the frontend type (line 17-28) to match:

```ts
type BalanceAccountNode = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameKk: string | null;
  accountType: 'asset' | 'liability' | 'equity';
  isEditable: boolean;
  isAutoComputed: boolean;
  isExpandable: boolean;
  amount: number;
  children: BalanceAccountNode[];
  position: number;
};
```

Note: The backend now returns `name` already localized by the `locale` query param, so the frontend just displays `account.name` as before — no further changes needed in `renderAccount`.

**Step 3: Run type check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/app/(main)/reports/components/BalanceSheet.tsx
git commit -m "feat(balance): pass user locale to balance sheet API for localized account names"
```

---

### Task 7: Backend — localize Excel and PDF exports

**Files:**
- Modify: `backend/src/modules/balance/balance.service.ts` (methods: `exportAsExcel`, `exportAsPdf`, `exportBalanceSheet`)
- Modify: `backend/src/modules/balance/balance.controller.ts:50-62`
- Modify: `backend/src/modules/balance/dto/export-balance.dto.ts`

**Step 1: Add `locale` to `ExportBalanceDto`**

```ts
import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export enum BalanceExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ExportBalanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsEnum(BalanceExportFormat)
  format: BalanceExportFormat = BalanceExportFormat.EXCEL;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}
```

**Step 2: Add export translation map**

Add a private method to `BalanceService`:

```ts
private getExportLabels(locale?: string) {
  const labels: Record<string, Record<string, string>> = {
    balanceAsOf: { ru: 'Баланс на', en: 'Balance sheet as of', kk: 'Баланс парағы' },
    assets: { ru: 'Активы', en: 'Assets', kk: 'Активтер' },
    liabilities: { ru: 'Пассивы', en: 'Liabilities', kk: 'Пассивтер' },
    total: { ru: 'Итого', en: 'Total', kk: 'Барлығы' },
    difference: { ru: 'Разница', en: 'Difference', kk: 'Айырма' },
    balanced: { ru: 'Сходится', en: 'Balanced', kk: 'Сәйкес' },
    yes: { ru: 'Да', en: 'Yes', kk: 'Иә' },
    no: { ru: 'Нет', en: 'No', kk: 'Жоқ' },
    notBalanced: { ru: 'не сходится', en: 'not balanced', kk: 'сәйкес емес' },
  };

  const lang = locale && ['ru', 'en', 'kk'].includes(locale) ? locale : 'ru';
  const result: Record<string, string> = {};
  for (const [key, translations] of Object.entries(labels)) {
    result[key] = translations[lang] || translations.ru;
  }
  return result;
}
```

**Step 3: Update `exportAsExcel` to accept and use locale**

Change signature: `private async exportAsExcel(data: BalanceSheetResponse, locale?: string)`

Replace hardcoded strings:
```ts
const l = this.getExportLabels(locale);

const rows: Array<Array<string | number>> = [
  [`${l.balanceAsOf} ${data.date}`, '', '', ''],
  ['', '', '', ''],
  [
    `${l.assets} (${this.formatAmount(data.assets.total)})`,
    '',
    `${l.liabilities} (${this.formatAmount(data.liabilities.total)})`,
    '',
  ],
  ['', '', '', ''],
];
// ... row loop stays the same ...
rows.push(['', '', '', '']);
rows.push([l.total, this.round(data.assets.total), l.total, this.round(data.liabilities.total)]);
rows.push([l.difference, this.round(data.difference), l.balanced, data.isBalanced ? l.yes : l.no]);
```

**Step 4: Update `exportAsPdf` to accept and use locale**

Change signature: `private async exportAsPdf(data: BalanceSheetResponse, locale?: string)`

Replace hardcoded strings:
```ts
const l = this.getExportLabels(locale);

page.drawText(`${l.balanceAsOf} ${data.date}`, { ... });
page.drawText(`${l.assets}: ${this.formatAmount(data.assets.total)}`, { ... });
page.drawText(`${l.liabilities}: ${this.formatAmount(data.liabilities.total)}`, { ... });

// Bottom difference line
page.drawText(
  `${l.difference}: ${this.formatAmount(data.difference)} (${data.isBalanced ? l.balanced : l.notBalanced})`,
  { ... }
);
```

**Step 5: Update `exportBalanceSheet` to pass locale through**

```ts
async exportBalanceSheet(
  workspaceId: string,
  dto: ExportBalanceDto,
  locale?: string,
): Promise<{ fileName: string; contentType: string; buffer: Buffer }> {
  const effectiveLocale = dto.locale || locale;
  const balanceSheet = await this.getBalanceSheet(workspaceId, dto.date, effectiveLocale);
  const dateKey = balanceSheet.date;

  if (dto.format === BalanceExportFormat.PDF) {
    const buffer = await this.exportAsPdf(balanceSheet, effectiveLocale);
    return { fileName: `balance-sheet-${dateKey}.pdf`, contentType: 'application/pdf', buffer };
  }

  const buffer = await this.exportAsExcel(balanceSheet, effectiveLocale);
  return {
    fileName: `balance-sheet-${dateKey}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  };
}
```

**Step 6: Update controller export endpoint**

```ts
@Get('export')
@RequirePermission(Permission.REPORT_EXPORT)
async exportBalance(
  @WorkspaceId() workspaceId: string,
  @Query() dto: ExportBalanceDto,
  @CurrentUser() user: User,
  @Res() res: Response,
) {
  const locale = dto.locale || user.locale || 'ru';
  const payload = await this.balanceService.exportBalanceSheet(workspaceId, dto, locale);

  res.setHeader('Content-Type', payload.contentType);
  res.setHeader('Content-Disposition', buildContentDisposition('attachment', payload.fileName));
  res.send(payload.buffer);
}
```

**Step 7: Update frontend export call to pass locale**

In `BalanceSheet.tsx`, update `downloadExport`:

```ts
const response = await apiClient.get('/reports/balance/export', {
  params: {
    format,
    ...(effectiveDate ? { date: effectiveDate } : {}),
    locale,
  },
  responseType: 'blob',
});
```

**Step 8: Run backend tests**

Run: `cd backend && npm run test -- --testPathPattern=balance`
Expected: Tests pass.

**Step 9: Commit**

```bash
git add backend/src/modules/balance/ frontend/app/(main)/reports/components/BalanceSheet.tsx
git commit -m "feat(balance): localize Excel and PDF export labels based on user locale"
```

---

### Task 8: Update backend tests for new locale parameter

**Files:**
- Modify: `backend/@tests/unit/modules/balance/balance.service.spec.ts`

**Step 1: Add locale-aware name resolution tests**

```ts
it('returns English names when locale is en', async () => {
  balanceAccountRepository.count.mockResolvedValue(1);
  balanceAccountRepository.find.mockResolvedValue([
    {
      id: 'asset-cash',
      code: 'ASSET_CASH',
      name: 'III. Деньги',
      nameEn: 'III. Cash',
      nameKk: 'III. Ақша',
      accountType: BalanceAccountType.ASSET,
      subType: BalanceAccountSubType.CASH,
      isEditable: false,
      isAutoComputed: true,
      isExpandable: false,
      position: 0,
      parentId: null,
      createdAt: new Date(),
    },
  ]);

  jest.spyOn(service as any, 'getLatestSnapshotMap').mockResolvedValue(new Map());
  jest.spyOn(service as any, 'getAutoComputedCashBalance').mockResolvedValue(1000);
  jest.spyOn(service as any, 'getRetainedEarnings').mockResolvedValue(0);

  const result = await service.getBalanceSheet('ws-1', '2026-04-02', 'en');
  expect(result.assets.sections[0].name).toBe('III. Cash');

  const resultKk = await service.getBalanceSheet('ws-1', '2026-04-02', 'kk');
  expect(resultKk.assets.sections[0].name).toBe('III. Ақша');

  const resultRu = await service.getBalanceSheet('ws-1', '2026-04-02', 'ru');
  expect(resultRu.assets.sections[0].name).toBe('III. Деньги');
});
```

**Step 2: Run tests**

Run: `cd backend && npm run test -- --testPathPattern=balance`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add backend/@tests/unit/modules/balance/balance.service.spec.ts
git commit -m "test(balance): add locale-aware name resolution tests"
```

---

### Task 9: Run full lint, format, and test suite

**Step 1: Lint and format**

Run: `make lint && make format`
Expected: No errors.

**Step 2: Run all tests**

Run: `make test-backend && make test-frontend`
Expected: All tests pass.

**Step 3: Fix any issues found**

If lint/tests fail, fix the issues and re-run.

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(reports): address lint/test issues from localization changes"
```

---

## File Change Summary

| File | Action | Description |
|---|---|---|
| `frontend/app/(main)/reports/page.content.ts` | Modify | Add ~15 new i18n keys |
| `frontend/app/(main)/reports/page.tsx` | Modify | Use `useIntlayer`, localize all strings, move templates inside component |
| `frontend/app/(main)/reports/components/ReportGenerator.tsx` | Modify | Use `useIntlayer`, localize all labels |
| `frontend/app/(main)/reports/components/ReportHistory.tsx` | Modify | Use `useIntlayer` + `useLocale`, localize headers, empty state, relative time |
| `frontend/app/(main)/reports/components/BalanceSheet.tsx` | Modify | Pass `locale` query param to API calls, update type |
| `backend/src/modules/balance/dto/balance-query.dto.ts` | Modify | Add optional `locale` field |
| `backend/src/modules/balance/dto/export-balance.dto.ts` | Modify | Add optional `locale` field |
| `backend/src/modules/balance/balance.service.ts` | Modify | Add `nameEn`/`nameKk` to node type, add `localizeTree()`, add `getExportLabels()`, pass locale through all methods |
| `backend/src/modules/balance/balance.controller.ts` | Modify | Pass `user.locale` as fallback to service methods |
| `backend/@tests/unit/modules/balance/balance.service.spec.ts` | Modify | Add locale-aware tests |
