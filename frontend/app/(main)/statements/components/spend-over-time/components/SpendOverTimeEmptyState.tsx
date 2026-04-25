'use client';
import type { JSX } from 'react';

type Props = {
  titleLabel: string;
  descriptionLabel: string;
  uploadCtaLabel: string;
  resetCtaLabel: string;
  onUpload: () => void;
  onReset: () => void;
};

export function SpendOverTimeEmptyState({ titleLabel, descriptionLabel, uploadCtaLabel, resetCtaLabel, onUpload, onReset }: Props): React.JSX.Element {
  return (
    <div className="lumio-view-page__empty">
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{titleLabel}</p>
      <p style={{ marginTop: 4, fontSize: 14, color: 'var(--muted-foreground)' }}>{descriptionLabel}</p>
      <div className="lumio-view-page__empty-actions">
        <button type="button" className="lumio-view-page__empty-cta-primary" onClick={onUpload}>
          {uploadCtaLabel}
        </button>
        <button type="button" className="lumio-view-page__empty-cta-secondary" onClick={onReset}>
          {resetCtaLabel}
        </button>
      </div>
    </div>
  );
}
