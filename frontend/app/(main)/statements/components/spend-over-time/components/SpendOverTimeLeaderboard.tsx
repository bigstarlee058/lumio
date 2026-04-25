'use client';
import type { JSX } from 'react';

import type { SpendOverTimeFlowType, SpendOverTimePoint } from '@/app/(main)/statements/components/spend-over-time.utils';
import { formatMoney } from '@/app/lib/analytics-common';

type SortKey = 'amount' | 'average' | 'operations';

type Props = {
  rows: SpendOverTimePoint[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  onRowClick: (period: string) => void;
  activeFlowType: SpendOverTimeFlowType;
  title: string;
  currency: string;
  sortLabels: { sortByAmount: string; sortByAverage: string; sortByOperations: string };
  columnLabels: { period: string; operations: string; average: string; amount: string; lastOperation: string };
};

const SORT_KEYS: SortKey[] = ['amount', 'average', 'operations'];

type SortBtnProps = { label: string; active: boolean; onClick: () => void };

function SortBtn({ label, active, onClick }: SortBtnProps): React.JSX.Element {
  return (
    <button type="button" className={`lumio-view-page__sort-btn${active ? ' lumio-view-page__sort-btn--active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

type RowProps = { row: SpendOverTimePoint; currency: string; activeFlowType: SpendOverTimeFlowType; onRowClick: (period: string) => void };

function LeaderboardRow({ row, currency, activeFlowType, onRowClick }: RowProps): React.JSX.Element {
  const total = activeFlowType === 'income' ? row.income : row.expense;
  const average = row.count > 0 ? total / row.count : 0;
  return (
    <tr>
      <td style={{ fontWeight: 500, color: 'var(--foreground)' }}>
        <button type="button" className="lumio-view-page__table-link" onClick={() => onRowClick(row.period)}>
          {row.label}
        </button>
      </td>
      <td style={{ textAlign: 'right' }}>{row.count}</td>
      <td style={{ textAlign: 'right' }}>{formatMoney(average, currency)}</td>
      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--foreground)' }}>{formatMoney(total, currency)}</td>
      <td style={{ textAlign: 'right', color: 'var(--muted-foreground)' }}>{row.label}</td>
    </tr>
  );
}

export function SpendOverTimeLeaderboard({ rows, sortKey, onSortChange, onRowClick, activeFlowType, title, currency, sortLabels, columnLabels }: Props): React.JSX.Element {
  const sortKeyLabels: Record<SortKey, string> = { amount: sortLabels.sortByAmount, average: sortLabels.sortByAverage, operations: sortLabels.sortByOperations };
  return (
    <div className="lumio-view-page__leaderboard-card">
      <div className="lumio-view-page__leaderboard-header">
        <div className="lumio-view-page__leaderboard-title-row">
          <h3 className="lumio-view-page__leaderboard-title">{title}</h3>
          <span className="lumio-view-page__leaderboard-count">{rows.length}</span>
        </div>
        <div className="lumio-view-page__sort-tabs">
          {SORT_KEYS.map(k => <SortBtn key={k} label={sortKeyLabels[k]} active={sortKey === k} onClick={() => onSortChange(k)} />)}
        </div>
      </div>
      <div className="lumio-view-page__table-wrap">
        <table className="lumio-view-page__table">
          <thead><tr><th>{columnLabels.period}</th><th style={{ textAlign: 'right' }}>{columnLabels.operations}</th><th style={{ textAlign: 'right' }}>{columnLabels.average}</th><th style={{ textAlign: 'right' }}>{columnLabels.amount}</th><th style={{ textAlign: 'right' }}>{columnLabels.lastOperation}</th></tr></thead>
          <tbody>{rows.slice(0, 60).map(row => <LeaderboardRow key={row.period} row={row} currency={currency} activeFlowType={activeFlowType} onRowClick={onRowClick} />)}</tbody>
        </table>
      </div>
    </div>
  );
}
