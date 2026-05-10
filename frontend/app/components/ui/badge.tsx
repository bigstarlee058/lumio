'use client';

import Chip, { type ChipProps } from '@mui/material/Chip';
import * as React from 'react';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  variant?: BadgeVariant;
  label?: ChipProps['label'];
}

const variantToChipProps = (variant: BadgeVariant): Pick<ChipProps, 'variant' | 'color' | 'sx'> => {
  switch (variant) {
    case 'default':
      return { variant: 'filled', color: 'primary', sx: { opacity: 0.9 } };
    case 'secondary':
      return { variant: 'filled', color: 'secondary' };
    case 'outline':
      return { variant: 'outlined', color: 'default' };
    case 'destructive':
      return { variant: 'filled', color: 'error' };
    case 'success':
      return { variant: 'filled', color: 'success' };
    case 'warning':
      return { variant: 'filled', color: 'warning' };
    case 'info':
      return { variant: 'filled', color: 'info' };
  }
};

function Badge({ className, style, variant = 'default', label, children, ...props }: BadgeProps) {
  const chipProps = variantToChipProps(variant);

  return (
    <Chip
      label={label ?? children}
      size="small"
      {...chipProps}
      className={className}
      style={style}
      {...(props as object)}
    />
  );
}

export { Badge };
