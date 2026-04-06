'use client';

import type { Transaction } from './types';

interface TransactionExpandedRowProps {
  tx: Transaction;
  formatDate: (d: string) => string;
  columnBinLabel: string;
  columnDateLabel: string;
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function ExpandedField({ label, value, mono }: FieldProps): React.ReactElement {
  return (
    <div>
      <span className="block font-semibold text-gray-500 mb-1">{label}</span>
      <span className={mono ? 'font-mono text-gray-900' : 'text-gray-900'}>{value}</span>
    </div>
  );
}

export function TransactionExpandedRow({
  tx,
  formatDate,
  columnBinLabel,
  columnDateLabel,
}: TransactionExpandedRowProps): React.ReactElement {
  return (
    <tr className="bg-gray-50/40">
      <td colSpan={2} />
      <td colSpan={7} className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4 rounded-none bg-white p-4 text-xs sm:grid-cols-4 border border-gray-100">
          <ExpandedField label={columnBinLabel} value={tx.counterpartyBin ?? '—'} mono />
          <ExpandedField label="Currency" value={tx.currency ?? '—'} />
          <ExpandedField label="Doc Number" value={tx.documentNumber ?? '—'} />
          <ExpandedField label={columnDateLabel} value={formatDate(tx.transactionDate)} />
        </div>
      </td>
    </tr>
  );
}
