'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface ColumnsVisibilityPanelProps {
  t: unknown;
  columnOrder: string[];
  orderedColumns: CustomTablePageColumn[];
  hiddenColumnKeys: string[];
  isColumnsDefault: boolean;
  toggleColumnHidden: (key: string) => void;
  resetColumns: () => void;
}

export function ColumnsVisibilityPanel({
  t,
  columnOrder,
  orderedColumns,
  hiddenColumnKeys,
  isColumnsDefault,
  toggleColumnHidden,
  resetColumns,
}: ColumnsVisibilityPanelProps) {
  return (
    <div className="w-full px-2 pb-4 pt-4 sm:px-4">
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-200">
            {(columnOrder.length ? columnOrder : orderedColumns.map(c => c.key)).map(key => {
              const col = orderedColumns.find(c => c.key === key);
              if (!col) return null;
              const isHidden = hiddenColumnKeys.includes(col.key);
              return (
                <li key={col.key} className="list-none">
                  <div
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors sm:px-5 sm:py-3.5 sm:text-base ${
                      isHidden ? 'text-gray-400' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate font-medium">{col.title || col.key}</span>
                    <Checkbox
                      checked={!isHidden}
                      onCheckedChange={() => toggleColumnHidden(col.key)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 sm:h-5 sm:w-5"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          type="button"
          onClick={resetColumns}
          disabled={isColumnsDefault}
          className="w-full rounded-xl border border-primary bg-primary/10 px-5 py-3.5 text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10"
        >
          {tx(t, ['actions', 'columnsReset'], 'Reset columns')}
        </button>
      </div>
    </div>
  );
}
