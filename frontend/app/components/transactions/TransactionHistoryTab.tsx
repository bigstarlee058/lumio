'use client';

import React from 'react';

import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import type { AuditEvent } from '@/lib/api/audit';

interface TransactionHistoryTabProps {
  events: AuditEvent[];
  loading: boolean;
  onSelect: (event: AuditEvent) => void;
}

export function TransactionHistoryTab({ events, loading, onSelect }: TransactionHistoryTabProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: 16, fontSize: 14, color: '#6b7280' }}>
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EntityHistoryTimeline events={events} onSelect={onSelect} />
    </div>
  );
}
