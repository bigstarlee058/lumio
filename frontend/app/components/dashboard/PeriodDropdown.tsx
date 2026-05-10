'use client';

import type { DashboardRange } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import { useEffect, useRef, useState } from 'react';

interface PeriodDropdownProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

const LABELS: Record<DashboardRange, string> = {
  '7d': 'Weekly',
  '30d': 'Monthly',
  '90d': 'Quarterly',
};

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <Box ref={ref} sx={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 12,
          color: 'var(--muted-foreground)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {LABELS[value]} <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open ? (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            mt: 0.5,
            width: 140,
            border: '1px solid var(--border-color)',
            bgcolor: 'background.paper',
            zIndex: 10,
          }}
        >
          {(Object.entries(LABELS) as [DashboardRange, string][]).map(([r, label]) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: value === r ? '#2563eb' : 'var(--text-secondary)',
                fontWeight: value === r ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
