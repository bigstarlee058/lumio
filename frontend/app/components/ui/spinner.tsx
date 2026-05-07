'use client';

import CircularProgress, { type CircularProgressProps } from '@mui/material/CircularProgress';

export interface SpinnerProps extends Omit<CircularProgressProps, 'aria-label'> {
  label?: string;
  className?: string;
}

function Spinner({ label, size = 16, className, ...props }: SpinnerProps) {
  return (
    <CircularProgress
      role="status"
      aria-label={label ?? 'Loading'}
      size={size}
      className={className}
      {...props}
    />
  );
}

export { Spinner };
