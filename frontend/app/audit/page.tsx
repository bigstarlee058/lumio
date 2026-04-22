'use client';

import { Download } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { AuditEventDrawer } from './components/AuditEventDrawer';
import { AuditFilterBar } from './components/AuditFilterBar';
import { AuditRollbackModal } from './components/AuditRollbackModal';
import { AuditTimeline } from './components/AuditTimeline';
import { useAuditLoader } from './hooks/useAuditLoader';
import { useAuditRollback } from './hooks/useAuditRollback';

export default function AuditPage() {
  const loader = useAuditLoader();
  const [selectedEvent, setSelectedEvent] = useState<import('@/lib/api/audit').AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rollback = useAuditRollback({
    onAfterRollback: loader.reload,
    onCloseDrawer: () => setDrawerOpen(false),
  });

  const onSelectEvent = (event: import('@/lib/api/audit').AuditEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const handleFiltersChange = (update: Partial<import('@/lib/api/audit').AuditEventFilter>) => {
    loader.setFilters(prev => ({ ...prev, ...update }));
    loader.setPage(1);
  };

  return (
    <div className="audit-page">
      {/* Header */}
      <div className="audit-page__head">
        <div>
          <h1 className="audit-page__title">Activity log</h1>
          <p className="audit-page__subtitle">
            Complete trail of what happened in your workspace. One-click rollback for supported operations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast('Export coming soon')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 14px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--lumio-color-ink-700)',
            background: 'var(--card-bg)',
            border: '1px solid var(--lumio-color-ink-200)',
            borderRadius: 'var(--lumio-radius-md)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Download size={14} />
          Export log
        </button>
      </div>

      {/* Filter bar */}
      <AuditFilterBar filters={loader.filters} onFiltersChange={handleFiltersChange} />

      {/* Error */}
      {loader.error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--lumio-color-danger)',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--lumio-radius-md)',
          }}
        >
          {loader.error}
        </div>
      )}

      {/* Timeline */}
      <div className="audit-timeline-card">
        {loader.loading ? (
          <div className="audit-empty" style={{ padding: '32px 0' }}>Loading…</div>
        ) : (
          <AuditTimeline
            events={loader.events}
            onSelect={onSelectEvent}
            onRollback={rollback.handleRollback}
            page={loader.page}
            limit={loader.limit}
            total={loader.total}
            onPageChange={loader.setPage}
          />
        )}
      </div>

      {/* Drawer */}
      <AuditEventDrawer
        event={selectedEvent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRollback={rollback.handleRollback}
      />

      {/* Rollback confirm modal */}
      <AuditRollbackModal rollback={rollback} />
    </div>
  );
}
