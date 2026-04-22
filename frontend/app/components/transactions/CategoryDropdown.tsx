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
    <div className="lumio-tx-cat-menu">
      {categories
        .filter(cat => cat.isEnabled !== false)
        .map(cat => (
          <DropdownMenuItem key={cat.id} onClick={() => onUpdateCategory?.(tx.id, cat.id)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ height: 8, width: 8, borderRadius: 'var(--lumio-radius-full)', display: 'inline-block', backgroundColor: cat.color }} />
            {cat.name}
            {tx.category?.id === cat.id && <Check size={12} style={{ marginLeft: 'auto' }} />}
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
        <button type="button" className="lumio-tx-cat-dropdown" style={style}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{triggerLabel}</span>
          <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} style={{ width: 200 }}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <CategoryMenuItems tx={tx} categories={categories} onUpdateCategory={onUpdateCategory} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
