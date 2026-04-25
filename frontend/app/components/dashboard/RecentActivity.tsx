'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardRecentActivity } from '@/app/hooks/useDashboard';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  FileUp,
  Inbox,
  Receipt,
  ShieldOff,
  Tag,
} from '@/app/components/icons';
import Link from 'next/link';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { subtleBadge } from './common';
import { tokens } from '@/lib/theme-tokens';

interface RecentActivityProps {
  activities: DashboardRecentActivity[];
  formatAmount: (value: number) => string;
  title: string;
  emptyLabel: string;
}

type ActivityBucket = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

const typeConfig: Record<string, { icon: React.ElementType; label: string; tone: string }> = {
  statement_upload: { icon: FileUp, label: 'Statement uploaded', tone: 'text-blue-700 bg-blue-50' },
  payment: { icon: Receipt, label: 'Payment recorded', tone: 'text-amber-700 bg-amber-50' },
  categorization: { icon: Tag, label: 'Category updated', tone: 'text-teal-700 bg-teal-50' },
  transaction: { icon: Receipt, label: 'Transaction updated', tone: 'text-gray-700 bg-gray-50' },
  import: { icon: Inbox, label: 'Import completed', tone: 'text-emerald-700 bg-emerald-50' },
  delete: { icon: ShieldOff, label: 'Item deleted', tone: 'text-rose-700 bg-rose-50' },
  update: { icon: FileText, label: 'Item updated', tone: 'text-slate-700 bg-slate-50' },
};

function bucketForDate(timestamp: string): ActivityBucket {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return 'Earlier';
}

function normalizeTitle(activity: DashboardRecentActivity): string {
  if (activity.title && !activity.title.match(/[0-9a-fA-F-]{8,}/)) return activity.title;
  const config = typeConfig[activity.type];
  return config?.label ?? 'Activity';
}

const CONTEXT_LABELS: Record<string, string> = {
  payment: 'Payment recorded',
  categorization: 'Category updated',
  statement_upload: 'Statement uploaded',
  import: 'Import finished',
  delete: 'Item deleted',
  update: 'Item updated',
};

function formatContext(activity: DashboardRecentActivity): string {
  if (activity.description) return activity.description;
  const label = CONTEXT_LABELS[activity.type];
  if (label) return label;
  return activity.type.replace(/_/g, ' ');
}

function groupActivities(activities: DashboardRecentActivity[]): Array<{ bucket: ActivityBucket; list: DashboardRecentActivity[] }> {
  const buckets: Record<ActivityBucket, DashboardRecentActivity[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  activities.forEach(act => {
    buckets[bucketForDate(act.timestamp)].push(act);
  });

  return (Object.entries(buckets) as [ActivityBucket, DashboardRecentActivity[]][])
    .filter(([, list]) => list.length > 0)
    .map(([bucket, list]) => ({ bucket, list }));
}

type ActivityAmountProps = { amount: number; formatAmount: (value: number) => string };

function ActivityAmount({ amount, formatAmount }: ActivityAmountProps): React.JSX.Element {
  const isPositive = amount >= 0;
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-ibm-plex-sans)', letterSpacing: '-0.01em' }}>
      {isPositive ? <ArrowUpRight size={16} color="#22c55e" strokeWidth={2.5} /> : <ArrowDownRight size={16} color="#94a3b8" strokeWidth={2.5} />}
      <span style={{ color: isPositive ? '#16a34a' : '#475569' }}>{formatAmount(Math.abs(amount))}</span>
    </Box>
  );
}

type ActivityItemProps = { activity: DashboardRecentActivity; formatAmount: (value: number) => string };

function ActivityItem({ activity, formatAmount }: ActivityItemProps): React.JSX.Element {
  const config = typeConfig[activity.type] ?? typeConfig.transaction;
  const Icon = config.icon;
  const isStatementUpload = activity.type === 'statement_upload' && activity.entityId;
  return (
    <Link href={activity.href} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '4px 8px', transition: 'all 150ms', textDecoration: 'none', backgroundColor: 'transparent', border: '1px solid transparent' }}>
      <Box component="span" sx={{ display: 'flex', height: 40, width: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', bgcolor: isStatementUpload ? 'transparent' : 'var(--muted)', color: '#475569', border: isStatementUpload ? 'none' : '1px solid #E8E8E8', transition: 'background-color 150ms, color 150ms', overflow: 'hidden' }}>
        {isStatementUpload ? (
          <DocumentTypeIcon
            fileId={activity.entityId}
            fileName={activity.title}
            source="statement"
            size={40}
          />
        ) : (
          <Icon size={16} />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, justifyContent: 'center' }}>
        <Typography component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          {normalizeTitle(activity)}
        </Typography>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, mt: 0.5, color: '#64748b', fontWeight: 400 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatContext(activity)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: tokens.radius.sm, backgroundColor: 'var(--muted)', padding: '2px 8px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b' }}>
            {new Date(activity.timestamp).toLocaleDateString()}
          </span>
        </Box>
      </Box>
      {activity.amount != null ? <ActivityAmount amount={activity.amount} formatAmount={formatAmount} /> : null}
    </Link>
  );
}

function ActivityGroup({ group, formatAmount }: { group: { bucket: ActivityBucket; list: DashboardRecentActivity[] }; formatAmount: (value: number) => string }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>
        {group.bucket}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {group.list.map(activity => (
          <ActivityItem key={activity.id} activity={activity} formatAmount={formatAmount} />
        ))}
      </Box>
    </Box>
  );
}

export function RecentActivity({
  activities,
  formatAmount,
  title: _title,
  emptyLabel,
}: RecentActivityProps): React.JSX.Element {
  const groups = groupActivities(activities);

  return (
    <Card style={{ border: 'none', boxShadow: 'none', borderRadius: tokens.radius.lg, backgroundColor: 'var(--card-bg)', height: '100%', position: 'relative', overflow: 'hidden', textAlign: 'left', transition: 'all 300ms' }}>
      <CardContent style={{ height: '100%', padding: '32px', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        {activities.length === 0 ? (
          <Box sx={{ display: 'flex', height: 128, alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 14, color: 'var(--ff-dash-muted)' }}>{emptyLabel}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pr: 3, textAlign: 'left' }}>
            {groups.map(group => (
              <ActivityGroup key={group.bucket} group={group} formatAmount={formatAmount} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
