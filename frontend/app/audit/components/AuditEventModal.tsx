'use client';

import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import type { AuditEvent } from '@/lib/api/audit';
import React from 'react';
import { formatAuditEvent } from '../utils/formatAuditEvent';
import { relativeTime } from '../utils/relativeTime';

interface AuditEventModalProps {
  event: AuditEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onRollback?: (event: AuditEvent) => void;
  rollbackLoading?: boolean;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid var(--lumio-color-ink-100)',
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  color: 'var(--lumio-color-ink-500)',
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  color: 'var(--lumio-color-ink-900)',
  fontWeight: 500,
  textAlign: 'right',
  maxWidth: '60%',
  wordBreak: 'break-all',
};

export function AuditEventModal({ event, isOpen, onClose, onRollback, rollbackLoading }: AuditEventModalProps) {
  if (!event) return null;
  const formatted = formatAuditEvent(event);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Event details"
      size="sm"
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelText="Close"
          {...(event.isUndoable && onRollback
            ? {
                onConfirm: () => onRollback(event),
                confirmText: 'Rollback',
                confirmVariant: 'destructive',
                isConfirmLoading: rollbackLoading,
              }
            : {})}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Description banner */}
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            background: 'var(--lumio-color-ink-50, #f8f8f9)',
            border: '1px solid var(--lumio-color-ink-150)',
            borderRadius: 'var(--lumio-radius-md)',
            fontSize: 13,
            color: 'var(--lumio-color-ink-700)',
            lineHeight: 1.5,
          }}
        >
          {formatted.description}
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Actor</span>
          <span style={valueStyle}>{event.actorLabel}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Action</span>
          <span style={valueStyle}>{formatted.actionLabel}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Entity</span>
          <span style={valueStyle}>{formatted.objectLabel}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>When</span>
          <span style={valueStyle}>{relativeTime(event.createdAt)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Severity</span>
          <span style={valueStyle}>{event.severity}</span>
        </div>

        {event.isUndoable && (
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--lumio-color-ink-400)',
              lineHeight: 1.5,
            }}
          >
            This action can be rolled back. Click "Rollback" to restore the previous state.
          </p>
        )}
      </div>
    </ModalShell>
  );
}
