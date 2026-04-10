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
      <div className="space-y-4">
        <div className="rounded-none border border-gray-200 bg-white p-4 text-sm text-gray-500">
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EntityHistoryTimeline events={events} onSelect={onSelect} />
    </div>
  );
}
