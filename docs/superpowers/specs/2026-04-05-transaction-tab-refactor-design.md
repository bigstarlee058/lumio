# TransactionTab Refactor Design

**Date:** 2026-04-05
**Scope:** `frontend/app/components/dashboard/TransactionTab.tsx`
**Goal:** Extract inline data-fetching and API mapping logic out of the component into reusable, single-purpose units.

---

## Problem

`TransactionTab` currently does too many things in one file:

1. Defines `TransactionApiRecord` — a local type for raw API responses
2. Implements `fetchData` — an async function that fetches `/transactions` and `/categories` in parallel and transforms the results
3. Owns all UI state (drawer, filters, selection, currency filter)
4. Renders the full transaction UI

The `TransactionApiRecord` → `Transaction` mapping logic has no shared home, so any future component fetching transactions would duplicate it.

---

## Decisions

- **No React Query** — stay consistent with the existing `useState`/`useEffect` pattern used throughout the app
- **Shared mapper** — the transform function moves to `helpers/` so all transaction-fetching code can import it
- **Local hook only** — no HTTP module abstraction; the hook calls `api.get` directly (no second HTTP consumer exists yet)

---

## New Files

### `frontend/app/components/transactions/helpers/transactionMapper.ts`

Exports a single pure function and the `TransactionApiRecord` type (moved from `TransactionTab`):

```ts
export type TransactionApiRecord = Partial<Transaction> & {
  id: string;
  transactionDate: string;
  counterpartyName: string;
  paymentPurpose: string;
  debit?: number | null;
  credit?: number | null;
};

export function mapApiRecordToTransaction(tx: TransactionApiRecord): Transaction
```

- Pure function, no side effects
- Centralises the `debit`/`credit` → `amount`/`transactionType` derivation logic
- Importable by any future component that receives raw transaction API records

### `frontend/app/components/transactions/hooks/useTransactionData.ts`

Owns all server-state concerns for the transactions + categories fetch:

```ts
interface UseTransactionDataOptions {
  showConverted: boolean;
  workspaceCurrency: string;
  currencyFilter: string | null;
}

interface UseTransactionDataResult {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactionData(options: UseTransactionDataOptions): UseTransactionDataResult
```

Responsibilities:
- Declares `transactions`, `categories`, `loading`, `error` state
- Implements `fetchData` with `Promise.all([api.get('/transactions'), api.get('/categories')])`
- Uses `mapApiRecordToTransaction` to transform raw records
- Triggers via `useEffect` on `[showConverted, workspaceCurrency, currencyFilter]`
- Guards against stale responses using an `isMounted` ref in the `useEffect` cleanup

---

## `TransactionTab` After Refactor

The component shrinks from ~251 lines to ~150 lines.

**Leaves the component:**
- `TransactionApiRecord` type definition
- `fetchData` function body
- The `useEffect` triggering `fetchData`
- `loading`, `error`, `transactions`, `categories` state declarations

**Stays in the component:**
- `useTransactionData(...)` call
- UI state: `selectedIds`, `detailsTransaction`, `drawerOpen`, `bulkCategoryId`, `filters`, `currencyFilter`
- `availableCurrencies` memo
- Bulk category update handler (`api.patch` — UI-triggered, not a fetch concern)
- All JSX — unchanged
- `refetch()` — called after bulk category update succeeds (replaces the current direct `fetchData()` invocation)

---

## Error Handling

No behaviour changes. The hook surfaces `error: string | null`; `TransactionTab` renders the error state identically. `toast.error` call stays in the hook (consistent with existing pattern).

The stale-fetch guard (`isMounted` ref) prevents a slow response from an earlier `currencyFilter` value overwriting results from a faster subsequent request.

---

## Out of Scope

- React Query adoption
- Extracting drawer/selection state into a shared `useTransactionPageState` hook (targets `TransactionsPageView` too — separate refactor)
- HTTP API module abstraction
