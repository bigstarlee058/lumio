'use client';

import React from 'react';

import { Box, Typography } from '@mui/material';
import type { CustomTableGridRow } from '../utils/stylingUtils';

interface MetaRowProps {
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
}

function MetaRow({ label, value, valueStyle }: MetaRowProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Typography style={{ fontSize: 14, color: '#4b5563' }}>{label}</Typography>
      <Typography style={valueStyle}>{value}</Typography>
    </Box>
  );
}

interface RowDrawerMetaBoxProps {
  row: CustomTableGridRow;
}

export function RowDrawerMetaBox({ row }: RowDrawerMetaBoxProps): React.JSX.Element {
  return (
    <Box sx={{ border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 2 }}>
      <Typography
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#6b7280',
        }}
      >
        Meta
      </Typography>
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <MetaRow
          label="Row number"
          value={row.rowNumber}
          valueStyle={{ fontSize: 14, fontWeight: 600, color: '#111827' }}
        />
        <MetaRow
          label="Row id"
          value={row.id}
          valueStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1f2937' }}
        />
      </Box>
    </Box>
  );
}
