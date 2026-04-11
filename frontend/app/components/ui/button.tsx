'use client';

import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import * as React from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'soft';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const mapVariant = (
  v: ButtonVariant,
): {
  variant: MuiButtonProps['variant'];
  color: MuiButtonProps['color'];
} => {
  switch (v) {
    case 'default':
      return { variant: 'contained', color: 'primary' };
    case 'secondary':
      return { variant: 'contained', color: 'secondary' };
    case 'outline':
      return { variant: 'outlined', color: 'primary' };
    case 'ghost':
      return { variant: 'text', color: 'inherit' };
    case 'destructive':
      return { variant: 'contained', color: 'error' };
    case 'soft':
      return { variant: 'outlined', color: 'primary' };
  }
};

const mapSize = (s: ButtonSize): MuiButtonProps['size'] => {
  if (s === 'sm') return 'small';
  if (s === 'lg') return 'large';
  return 'medium';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'default', size = 'default', type, children, onClick, disabled, className, style, ...props },
    ref,
  ) => {
    const muiVariant = mapVariant(variant);
    const muiSize = mapSize(size);

    if (size === 'icon') {
      return (
        <MuiIconButton
          ref={ref}
          type={type ?? 'button'}
          size={muiSize}
          onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
          disabled={disabled}
          className={className}
          style={style}
        >
          {children}
        </MuiIconButton>
      );
    }

    return (
      <MuiButton
        ref={ref}
        type={type ?? 'button'}
        variant={muiVariant.variant}
        color={muiVariant.color}
        size={muiSize}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        disabled={disabled}
        className={className}
        style={style}
        {...(props as object)}
      >
        {children}
      </MuiButton>
    );
  },
);
Button.displayName = 'Button';

export { Button };
