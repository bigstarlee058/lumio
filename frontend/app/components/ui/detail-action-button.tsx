'use client';

import { cn } from '@/app/lib/utils';
import { Button, type ButtonProps } from './button';

export function DetailActionButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'detail-action-button rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm',
        'hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900',
        'disabled:border-gray-200 disabled:bg-white disabled:text-gray-400',
        className,
      )}
      {...props}
    />
  );
}
