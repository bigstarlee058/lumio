'use client';

import OutlinedInput from '@mui/material/OutlinedInput';
import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** MUI input slot props for adornments */
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  error?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, error, style, ...props }, ref) => (
    <OutlinedInput
      inputRef={ref}
      type={type}
      error={error}
      className={className}
      style={style}
      startAdornment={startAdornment}
      endAdornment={endAdornment}
      size="small"
      inputProps={props as React.InputHTMLAttributes<HTMLInputElement>}
      sx={{ width: '100%' }}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
