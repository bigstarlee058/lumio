'use client';

import { AppPagination } from '../ui/pagination';

interface TransactionPaginationProps {
  page: number;
  rowsPerPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPageLabel: string;
  ofLabel: string;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

export function TransactionPagination({ page, rowsPerPage, totalPages, totalCount, rowsPerPageLabel, ofLabel, onPageChange, onRowsPerPageChange }: TransactionPaginationProps): React.ReactElement {
  const start = page * rowsPerPage + 1;
  const end = Math.min((page + 1) * rowsPerPage, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{rowsPerPageLabel}:</span>
        <select value={rowsPerPage} onChange={e => { onRowsPerPageChange(Number(e.target.value)); onPageChange(0); }} className="rounded-none border border-gray-200 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10">
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{start}–{end} {ofLabel} {totalCount}</span>
        <AppPagination page={page + 1} total={totalPages} onChange={p => onPageChange(p - 1)} />
      </div>
    </div>
  );
}
