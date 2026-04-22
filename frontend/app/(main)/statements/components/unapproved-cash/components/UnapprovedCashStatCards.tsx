import type { UnapprovedReasonId } from '../../unapproved-cash-utils';

interface UnapprovedCashStatCardsProps {
  totalCount: number;
  reasonCounts: Record<UnapprovedReasonId, number>;
  labels: {
    total: string;
    missingCategory: string;
    duplicates: string;
    confirmation: string;
  };
}

const CARD_STYLE: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  background: 'var(--card-bg)',
  padding: 12,
  borderRadius: 'var(--lumio-radius-lg)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
};

const VALUE_STYLE: React.CSSProperties = {
  marginTop: 4,
  fontSize: 20,
  fontWeight: 600,
  color: '#111827',
};

export function UnapprovedCashStatCards({
  totalCount,
  reasonCounts,
  labels,
}: UnapprovedCashStatCardsProps): React.ReactElement {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.total}</p>
        <p style={VALUE_STYLE}>{totalCount}</p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.missingCategory}</p>
        <p style={VALUE_STYLE}>{reasonCounts['missing-category']}</p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.duplicates}</p>
        <p style={VALUE_STYLE}>{reasonCounts['duplicate-detected']}</p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.confirmation}</p>
        <p style={VALUE_STYLE}>{reasonCounts['requires-confirmation']}</p>
      </div>
    </div>
  );
}
