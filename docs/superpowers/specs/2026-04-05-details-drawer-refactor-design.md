# DetailsDrawer Refactor Design

**Date:** 2026-04-05
**Scope:** `frontend/app/components/transactions/DetailsDrawer.tsx`
**Goal:** Split a 429-line multi-concern component into a thin shell and focused sub-components.

---

## Problem

`DetailsDrawer` currently handles four distinct concerns in one file:

1. **History data fetching** — `historyEvents`, `historyLoading`, `historyDrawerOpen`, `selectedHistoryEvent` state + `useEffect` calling `fetchEntityHistory`
2. **Category update action** — `selectedCategoryId`, `updating` state + `handleUpdateCategory`, `handleMarkIgnored` handlers
3. **Inline formatters** — `formatDate` and `formatAmount` defined locally, duplicating `transactionFormatters.ts`
4. **All JSX** — ~270 lines of details tab + ~30 lines of history tab in one render function

---

## New Files

### `frontend/app/components/transactions/hooks/useTransactionHistory.ts`

Owns the history state cluster:

```ts
interface UseTransactionHistoryResult {
  historyEvents: AuditEvent[];
  historyLoading: boolean;
  historyDrawerOpen: boolean;
  selectedHistoryEvent: AuditEvent | null;
  openEventDrawer: (event: AuditEvent) => void;
  closeEventDrawer: () => void;
}

export function useTransactionHistory(
  open: boolean,
  transactionId: string | undefined,
): UseTransactionHistoryResult
```

Responsibilities:
- Declares `historyEvents`, `historyLoading`, `historyDrawerOpen`, `selectedHistoryEvent` state
- `useEffect` on `[open, transactionId]` — calls `fetchEntityHistory`, sets state
- `openEventDrawer` / `closeEventDrawer` control the nested `AuditEventDrawer`

### `frontend/app/components/transactions/TransactionDetailsTab.tsx`

Props: `transaction`, `categories`, `onUpdateCategory?`, `onMarkIgnored?`

Owns:
- `selectedCategoryId`, `updating` state
- `handleUpdateCategory`, `handleMarkIgnored` handlers
- `useLocale()` and `useCurrencyDisplay()` (moved from `DetailsDrawer`)
- All details tab JSX

Imports `formatDate`, `formatAmount` from `../helpers/transactionFormatters` — does **not** define them inline.

### `frontend/app/components/transactions/TransactionHistoryTab.tsx`

Props: `events: AuditEvent[]`, `loading: boolean`, `onSelect: (event: AuditEvent) => void`

Pure display component — no state, no hooks. Renders `EntityHistoryTimeline` or a loading placeholder.

---

## `DetailsDrawer` After Refactor

Drops from 429 lines to ~80 lines — a thin shell:

```ts
export default function DetailsDrawer({ open, transaction, categories, onClose, onUpdateCategory, onMarkIgnored }) {
  const t = useIntlayer('transactionsDrawer');
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const { historyEvents, historyLoading, historyDrawerOpen, selectedHistoryEvent, openEventDrawer, closeEventDrawer } =
    useTransactionHistory(open, transaction?.id);

  if (!transaction) return null;

  return (
    <DrawerShell ...>
      {/* tab switcher */}
      {activeTab === 'details'
        ? <TransactionDetailsTab transaction={transaction} categories={categories} onUpdateCategory={onUpdateCategory} onMarkIgnored={onMarkIgnored} />
        : <TransactionHistoryTab events={historyEvents} loading={historyLoading} onSelect={openEventDrawer} />
      }
      <AuditEventDrawer event={selectedHistoryEvent} open={historyDrawerOpen} onClose={closeEventDrawer} />
    </DrawerShell>
  );
}
```

**Leaves `DetailsDrawer`:**
- History state cluster + `useEffect`
- `formatDate`, `formatAmount` inline functions
- `selectedCategoryId`, `updating` state
- `handleUpdateCategory`, `handleMarkIgnored` handlers
- `useLocale()`, `useCurrencyDisplay()` hooks
- All tab JSX

**Stays in `DetailsDrawer`:**
- `activeTab` state + tab switcher buttons
- `DrawerShell` wrapper
- `AuditEventDrawer` (controlled via hook)
- `if (!transaction) return null` guard

---

## Formatter Consolidation

`transactionFormatters.ts` already exports `formatDate(dateString, locale)` and `formatAmount(amount, currency, locale)`. The inline duplicates in `DetailsDrawer` are removed. `TransactionDetailsTab` imports them directly.

No changes to `transactionFormatters.ts` itself.

---

## Out of Scope

- Extracting drawer/selection state shared with `TransactionsPageView`
- Changes to `AuditEventDrawer` or `EntityHistoryTimeline`
- i18n content file changes
