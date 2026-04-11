'use client';

import NativeSelect from '@mui/material/NativeSelect';
import OutlinedInput from '@mui/material/OutlinedInput';
import * as React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, style, ...props }, ref) => (
    <NativeSelect
      inputRef={ref}
      input={<OutlinedInput size="small" />}
      className={className}
      style={style}
      inputProps={props as React.SelectHTMLAttributes<HTMLSelectElement>}
      sx={{ width: '100%' }}
    >
      {children}
    </NativeSelect>
  ),
);
Select.displayName = 'Select';

export { Select };
