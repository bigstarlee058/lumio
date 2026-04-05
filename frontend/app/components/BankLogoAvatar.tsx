'use client';

import { resolveBankLogo } from '@bank-logos';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import React from 'react';

import { LogoAvatar } from './LogoAvatar';

type Props = {
  bankName?: string | null;
  size?: number;
  className?: string;
  rounded?: boolean;
};

export function BankLogoAvatar({ bankName, size = 32, className, rounded = true }: Props) {
  const resolved = resolveBankLogo(bankName);
  const src = resolved.key !== 'other' ? resolved.src : null;

  const roundedClass = rounded ? 'rounded-full' : 'rounded-lg';

  return (
    <LogoAvatar
      src={src}
      alt={bankName || resolved.displayName || 'Bank'}
      size={size}
      imgClassName={[roundedClass, 'bg-gray-100 object-contain', className]
        .filter(Boolean)
        .join(' ')}
      className={['inline-flex items-center justify-center text-gray-500', roundedClass, className]
        .filter(Boolean)
        .join(' ')}
      fallback={
        <AccountBalanceIcon
          data-testid="bank-logo-fallback-icon"
          sx={{ fontSize: Math.max(14, Math.round(size * 0.9)) }}
        />
      }
    />
  );
}
