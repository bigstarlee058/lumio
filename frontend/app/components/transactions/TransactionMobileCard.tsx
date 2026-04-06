'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { CategoryDropdown } from './CategoryDropdown';
import type { TransactionRowFormatters, TransactionRowHandlers } from './TransactionRow';
import type { Category, Transaction } from './types';

interface TransactionMobileCardProps {
  tx: Transaction;
  isExpanded: boolean;
  isSelected: boolean;
  categories: Category[];
  handlers: TransactionRowHandlers;
  formatters: TransactionRowFormatters;
  uncategorizedLabel: string;
  columnBinLabel: string;
  columnDateLabel: string;
}

interface CardClassOptions { isSelected: boolean; hasErrors?: boolean; hasWarnings?: boolean; }
function buildCardClass({ isSelected, hasErrors, hasWarnings }: CardClassOptions): string {
  const base = 'rounded-none border p-3 transition';
  const sel = isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white';
  const status = hasErrors ? 'border-red-200 bg-red-50/40' : hasWarnings ? 'border-amber-200 bg-amber-50/30' : '';
  return `${base} ${sel} ${status}`;
}

function MobileAmounts({ tx, formatters }: { tx: Transaction; formatters: TransactionRowFormatters }): React.ReactElement {
  const debit = Number(tx.debit);
  const credit = Number(tx.credit);
  const fmtAmt = (n: number): string => formatters.formatAmount(formatters.resolveDisplayAmount(tx, n), formatters.resolveDisplayCurrency(tx));
  return (
    <div className="text-right">
      {debit > 0 && <p className="text-sm font-bold text-gray-900">{fmtAmt(debit)}</p>}
      {credit > 0 && <p className="text-sm font-bold text-emerald-600">{fmtAmt(credit)}</p>}
      {debit <= 0 && credit <= 0 && <p className="text-sm text-gray-400">—</p>}
    </div>
  );
}

function MobileExpandedDetails({ tx, formatDate, columnBinLabel, columnDateLabel }: { tx: Transaction; formatDate: (d: string) => string; columnBinLabel: string; columnDateLabel: string }): React.ReactElement {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-none border border-gray-100 bg-gray-50 p-3 text-xs">
      <div><span className="mb-1 block font-semibold text-gray-500">{columnBinLabel}</span><span className="font-mono text-gray-900">{tx.counterpartyBin ?? '—'}</span></div>
      <div><span className="mb-1 block font-semibold text-gray-500">Currency</span><span className="text-gray-900">{tx.currency ?? '—'}</span></div>
      <div><span className="mb-1 block font-semibold text-gray-500">Doc Number</span><span className="text-gray-900">{tx.documentNumber ?? '—'}</span></div>
      <div><span className="mb-1 block font-semibold text-gray-500">{columnDateLabel}</span><span className="text-gray-900">{formatDate(tx.transactionDate)}</span></div>
    </div>
  );
}

export function TransactionMobileCard({ tx, isExpanded, isSelected, categories, handlers, formatters, uncategorizedLabel, columnBinLabel, columnDateLabel }: TransactionMobileCardProps): React.ReactElement {
  return (
    <div data-testid={`transaction-card-${tx.id}`} className={buildCardClass({ isSelected, hasErrors: tx.hasErrors, hasWarnings: tx.hasWarnings })}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={handlers.onSelectRow(tx.id)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20" aria-label={`Select transaction ${tx.counterpartyName}`} /></div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => handlers.onRowClick(tx)} className="w-full rounded-none text-left focus:outline-none focus:ring-2 focus:ring-primary/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{tx.counterpartyName}</p><p className="mt-0.5 text-xs text-gray-500">{formatters.formatDate(tx.transactionDate)}</p></div>
              <MobileAmounts tx={tx} formatters={formatters} />
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-gray-600">{tx.paymentPurpose || '—'}</p>
          </button>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="min-w-0" onClick={e => e.stopPropagation()}><CategoryDropdown tx={tx} categories={categories} label={uncategorizedLabel} align="start" onUpdateCategory={handlers.onUpdateCategory} /></div>
            <button type="button" onClick={handlers.onToggleExpansion(tx.id)} aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse row' : 'Expand row'} className="inline-flex items-center justify-center rounded-none p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
          </div>
          {isExpanded && <MobileExpandedDetails tx={tx} formatDate={formatters.formatDate} columnBinLabel={columnBinLabel} columnDateLabel={columnDateLabel} />}
        </div>
      </div>
    </div>
  );
}
