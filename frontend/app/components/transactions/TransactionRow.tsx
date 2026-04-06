'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { CategoryDropdown } from './CategoryDropdown';
import { TransactionExpandedRow } from './TransactionExpandedRow';
import type { SortState, Transaction, TransactionRowFormatters, TransactionRowHandlers } from './types';

export type { TransactionRowFormatters, TransactionRowHandlers };

interface TransactionRowProps {
  tx: Transaction;
  isExpanded: boolean;
  isSelected: boolean;
  categories: import('./types').Category[];
  handlers: TransactionRowHandlers;
  formatters: TransactionRowFormatters;
  categoryLabel: string;
  uncategorizedLabel: string;
  columnBinLabel: string;
  columnDateLabel: string;
}

interface SortIconProps {
  sort: SortState;
  field: SortState['by'];
}

export function SortIcon({ sort, field }: SortIconProps): React.ReactElement {
  if (sort.by !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
  return sort.order === 'asc'
    ? <ChevronDown className="h-3 w-3 rotate-180" />
    : <ChevronDown className="h-3 w-3" />;
}

interface AmountCellProps {
  amount: number;
  tx: Transaction;
  formatters: TransactionRowFormatters;
  colorClass: string;
}

function AmountCell({ amount, tx, formatters, colorClass }: AmountCellProps): React.ReactElement {
  if (amount <= 0) return <span className="text-gray-400">—</span>;
  return (
    <span className={`font-bold ${colorClass}`}>
      {formatters.formatAmount(formatters.resolveDisplayAmount(tx, amount), formatters.resolveDisplayCurrency(tx))}
    </span>
  );
}

interface RowClassOptions { isSelected: boolean; hasErrors?: boolean; hasWarnings?: boolean; }
function buildRowClass({ isSelected, hasErrors, hasWarnings }: RowClassOptions): string {
  const status = hasErrors ? 'bg-red-50/50' : hasWarnings ? 'bg-amber-50/30' : '';
  const selection = isSelected ? 'bg-primary/5 border-primary' : 'border-transparent';
  return `cursor-pointer transition hover:bg-muted/50 border-l-4 ${selection} ${status}`;
}

export function TransactionRow({ tx, isExpanded, isSelected, categories, handlers, formatters, categoryLabel, columnBinLabel, columnDateLabel }: TransactionRowProps): React.ReactElement {
  const rowCls = buildRowClass({ isSelected, hasErrors: tx.hasErrors, hasWarnings: tx.hasWarnings });
  const handleKey = (e: React.KeyboardEvent): void => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.onRowClick(tx); } };
  return (
    <React.Fragment>
      <tr onClick={() => handlers.onRowClick(tx)} onKeyDown={handleKey} tabIndex={0} aria-label={`Transaction from ${tx.counterpartyName}`} className={rowCls}>
        <td className="px-2 py-4 text-center" onClick={handlers.onToggleExpansion(tx.id)} aria-expanded={isExpanded}>
          <div className="flex items-center justify-center h-full text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</div>
        </td>
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={handlers.onSelectRow(tx.id)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20" /></td>
        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 tabular-nums">{formatters.formatDate(tx.transactionDate)}</td>
        <td className="px-4 py-4 text-sm font-semibold text-gray-900"><div className="max-w-[200px]" title={tx.counterpartyName}>{tx.counterpartyName}</div></td>
        <td className="px-4 py-4 text-sm text-gray-500"><div className="line-clamp-2 max-w-[300px]" title={tx.paymentPurpose}>{tx.paymentPurpose || '—'}</div></td>
        <td className="whitespace-nowrap px-4 py-4 text-right text-sm"><AmountCell amount={Number(tx.debit)} tx={tx} formatters={formatters} colorClass="text-gray-900" /></td>
        <td className="whitespace-nowrap px-4 py-4 text-right text-sm"><AmountCell amount={Number(tx.credit)} tx={tx} formatters={formatters} colorClass="text-emerald-600" /></td>
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}><CategoryDropdown tx={tx} categories={categories} label={categoryLabel} align="end" onUpdateCategory={handlers.onUpdateCategory} /></td>
      </tr>
      {isExpanded && <TransactionExpandedRow tx={tx} formatDate={formatters.formatDate} columnBinLabel={columnBinLabel} columnDateLabel={columnDateLabel} />}
    </React.Fragment>
  );
}
