'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { resolveCategoryDisplay } from './helpers/transactionFormatters';
import type { Category, Transaction, UpdateCategoryFn } from './types';

interface CategoryDropdownProps {
  tx: Transaction;
  categories: Category[];
  label: string;
  align?: 'start' | 'end';
  onUpdateCategory?: UpdateCategoryFn;
}

interface CategoryMenuItemsProps {
  tx: Transaction;
  categories: Category[];
  onUpdateCategory?: UpdateCategoryFn;
}

function CategoryMenuItems({ tx, categories, onUpdateCategory }: CategoryMenuItemsProps): React.ReactElement {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      {categories
        .filter(cat => cat.isEnabled !== false)
        .map(cat => (
          <DropdownMenuItem key={cat.id} onClick={() => onUpdateCategory?.(tx.id, cat.id)} className="gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
            {tx.category?.id === cat.id && <Check className="ml-auto h-3 w-3" />}
          </DropdownMenuItem>
        ))}
    </div>
  );
}

export function CategoryDropdown({ tx, categories, label, align = 'end', onUpdateCategory }: CategoryDropdownProps): React.ReactElement {
  const { triggerLabel, style } = resolveCategoryDisplay(tx, label);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex max-w-full items-center gap-1 rounded-none px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/20" style={style}>
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[200px]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <CategoryMenuItems tx={tx} categories={categories} onUpdateCategory={onUpdateCategory} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
