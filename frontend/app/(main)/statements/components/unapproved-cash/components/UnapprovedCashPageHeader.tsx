import React from 'react';
import { Spinner } from '@/app/components/ui/spinner';
import { RefreshCcw } from 'lucide-react';

interface UnapprovedCashPageHeaderProps {
  title: string;
  subtitle: string;
  refreshLabel: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function UnapprovedCashPageHeader({
  title,
  subtitle,
  refreshLabel,
  loading,
  refreshing,
  onRefresh,
}: UnapprovedCashPageHeaderProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{title}</h1>
        <p style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid #e5e7eb',
          background: 'var(--card-bg)',
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: 500,
          color: '#374151',
          cursor: 'pointer',
          borderRadius: 'var(--lumio-radius-md)',
          transition: 'background 0.15s',
        }}
        disabled={refreshing || loading}
      >
        {refreshing || loading ? (
          <Spinner size={16} />
        ) : (
          <RefreshCcw style={{ width: 16, height: 16 }} />
        )}
        {refreshLabel}
      </button>
    </div>
  );
}
