'use client';

import { getRecord } from '@/app/lib/side-panel-utils';
import type { AuditEventDiff } from '@/lib/api/audit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'workspaceId', 'userId']);

const FIELD_LABELS: Record<string, string> = {
  backgroundImage: 'Background image',
  color: 'Color',
  name: 'Name',
  description: 'Description',
  title: 'Title',
  position: 'Position',
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function DiffViewer({ diff }: { diff: AuditEventDiff | null }) {
  if (!diff) {
    return <Typography variant="body2" style={{ color: '#6b7280' }}>No diff available.</Typography>;
  }

  if (Array.isArray(diff)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {diff.map((op, idx) => {
          const key = `${op.op}-${op.path}-${idx}`;

          return (
            <Box key={key} sx={{ border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 1.5, fontSize: 14 }}>
              <Typography variant="body2" fontWeight={600} style={{ color: '#1f2937' }}>
                {op.op.toUpperCase()} {op.path}
              </Typography>
              {op.value !== undefined && (
                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12, color: '#4b5563', margin: '8px 0 0' }}>
                  {formatValue(op.value)}
                </pre>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  const before = diff.before || {};
  const after = diff.after || {};
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  ).filter(key => !TECHNICAL_FIELDS.has(key));

  if (keys.length === 0) {
    return <Typography variant="body2" style={{ color: '#6b7280' }}>No user-facing changes available.</Typography>;
  }

  return (
    <Box sx={{ overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          bgcolor: '#f9fafb',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>Field</Box>
        <Box sx={{ px: 1.5, py: 1 }}>Before</Box>
        <Box sx={{ px: 1.5, py: 1 }}>After</Box>
      </Box>
      <Box>
        {keys.map(key => {
          const beforeValue = getRecord(before)?.[key];
          const afterValue = getRecord(after)?.[key];
          const hadBefore = Object.prototype.hasOwnProperty.call(before, key);
          const hadAfter = Object.prototype.hasOwnProperty.call(after, key);
          const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
          const rowBg =
            hadBefore && !hadAfter
              ? '#fef2f2'
              : !hadBefore && hadAfter
                ? '#f0fdf4'
                : changed
                  ? '#fefce8'
                  : 'transparent';
          return (
            <Box
              key={key}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                fontSize: 14,
                bgcolor: rowBg,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <Box sx={{ px: 1.5, py: 1, fontWeight: 500, color: '#374151' }}>
                {FIELD_LABELS[key] ?? key}
              </Box>
              <Box sx={{ px: 1.5, py: 1, color: '#4b5563' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{formatValue(beforeValue)}</pre>
              </Box>
              <Box sx={{ px: 1.5, py: 1, color: '#4b5563' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{formatValue(afterValue)}</pre>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
