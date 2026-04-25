'use client';

import Box from '@mui/material/Box';
import { Button } from '@/app/components/ui/button';
import { FileUp, Plus } from '@/app/components/icons';
import Link from 'next/link';
import { tokens } from '@/lib/theme-tokens';

const actions = [
  {
    key: 'upload',
    label: 'Upload document',
    href: '/statements/submit',
    icon: FileUp,
  },
  {
    key: 'payment',
    label: 'Create payment',
    href: '/statements/pay',
    icon: Plus,
  },
] as const;

type ActionKey = (typeof actions)[number]['key'];

interface QuickActionsProps {
  allowed?: ActionKey[];
  labels: Record<ActionKey, string>;
}

export function QuickActions({ allowed, labels }: QuickActionsProps) {
  const visibleActions = allowed ? actions.filter(action => allowed.includes(action.key)) : actions;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {visibleActions.map(action => (
        <Link key={action.href} href={action.href}>
          <Button
            variant="outline"
            style={{ gap: 8, borderRadius: tokens.radius.md, borderColor: 'rgba(var(--primary-rgb),0.3)', color: 'var(--primary)' }}
          >
            <action.icon size={16} />
            {labels[action.key]}
          </Button>
        </Link>
      ))}
    </Box>
  );
}
