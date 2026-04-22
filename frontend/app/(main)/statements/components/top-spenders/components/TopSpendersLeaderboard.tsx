'use client';
import type { JSX } from 'react';

import { AnalyticsSourceBadge } from '@/app/(main)/statements/components/analytics/AnalyticsSourceBadge';
import type { AggregateSortKey, TopSpenderAggregateRow, TopSpenderSourceChannel } from '@/app/(main)/statements/components/top-spenders/top-spenders.types';
import { formatMoney } from '@/app/lib/analytics-common';

type SourceLabels = { sourceBank: string; sourceReceipt: string; sourceGmailInbox: string };
type SortLabels = { sortByAmount: string; sortByAverage: string; sortByOperations: string };
type ColumnLabels = { company: string; source: string; operations: string; average: string; amount: string; lastOperation: string };

type Props = {
  rows: TopSpenderAggregateRow[];
  sortKey: AggregateSortKey;
  onSortChange: (key: AggregateSortKey) => void;
  onRowClick: (id: string) => void;
  title: string;
  currency: string;
  sourceLabels: SourceLabels;
  sortLabels: SortLabels;
  columnLabels: ColumnLabels;
};

const SORT_KEYS: AggregateSortKey[] = ['amount', 'average', 'operations'];

type SortBtnProps = { label: string; active: boolean; onClick: () => void };

function SortBtn({ label, active, onClick }: SortBtnProps): JSX.Element {
  return (
    <button type="button" style={{ borderRadius: 'var(--lumio-radius-sm)', padding: '4px 10px', fontSize: 12, fontWeight: 500, background: active ? '#fff' : 'transparent', color: active ? '#111827' : '#4b5563', border: 'none', cursor: 'pointer', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }} onClick={onClick}>
      {label}
    </button>
  );
}

type RowProps = { row: TopSpenderAggregateRow; currency: string; sourceLabels: SourceLabels; onRowClick: (id: string) => void };

function LeaderboardRow({ row, currency, sourceLabels, onRowClick }: RowProps): JSX.Element {
  const lastDate = row.lastDate && !Number.isNaN(new Date(row.lastDate).getTime()) ? new Date(row.lastDate).toLocaleDateString() : '-';
  return (
    <tr style={{ color: '#374151', borderTop: '1px solid #f3f4f6' }}>
      <td style={{ padding: '8px 16px 8px 0', fontWeight: 500, color: '#111827' }}>
        <button type="button" style={{ textAlign: 'left', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }} onClick={() => onRowClick(row.id)}>{row.company}</button>
      </td>
      <td style={{ padding: '8px 16px 8px 0' }}><AnalyticsSourceBadge sourceChannel={row.sourceChannel as TopSpenderSourceChannel} labels={sourceLabels} /></td>
      <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{row.count}</td>
      <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{formatMoney(row.average, currency)}</td>
      <td style={{ padding: '8px 16px 8px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatMoney(row.total, currency)}</td>
      <td style={{ padding: '8px 0', textAlign: 'right', color: '#6b7280' }}>{lastDate}</td>
    </tr>
  );
}

export function TopSpendersLeaderboard({ rows, sortKey, onSortChange, onRowClick, title, currency, sourceLabels, sortLabels, columnLabels }: Props): JSX.Element {
  const sortKeyLabels: Record<AggregateSortKey, string> = { amount: sortLabels.sortByAmount, average: sortLabels.sortByAverage, operations: sortLabels.sortByOperations };
  return (
    <div style={{ border: '1px solid #e5e7eb', background: 'var(--card-bg)', padding: 20, borderRadius: 'var(--lumio-radius-lg)' }}>
      <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{rows.length}</span>
        </div>
        <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', background: '#f9fafb', padding: 4, borderRadius: 'var(--lumio-radius-md)' }}>
          {SORT_KEYS.map(k => <SortBtn key={k} label={sortKeyLabels[k]} active={sortKey === k} onClick={() => onSortChange(k)} />)}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
              <th style={{ padding: '8px 16px 8px 0' }}>{columnLabels.company}</th><th style={{ padding: '8px 16px 8px 0' }}>{columnLabels.source}</th>
              <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{columnLabels.operations}</th><th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{columnLabels.average}</th>
              <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{columnLabels.amount}</th><th style={{ padding: '8px 0', textAlign: 'right' }}>{columnLabels.lastOperation}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map(row => <LeaderboardRow key={row.id} row={row} currency={currency} sourceLabels={sourceLabels} onRowClick={onRowClick} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
