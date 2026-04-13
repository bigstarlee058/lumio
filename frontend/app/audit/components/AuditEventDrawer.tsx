'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { AuditEvent } from '@/lib/api/audit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import { formatAuditEvent } from '../utils/formatAuditEvent';
import { DiffViewer } from './DiffViewer';

interface AuditEventDrawerProps {
  event: AuditEvent | null;
  open: boolean;
  onClose: () => void;
  onRollback?: (event: AuditEvent) => void;
}

export function AuditEventDrawer({ event, open, onClose, onRollback }: AuditEventDrawerProps) {
  if (!event) return null;

  const formatted = formatAuditEvent(event);

  return (
    <DrawerShell isOpen={open} onClose={onClose} title="Audit Event" position="right" width="lg">
      <Box data-testid="audit-event-drawer-scroll" sx={{ minHeight: 0, flex: 1, overflowY: 'auto', pr: 0.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 3 }}>
          <Box sx={{ border: '1px solid #bfdbfe', bgcolor: '#eff6ff', p: 2 }}>
            <Typography variant="body2" fontWeight={600} style={{ color: '#1e3a5f' }}>
              {formatted.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 2, fontSize: 14 }}>
            {[
              { label: 'Timestamp', value: new Date(event.createdAt).toLocaleString() },
              { label: 'Actor', value: event.actorLabel },
              { label: 'Action', value: formatted.actionLabel },
              { label: 'Entity', value: formatted.objectLabel },
            ].map(row => (
              <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#4b5563', fontSize: 14 }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{row.value}</span>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#4b5563', fontSize: 14 }}>Entity ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>{event.entityId}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#4b5563', fontSize: 14 }}>Severity</span>
              <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{event.severity}</span>
            </Box>
            {event.batchId && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#4b5563', fontSize: 14 }}>Batch</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>{event.batchId}</span>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="body2" fontWeight={600} style={{ color: '#111827' }}>
              Diff
            </Typography>
            <Box sx={{ mt: 1 }}>
              <DiffViewer diff={event.diff} />
            </Box>
          </Box>

          <details style={{ border: '1px solid #e5e7eb', background: 'var(--card-bg)', padding: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111827' }}>
              Metadata
            </summary>
            <Box sx={{ mt: 1, fontSize: 12, color: '#374151' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {event.meta ? JSON.stringify(event.meta, null, 2) : 'No metadata'}
              </pre>
            </Box>
          </details>

          {event.meta?.rollbackOf && (
            <Box sx={{ border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 1.5, fontSize: 14, color: '#374151' }}>
              Related event (rollback of):
              <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 12, color: '#111827' }}>
                {event.meta.rollbackOf}
              </span>
            </Box>
          )}

          {event.isUndoable && (
            <button
              type="button"
              onClick={() => onRollback?.(event)}
              style={{
                width: '100%',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: '#b91c1c',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              Откатить изменение
            </button>
          )}
        </Box>
      </Box>
    </DrawerShell>
  );
}
