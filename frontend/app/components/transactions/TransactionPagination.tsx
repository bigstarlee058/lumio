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
    <div className="lumio-tx-pagination">
      <div className="lumio-tx-pagination__left">
        <span style={{ fontSize: 14, color: '#374151' }}>{rowsPerPageLabel}:</span>
        <select
          value={rowsPerPage}
          onChange={e => { onRowsPerPageChange(Number(e.target.value)); onPageChange(0); }}
          className="lumio-tx-pagination__select"
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="lumio-tx-pagination__right">
        <span style={{ fontSize: 14, color: '#374151' }}>{start}–{end} {ofLabel} {totalCount}</span>
        <AppPagination page={page + 1} total={totalPages} onChange={p => onPageChange(p - 1)} />
      </div>
    </div>
  );
}
