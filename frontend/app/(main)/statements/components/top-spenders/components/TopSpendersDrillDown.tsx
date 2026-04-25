'use client';
import type { JSX } from 'react';

import { AnalyticsSourceBadge } from '@/app/(main)/statements/components/analytics/AnalyticsSourceBadge';
import type {
  TopSpenderAggregateRow,
  TopSpenderRecord,
  TopSpenderSourceChannel,
} from '@/app/(main)/statements/components/top-spenders/top-spenders.types';
import { formatMoney } from '@/app/lib/analytics-common';
import { X } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

type SourceLabels = { sourceBank: string; sourceReceipt: string; sourceGmailInbox: string };

type Props = {
  selectedRow: TopSpenderAggregateRow;
  drillDownRecords: TopSpenderRecord[];
  onClose: () => void;
  currency: string;
  sourceLabels: SourceLabels;
  labels: { drillDown: string; close: string; noOperations: string; lastOperation: string; source: string; workspace: string; amount: string };
};

type HeaderProps = { selectedRow: TopSpenderAggregateRow; sourceLabels: SourceLabels; labels: Pick<Props['labels'], 'drillDown' | 'close'>; onClose: () => void };

function DrillDownHeader({ selectedRow, sourceLabels, labels, onClose }: HeaderProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 20px' }}>
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedRow.company} - {labels.drillDown}</h4>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          <AnalyticsSourceBadge sourceChannel={selectedRow.sourceChannel as TopSpenderSourceChannel} labels={sourceLabels} />
        </p>
      </div>
      <button type="button" style={{ borderRadius: tokens.radius.md, padding: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose} aria-label={labels.close}>
        <X size={16} />
      </button>
    </div>
  );
}

export function TopSpendersDrillDown({ selectedRow, drillDownRecords, onClose, currency, sourceLabels, labels }: Props): React.JSX.Element {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', padding: 16 }}>
      <div style={{ maxHeight: '85vh', width: '100%', maxWidth: 896, overflow: 'hidden', border: '1px solid #e5e7eb', background: 'var(--card-bg)', borderRadius: tokens.radius.xl }}>
        <DrillDownHeader selectedRow={selectedRow} sourceLabels={sourceLabels} labels={labels} onClose={onClose} />
        <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}>
          {drillDownRecords.length === 0 ? (
            <div style={{ border: '1px dashed #d1d5db', padding: 32, textAlign: 'center', fontSize: 14, color: '#6b7280', borderRadius: tokens.radius.lg }}>
              {labels.noOperations}
            </div>
          ) : (
            <DrillDownTable records={drillDownRecords} currency={currency} sourceLabels={sourceLabels} labels={labels} />
          )}
        </div>
      </div>
    </div>
  );
}

type TableProps = {
  records: TopSpenderRecord[];
  currency: string;
  sourceLabels: SourceLabels;
  labels: Pick<Props['labels'], 'lastOperation' | 'source' | 'workspace' | 'amount'>;
};

function DrillDownTable({ records, currency, sourceLabels, labels }: TableProps): React.JSX.Element {
  return (
    <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
          <th style={{ padding: '8px 16px 8px 0' }}>{labels.lastOperation}</th><th style={{ padding: '8px 16px 8px 0' }}>{labels.source}</th>
          <th style={{ padding: '8px 16px 8px 0' }}>{labels.workspace}</th><th style={{ padding: '8px 0', textAlign: 'right' }}>{labels.amount}</th>
        </tr>
      </thead>
      <tbody>
        {records.slice(0, 120).map(record => (
          <tr key={record.id} style={{ color: '#374151', borderTop: '1px solid #f3f4f6' }}>
            <td style={{ padding: '8px 16px 8px 0', color: '#4b5563' }}>
              {record.dateValue && !Number.isNaN(new Date(record.dateValue).getTime())
                ? new Date(record.dateValue).toLocaleDateString()
                : '-'}
            </td>
            <td style={{ padding: '8px 16px 8px 0' }}>
              <AnalyticsSourceBadge sourceChannel={record.sourceChannel as TopSpenderSourceChannel} labels={sourceLabels} />
            </td>
            <td style={{ padding: '8px 16px 8px 0', color: '#4b5563' }}>{record.workspaceName || '-'}</td>
            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{formatMoney(record.amount, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
