'use client';

import type { AuditEvent } from '@/lib/api/audit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import {
  CheckCircle2,
  Edit3,
  FileDown,
  FileUp,
  Link2,
  PlusCircle,
  RotateCcw,
  Trash2,
  Unlink2,
} from 'lucide-react';
import React from 'react';

interface EntityHistoryTimelineProps {
  events: AuditEvent[];
  onSelect?: (event: AuditEvent) => void;
}

type LucideIcon = typeof Edit3;

const ACTION_ICON_MAP: Record<string, LucideIcon> = {
  create: PlusCircle,
  update: Edit3,
  delete: Trash2,
  import: FileUp,
  export: FileDown,
  rollback: RotateCcw,
  apply_rule: CheckCircle2,
  link: Link2,
  unlink: Unlink2,
};

function iconForAction(action: string): LucideIcon {
  return ACTION_ICON_MAP[action] ?? Edit3;
}

function TimelineEventItem({ event, onSelect }: { event: AuditEvent; onSelect?: (event: AuditEvent) => void }): React.JSX.Element {
  const Icon = iconForAction(event.action);
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      style={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: 12, border: '1px solid #e5e7eb', background: 'var(--card-bg)', padding: 12, textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--lumio-radius-lg)' }}
    >
      <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--lumio-radius-full)', bgcolor: '#f3f4f6', color: '#4b5563', flexShrink: 0 }}>
        <Icon size={16} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" fontWeight={600} style={{ color: '#111827' }}>
            {event.action.replace(/_/g, ' ')}
          </Typography>
          <Typography variant="caption" style={{ color: '#6b7280' }}>
            {new Date(event.createdAt).toLocaleString()}
          </Typography>
        </Box>
        <Typography variant="caption" style={{ color: '#4b5563', display: 'block', marginTop: 4 }}>
          {event.actorLabel} • {event.entityType} • {event.severity}
        </Typography>
        {event.batchId && (
          <Typography variant="caption" style={{ color: '#6b7280', display: 'block', marginTop: 4 }}>
            Batch {event.batchId}
          </Typography>
        )}
      </Box>
    </button>
  );
}

export function EntityHistoryTimeline({ events, onSelect }: EntityHistoryTimelineProps): React.JSX.Element {
  if (!events.length) {
    return <Typography variant="body2" style={{ color: '#6b7280' }}>No history available.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map(event => (
        <TimelineEventItem key={event.id} event={event} onSelect={onSelect} />
      ))}
    </Box>
  );
}
