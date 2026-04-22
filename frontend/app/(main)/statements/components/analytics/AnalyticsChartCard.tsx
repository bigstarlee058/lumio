'use client';
import type { JSX } from 'react';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  height?: number;
  spanColumns?: number;
};

export function AnalyticsChartCard({ title, children, spanColumns }: Props): JSX.Element {
  const style: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    background: 'var(--card-bg)',
    padding: 20,
    borderRadius: 'var(--lumio-radius-lg)',
  };

  if (spanColumns) {
    style.gridColumn = `span ${spanColumns}`;
  }

  return (
    <div style={style}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
