'use client';

import MuiPagination, {
  type PaginationProps as MuiPaginationProps,
} from '@mui/material/Pagination';

type AppPaginationProps = Omit<MuiPaginationProps, 'count' | 'onChange'> & {
  page: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
};

export function AppPagination({ page, total, onChange, className, ...props }: AppPaginationProps) {
  const safeTotal = Math.max(1, total);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  return (
    <MuiPagination
      {...props}
      page={safePage}
      count={safeTotal}
      onChange={(_event, p) => onChange(p)}
      disabled={safeTotal <= 1}
      className={className}
      showFirstButton
      showLastButton
    />
  );
}
