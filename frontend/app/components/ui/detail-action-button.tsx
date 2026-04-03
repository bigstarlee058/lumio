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
        'dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white',
        'dark:disabled:border-slate-700/60 dark:disabled:bg-slate-900 dark:disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}
