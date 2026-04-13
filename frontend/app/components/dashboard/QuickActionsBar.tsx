'use client';

import Box from '@mui/material/Box';
import { Button } from '@/app/components/ui/button';
import { FileUp, ListChecks } from 'lucide-react';
import Link from 'next/link';

const staticActions = [
  { key: 'upload' as const, label: 'Upload / Parse', href: '/statements/submit', icon: FileUp },
  {
    key: 'review' as const,
    baseLabel: 'Review queue',
    href: '/statements?filter=needs_review',
    icon: ListChecks,
  },
];

interface QuickActionsBarProps {
  reviewCount?: number;
}

export function QuickActionsBar({ reviewCount }: QuickActionsBarProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {staticActions.map(action => {
        const label =
          action.key === 'review'
            ? reviewCount !== undefined
              ? `${action.baseLabel} (${reviewCount})`
              : action.baseLabel
            : action.label;

        return (
          <Link key={action.key} href={action.href}>
            <Button
              variant="ghost"
              size="sm"
              style={{ gap: 6, borderRadius: 0, color: '#64748b', fontSize: 12, height: 28, padding: '0 12px', fontWeight: 400 }}
            >
              <action.icon size={14} />
              {label}
            </Button>
          </Link>
        );
      })}
    </Box>
  );
}
