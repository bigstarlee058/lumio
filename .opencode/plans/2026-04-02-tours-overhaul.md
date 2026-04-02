# Tours System Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 12 broken guided tours so every step highlights real UI elements with accurate descriptions in RU/EN/KK.

**Architecture:** Each tour consists of two files: `*-tour.ts` (step definitions with CSS selectors) and `*-tour.content.ts` (Intlayer i18n dictionary). The fix involves (a) adding missing `data-tour-id` attributes to page components, (b) rewriting step selectors and text in both files, and (c) removing steps that reference non-existent features. No changes to the tour engine (`TourManager.ts`, `driver.js`, hooks, or rendering components) are required.

**Tech Stack:** TypeScript, React, Next.js 14, driver.js, Intlayer (i18n), MUI

---

## Audit Summary

| Tour | Status | Working Steps | Broken Steps |
|------|--------|---------------|-------------|
| Statements | Partially broken | 2/7 non-body | 5 missing selectors |
| Upload | Completely broken | 0/5 non-body | All use fragile CSS selectors targeting non-existent modal |
| Storage | Partially broken | 2/6 non-body | 4 missing selectors |
| Custom Tables | Completely broken | 0/8 non-body | All selectors use wrong naming |
| Reports | Completely broken | 0/5 non-body | No `data-tour-id` on page at all |
| Categories | Completely broken | 0/4 non-body | No `data-tour-id` on page; wrong route |
| Data Entry | Almost working | 15/17 non-body | 1 missing (`currency-buttons`) |
| Integrations | Completely broken | 0/4 non-body | References non-existent features |
| GS Import | Fully working | 17/17 | — |
| GS Integration | Almost working | 12/13 | 1 wrong selector |
| Settings/Workspace | Completely broken | 0/9 non-body | Wrong page, `autoStart: true` |
| Admin | Completely broken | 0/5 non-body | No `data-tour-id` on page at all |

---

## Execution Strategy

Work per-tour in order of severity. For each tour:
1. Add `data-tour-id` attributes to the page component(s)
2. Rewrite the `*-tour.ts` with correct selectors and step structure
3. Rewrite the `*-tour.content.ts` with updated i18n texts (RU/EN/KK)
4. Update TourMenu if tour name/route changed
5. Manually verify by starting the tour in browser

---

## Task 1: Statements Tour

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx` — add missing `data-tour-id` attrs
- Modify: `frontend/app/tours/statements-tour.ts` — rewrite steps
- Modify: `frontend/app/tours/statements-tour.content.ts` — update texts

### Step 1: Add `data-tour-id` attributes to StatementsListView

Add these attributes to the component (find the corresponding JSX elements):

| data-tour-id | Target element | Notes |
|---|---|---|
| `search-bar` | Already exists | Keep as-is |
| `statements-table` | Already exists | Keep as-is |
| `statements-filters` | The filters chip row/filter button area | New |
| `statement-row` | First table row (first `<tr>` or card in list) | New |
| `statement-actions` | The action buttons area in the first row | New |
| `upload-fab` | The circular FAB upload button (`StatementsCircularUploadMenu`) | New |

### Step 2: Rewrite statements-tour.ts

New steps (7 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                    // Welcome
  { selector: '[data-tour-id="upload-fab"]', title: '...', description: '...', side: 'left', align: 'center' }, // Upload FAB
  { selector: '[data-tour-id="search-bar"]', title: '...', description: '...', side: 'bottom', align: 'start' },
  { selector: '[data-tour-id="statements-filters"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="statements-table"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="statement-row"]', title: '...', description: '...', side: 'bottom' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                    // Completed
]
```

Removed steps: `upload-button` (was wrong page), `status-badge` (no separate element), `action-buttons` (merged into row step), `pagination` (not present).

### Step 3: Update statements-tour.content.ts

Update all step texts for RU/EN/KK. Keep existing `key: 'statements-tour'`.

Remove content keys: `uploadButton`, `statusFilter`, `statusBadges`, `actions`, `pagination`, `viewDetails`.
Add content keys: `uploadFab`, `filters`, `statementRow`.

