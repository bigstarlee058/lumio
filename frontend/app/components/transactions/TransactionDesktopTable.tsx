'use client';

import { Checkbox } from '../ui/checkbox';
import { SortIcon, TransactionRow } from './TransactionRow';
import type { TransactionRowFormatters, TransactionRowHandlers } from './TransactionRow';
import type { Category, SortState, Transaction } from './types';

interface TableHeaderProps {
  sort: SortState;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onToggleSort: (by: SortState['by']) => void;
  t: ColumnTranslations;
}

type ColumnTranslations = {
  columnDate: { value: string };
  columnCounterparty: { value: string };
  columnPurpose: { value: string };
  columnDebit: { value: string };
  columnCredit: { value: string };
  columnCategory: { value: string };
};

const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const SORT_BTN = 'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700';

function TableHeader({ sort, allSelected, someSelected, onSelectAll, onToggleSort, t }: TableHeaderProps): React.ReactElement {
  return (
    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
      <tr>
        <th className="w-8 px-2 py-3" />
        <th className="w-12 px-4 py-3 text-left">
          <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={onSelectAll} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20" />
        </th>
        <th className="px-4 py-3 text-left">
          <button type="button" onClick={() => onToggleSort('date')} className={SORT_BTN}>
            {t.columnDate.value}<SortIcon sort={sort} field="date" />
          </button>
        </th>
        <th className={TH}>{t.columnCounterparty.value}</th>
        <th className={TH}>{t.columnPurpose.value}</th>
        <th className="px-4 py-3 text-right">
          <button type="button" onClick={() => onToggleSort('amount')} className={SORT_BTN}>
            {t.columnDebit.value}<SortIcon sort={sort} field="amount" />
          </button>
        </th>
        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t.columnCredit.value}</th>
        <th className={TH}>{t.columnCategory.value}</th>
      </tr>
    </thead>
  );
}

interface TransactionDesktopTableProps {
  transactions: Transaction[];
  categories: Category[];
  selectedIds: string[];
  expandedIds: Set<string>;
  sort: SortState;
  allSelected: boolean;
  someSelected: boolean;
  handlers: TransactionRowHandlers;
  formatters: TransactionRowFormatters;
  onSelectAll: (checked: boolean) => void;
  onToggleSort: (by: SortState['by']) => void;
  noResultsLabel: string;
  categoryLabel: string;
  uncategorizedLabel: string;
  columnBinLabel: string;
  columnDateLabel: string;
  t: ColumnTranslations;
}

export function TransactionDesktopTable({
  transactions, categories, selectedIds, expandedIds, sort,
  allSelected, someSelected, handlers, formatters,
  onSelectAll, onToggleSort,
  noResultsLabel, categoryLabel, uncategorizedLabel, columnBinLabel, columnDateLabel, t,
}: TransactionDesktopTableProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-none border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <TableHeader sort={sort} allSelected={allSelected} someSelected={someSelected} onSelectAll={onSelectAll} onToggleSort={onToggleSort} t={t} />
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">{noResultsLabel}</td></tr>
            ) : (
              transactions.map(tx => (
                <TransactionRow key={tx.id} tx={tx} isExpanded={expandedIds.has(tx.id)} isSelected={selectedIds.includes(tx.id)} categories={categories} handlers={handlers} formatters={formatters} categoryLabel={categoryLabel} uncategorizedLabel={uncategorizedLabel} columnBinLabel={columnBinLabel} columnDateLabel={columnDateLabel} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
