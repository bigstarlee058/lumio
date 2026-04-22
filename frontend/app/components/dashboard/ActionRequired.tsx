'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardActionItem } from '@/app/hooks/useDashboard';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

type ActionPriority = 'critical' | 'warning' | 'info' | 'success';

interface ActionRequiredProps {
  actions: Array<
    DashboardActionItem & {
      priority: ActionPriority;
      ctaLabel?: string;
      periodLabel?: string;
    }
  >;
  title: string;
  emptyLabel: string;
  isLoading?: boolean;
}

const priorityDotColor: Record<ActionPriority, string> = {
  critical: '#D13D56',
  warning: '#F5A623',
  info: '#0584C7',
  success: '#0D9568',
};

export function ActionRequired({ actions, emptyLabel, isLoading }: ActionRequiredProps) {
  if (!isLoading && actions.length === 0) {
    return (
      <Typography
        sx={{ fontSize: 13, fontWeight: 500, color: '#34d399', fontFamily: 'var(--font-dashboard-sans)' }}
      >
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {actions.map(action => {
        const priority: ActionPriority = action.priority ?? 'info';
        const dotColor = priorityDotColor[priority];

        return (
          <Link
            key={action.type}
            href={action.href}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', transition: 'opacity 150ms', textDecoration: 'none' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box
                component="span"
                sx={{ height: 6, width: 6, borderRadius: 'var(--lumio-radius-full)', flexShrink: 0, backgroundColor: dotColor, display: 'inline-block' }}
              />
              <Typography
                component="span"
                sx={{ fontSize: 13, color: 'text.primary', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-dashboard-sans)' }}
              >
                {isLoading ? (
                  <Spinner style={{ width: 12, height: 12, display: 'inline' }} />
                ) : (
                  <>
                    <strong>{action.count}</strong>{' '}
                    <span style={{ fontWeight: 400 }}>{action.label}</span>
                  </>
                )}
              </Typography>
            </Box>
            <ArrowUpRight size={12} style={{ marginLeft: 8, flexShrink: 0, color: 'var(--muted-foreground)', opacity: 0, transition: 'opacity 150ms' }} />
          </Link>
        );
      })}
    </Box>
  );
}