Update `statementsTable` description to reflect current UI (cards/rows with file name, bank, transaction count, status).

### Step 4: Update TypeScript types in statements-tour.ts

Adjust the `texts` parameter type to match the new step keys.

---

## Task 2: Upload Tour

**Files:**
- Modify: `frontend/app/upload/page.tsx` — add/verify `data-tour-id` attrs
- Modify: `frontend/app/tours/upload-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/upload-tour.content.ts` — completely rewrite

### Step 1: Verify/add `data-tour-id` in upload page

The upload page already has some attributes. Verify these exist:

| data-tour-id | Present? | Notes |
|---|---|---|
| `upload-button` | Yes (line ~305) | Keep |
| `drag-drop-zone` | Yes (line ~229) | Keep — was orphaned, now will be used |
| `allow-duplicates` | Yes (line ~264) | Keep — old tour used `#allow-duplicates` (wrong selector type) |
| `file-list` | Yes (line ~271) | Keep — was orphaned, now will be used |
| `google-sheets-section` | Yes (line ~188) | Keep |

Add if missing:
| data-tour-id | Target element |
|---|---|
| `upload-header` | Page title/header area |

### Step 2: Rewrite upload-tour.ts

Change `page: '/statements'` to `page: '/upload'`.

New steps (7 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                      // Welcome
  { selector: '[data-tour-id="drag-drop-zone"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="allow-duplicates"]', title: '...', description: '...', side: 'right' },
  { selector: '[data-tour-id="file-list"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="upload-button"]', title: '...', description: '...', side: 'top', align: 'end' },
  { selector: '[data-tour-id="google-sheets-section"]', title: '...', description: '...', side: 'top' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                      // Completed
]
```

All CSS class selectors (`#allow-duplicates`, `.fixed.inset-0 ...`) replaced with `data-tour-id` selectors.

### Step 3: Rewrite upload-tour.content.ts

Complete rewrite of all step texts for RU/EN/KK to match the new flow (standalone page, not modal).

---

## Task 3: Storage Tour

**Files:**
- Modify: `frontend/app/storage/StoragePageContent.tsx` — add missing `data-tour-id` attrs
- Modify: `frontend/app/tours/storage-tour.ts` — rewrite steps
- Modify: `frontend/app/tours/storage-tour.content.ts` — update texts

### Step 1: Add `data-tour-id` to StoragePageContent

| data-tour-id | Target element | Notes |
|---|---|---|
| `file-search` | Already exists | Keep |
| `filters-button` | Already exists | Keep |
| `storage-table` | The file list table/container | New (replaces `file-list`) |
| `storage-file-row` | First file row in the table | New |
| `storage-pagination` | Pagination section | New (pagination exists, just needs ID) |

### Step 2: Rewrite storage-tour.ts

New steps (6 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                         // Welcome
  { selector: '[data-tour-id="file-search"]', title: '...', description: '...', side: 'bottom', align: 'end' },
  { selector: '[data-tour-id="filters-button"]', title: '...', description: '...', side: 'bottom', align: 'end' },
  { selector: '[data-tour-id="storage-table"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="storage-file-row"]', title: '...', description: '...', side: 'bottom' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                         // Completed
]
```

Removed: `file-actions`, `category-select`, `permission-badge` — these are per-row details better explained in row step.

### Step 3: Update storage-tour.content.ts

Remove old step keys: `fileList`, `fileActions`, `categorySelect`, `permissionBadge`.
Add new keys: `storageTable`, `fileRow`.
Update descriptions for RU/EN/KK.

---

## Task 4: Custom Tables Tour

**Files:**
- Modify: `frontend/app/(main)/custom-tables/page.tsx` — add `data-tour-id` attrs
- Modify: `frontend/app/tours/custom-tables-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/custom-tables-tour.content.ts` — completely rewrite

### Step 1: Add `data-tour-id` to custom-tables page

Keep existing:
- `data-tour-id="search-bar"` (line ~1074)
- `data-tour-id="tables-list"` (line ~1159)
- `data-tour-id="pagination"` (line ~1378)

Add new:

| data-tour-id | Target element |
|---|---|
| `custom-tables-create-export` | "Create export table" primary CTA button |
| `custom-tables-create-dropdown` | "Create" secondary dropdown button |
| `custom-tables-source-filter` | Source filter dropdown (All/Manual/GS/From statement) |
| `custom-tables-sort` | Sort dropdown |

### Step 2: Rewrite custom-tables-tour.ts

New steps (8 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                              // Welcome
  { selector: '[data-tour-id="custom-tables-create-export"]', title: '...', description: '...', side: 'bottom', align: 'end' },
  { selector: '[data-tour-id="custom-tables-create-dropdown"]', title: '...', description: '...', side: 'bottom', align: 'end' },
  { selector: '[data-tour-id="search-bar"]', title: '...', description: '...', side: 'bottom', align: 'start' },
  { selector: '[data-tour-id="custom-tables-source-filter"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="tables-list"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="pagination"]', title: '...', description: '...', side: 'top' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                              // Completed
]
```

Removed: All `custom-tables-source-tab-*` (tabs don't exist, now a dropdown), `create-empty`, `create-from-statement`, `create-import-google-sheets` (dropdown items, too granular).

### Step 3: Rewrite custom-tables-tour.content.ts

Full rewrite of step texts RU/EN/KK. Remove old step keys and add new ones matching the structure above.

---

## Task 5: Reports Tour

**Files:**
- Modify: `frontend/app/(main)/reports/page.tsx` — add `data-tour-id` attrs
- Modify: `frontend/app/(main)/reports/components/ReportGenerator.tsx` (if separate) — add attrs
- Modify: `frontend/app/tours/reports-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/reports-tour.content.ts` — completely rewrite

### Step 1: Add `data-tour-id` to reports page

| data-tour-id | Target element |
|---|---|
| `reports-tabs` | The MUI Tabs component (Templates/History) |
| `reports-templates-grid` | The container wrapping all 4 template cards |
| `reports-template-pnl` | The P&L template card specifically |
| `reports-generator` | The ReportGenerator panel (appears after selecting a template) |
| `reports-format` | The format toggle buttons (Excel/PDF/CSV) |
| `reports-generate-button` | The "Generate & Download" button |
| `reports-history-tab` | The History tab specifically |

### Step 2: Rewrite reports-tour.ts

New steps (7 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                         // Welcome
  { selector: '[data-tour-id="reports-tabs"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="reports-templates-grid"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="reports-template-pnl"]', title: '...', description: '...', side: 'bottom', align: 'start',
    advanceOn: { selector: '[data-tour-id="reports-template-pnl"]', event: 'click', delayMs: 300 },
    showButtons: ['close', 'previous'] },
  { selector: '[data-tour-id="reports-generator"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="reports-format"]', title: '...', description: '...', side: 'top', align: 'start' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                         // Completed
]
```

### Step 3: Rewrite reports-tour.content.ts

Full rewrite RU/EN/KK.

---

## Task 6: Categories Tour

**Files:**
- Modify: `frontend/app/(main)/workspaces/categories/page.tsx` (or the `WorkspaceCategoriesView` component) — add `data-tour-id` attrs
- Modify: `frontend/app/tours/categories-tour.ts` — rewrite with correct route + steps
- Modify: `frontend/app/tours/categories-tour.content.ts` — rewrite texts

### Step 1: Add `data-tour-id` to categories page

| data-tour-id | Target element |
|---|---|
| `categories-add-button` | "Add" button in the header |
| `categories-search` | Search input field |
| `categories-list` | Category list container |
| `category-row` | First category row |
| `category-toggle` | First enable/disable toggle switch |

### Step 2: Rewrite categories-tour.ts

Change `page: '/categories'` to `page: '/workspaces/categories'`.

New steps (6 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                            // Welcome
  { selector: '[data-tour-id="categories-add-button"]', title: '...', description: '...', side: 'bottom', align: 'end' },
  { selector: '[data-tour-id="categories-search"]', title: '...', description: '...', side: 'bottom', align: 'start' },
  { selector: '[data-tour-id="categories-list"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="category-toggle"]', title: '...', description: '...', side: 'left' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                            // Completed
]
```

Removed: `category-color`, `category-icon` — these are inside a dialog; can't easily highlight during a tour.

### Step 3: Rewrite categories-tour.content.ts

Full rewrite RU/EN/KK. Update route reference.

---

## Task 7: Data Entry Tour (minor fix)

**Files:**
- Modify: `frontend/app/tours/data-entry-tour.ts` — remove the `currency-buttons` step
- Modify: `frontend/app/tours/data-entry-tour.content.ts` — remove `currencyButtons` key

### Step 1: Remove `currency-buttons` step

The currency quick-toggle buttons don't exist anymore (currency is selected via a modal button). Remove step 13 from the tour.

### Step 2: Update data-entry-tour.content.ts

Remove the `currencyButtons` key from the content dictionary.

---

## Task 8: Integrations Tour

**Files:**
- Modify: `frontend/app/integrations/page.tsx` — add `data-tour-id` attrs
- Modify: `frontend/app/tours/integrations-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/integrations-tour.content.ts` — completely rewrite

### Step 1: Add `data-tour-id` to integrations page

| data-tour-id | Target element |
|---|---|
| `integrations-search` | Search input |
| `integrations-connected` | "Connected" section |
| `integrations-available` | "Available" section |
| `integration-card-google-sheets` | Google Sheets card specifically |

### Step 2: Rewrite integrations-tour.ts

New steps (5 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                               // Welcome
  { selector: '[data-tour-id="integrations-search"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="integrations-available"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="integration-card-google-sheets"]', title: '...', description: '...', side: 'right', align: 'start' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                               // Completed
]
```

Removed: `api-keys`, `webhooks`, `connection-status` — these features don't exist on this page.

### Step 3: Rewrite integrations-tour.content.ts

Full rewrite RU/EN/KK.

---

## Task 9: Google Sheets Integration Tour (minor fix)

**Files:**
- Modify: `frontend/app/tours/google-sheets-integration-tour.ts` — fix one selector
- Modify: `frontend/app/tours/google-sheets-integration-tour.content.ts` — update text for step 3

### Step 1: Fix selector

Change step 3 selector from `[data-tour-id="gs-integration-sheet-url"]` to `[data-tour-id="gs-integration-picker"]`.

### Step 2: Update content

Update the title/description for step 3 to reflect that this is a spreadsheet picker, not a URL field.

---

## Task 10: Settings/Workspace Tour

**Files:**
- Modify: `frontend/app/(main)/workspaces/overview/page.tsx` (or the overview component) — add `data-tour-id` attrs
- Modify: `frontend/app/tours/settings-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/settings-tour.content.ts` — completely rewrite

### Step 1: Add `data-tour-id` to workspace overview page

| data-tour-id | Target element |
|---|---|
| `workspace-side-panel` | The side navigation panel (WorkspaceSidePanel) |
| `workspace-name` | Workspace name input field |
| `workspace-currency` | Default currency button |
| `workspace-background` | Background section with Change button |
| `workspace-save` | "Save changes" button |

### Step 2: Rewrite settings-tour.ts

Change `page: '/settings/workspace'` to `page: '/workspaces/overview'`.
**Remove `autoStart: true`** — a broken autostart is worse than no tour.

New steps (6 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                              // Welcome
  { selector: '[data-tour-id="workspace-side-panel"]', title: '...', description: '...', side: 'right' },
  { selector: '[data-tour-id="workspace-name"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="workspace-currency"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="workspace-background"]', title: '...', description: '...', side: 'bottom' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                              // Completed
]
```

Removed: All member/invitation steps — those are on `/workspaces/members`, a different page.

Rename tour display name to "Workspace Tour" (keep ID `settings-tour` for backward compat).

### Step 3: Rewrite settings-tour.content.ts

Full rewrite RU/EN/KK.

---

## Task 11: Admin Tour

**Files:**
- Modify: `frontend/app/admin/page.tsx` — add `data-tour-id` attrs
- Modify: `frontend/app/tours/admin-tour.ts` — completely rewrite
- Modify: `frontend/app/tours/admin-tour.content.ts` — completely rewrite

### Step 1: Add `data-tour-id` to admin page

| data-tour-id | Target element |
|---|---|
| `admin-tabs` | The 3-tab bar (Statements Log / Users / Audit) |
| `admin-statements-search` | Search field in Statements Log tab |
| `admin-statements-table` | The statements table |
| `admin-users-tab` | Users tab element |
| `admin-audit-tab` | Audit tab element |

### Step 2: Rewrite admin-tour.ts

New steps (6 total):

```typescript
steps: [
  { selector: 'body', title: '...', description: '...', side: 'center' },                           // Welcome
  { selector: '[data-tour-id="admin-tabs"]', title: '...', description: '...', side: 'bottom' },
  { selector: '[data-tour-id="admin-statements-search"]', title: '...', description: '...', side: 'bottom', align: 'start' },
  { selector: '[data-tour-id="admin-statements-table"]', title: '...', description: '...', side: 'top' },
  { selector: '[data-tour-id="admin-users-tab"]', title: '...', description: '...', side: 'bottom' },
  { selector: 'body', title: '...', description: '...', side: 'center' },                           // Completed
]
```

Removed: `admin-workspaces`, `admin-settings`, `admin-monitoring` — these sections don't exist.

### Step 3: Rewrite admin-tour.content.ts

Full rewrite RU/EN/KK.

---

## Task 12: Verify TourMenu routing

**Files:**
- Review: `frontend/app/tours/components/TourMenu.tsx` — no code changes expected

Verify that route changes work:
1. Categories tour `page: '/workspaces/categories'` — TourMenu navigation should work
2. Settings tour `page: '/workspaces/overview'` — TourMenu navigation should work
3. Upload tour `page: '/upload'` — TourMenu navigation should work (changed from `/statements`)

---

## Task 13: Google Sheets Import Tour — SKIP

This tour is 100% functional (17/17 selectors match). No changes needed.

---

## Summary of Changes Per File

### Tour definition files (modify):
1. `frontend/app/tours/statements-tour.ts` + `.content.ts`
2. `frontend/app/tours/upload-tour.ts` + `.content.ts`
3. `frontend/app/tours/storage-tour.ts` + `.content.ts`
4. `frontend/app/tours/custom-tables-tour.ts` + `.content.ts`
5. `frontend/app/tours/reports-tour.ts` + `.content.ts`
6. `frontend/app/tours/categories-tour.ts` + `.content.ts`
7. `frontend/app/tours/data-entry-tour.ts` + `.content.ts`
8. `frontend/app/tours/integrations-tour.ts` + `.content.ts`
9. `frontend/app/tours/google-sheets-integration-tour.ts` + `.content.ts`
10. `frontend/app/tours/settings-tour.ts` + `.content.ts`
11. `frontend/app/tours/admin-tour.ts` + `.content.ts`

### Page component files (add `data-tour-id` attrs):
1. `frontend/app/(main)/statements/components/StatementsListView.tsx`
2. `frontend/app/upload/page.tsx` (verify existing attrs)
3. `frontend/app/storage/StoragePageContent.tsx`
4. `frontend/app/(main)/custom-tables/page.tsx`
5. `frontend/app/(main)/reports/page.tsx`
6. `frontend/app/(main)/workspaces/categories/page.tsx` (or view component)
7. `frontend/app/integrations/page.tsx`
8. `frontend/app/(main)/workspaces/overview/page.tsx` (or view component)
9. `frontend/app/admin/page.tsx`

### Files NOT changing:
- `TourManager.ts`, `tour-theme.css`, `types.ts`, `index.ts`
- `TourMenu.tsx`, `TourAutoStarter.tsx`, `TourButton.tsx`, `TourProgress.tsx`
- `google-sheets-import-tour.ts` + `.content.ts` (100% working)
- `data-entry/page.tsx` (no attr changes needed)

### Total files modified: ~31 files
### Estimated effort: ~4-6 hours
