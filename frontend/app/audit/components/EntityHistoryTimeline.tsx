'use client';

import type { AuditEvent } from '@/lib/api/audit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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

export function EntityHistoryTimeline({ events, onSelect }: EntityHistoryTimelineProps) {
  if (!events.length) {
    return <Typography variant="body2" style={{ color: '#6b7280' }}>No history available.</Typography>;
  }

  const iconForAction = (action: string) => {
    switch (action) {
      case 'create':
        return PlusCircle;
      case 'update':
        return Edit3;
      case 'delete':
        return Trash2;
      case 'import':
        return FileUp;
      case 'export':
        return FileDown;
      case 'rollback':
        return RotateCcw;
      case 'apply_rule':
        return CheckCircle2;
      case 'link':
        return Link2;
      case 'unlink':
        return Unlink2;
      default:
        return Edit3;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map(event => {
        const Icon = iconForAction(event.action);
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect?.(event)}
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'flex-start',
              gap: 12,
              border: '1px solid #e5e7eb',
              background: 'var(--card-bg)',
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            <Box
              sx={{
                mt: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#f3f4f6',
                color: '#4b5563',
                flexShrink: 0,
              }}
            >
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
      })}
    </Box>
  );
}
