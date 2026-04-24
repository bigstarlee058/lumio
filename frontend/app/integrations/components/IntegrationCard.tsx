'use client';

import { Box, Typography } from '@mui/material';
import { CheckCircle2, ExternalLink, Star } from '@/app/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

export interface IntegrationAction {
  label: React.ReactNode;
  href: string;
  primary?: boolean;
  external?: boolean;
}

export interface IntegrationItem {
  key: string;
  name: string;
  description: React.ReactNode;
  badge: React.ReactNode;
  category: string;
  recommended: boolean;
  icon: React.ReactNode;
  active: boolean;
  primaryAction?: IntegrationAction;
  actions: IntegrationAction[];
}

const externalLinkStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 'var(--lumio-radius-md)', color: '#374151', textDecoration: 'none' };

function ExternalActionLink({ action }: { action: IntegrationAction }): React.JSX.Element {
  return (
    <a href={action.href} target="_blank" rel="noreferrer" onClick={(e): void => e.stopPropagation()} style={externalLinkStyle}>
      {action.label}
      <ExternalLink style={{ height: 12, width: 12, marginLeft: 4, color: '#9ca3af' }} />
    </a>
  );
}

function DisabledPrimaryButton({ action }: { action: IntegrationAction }): React.JSX.Element {
  return (
    <button type="button" disabled style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 'var(--lumio-radius-md)', color: '#9ca3af', cursor: 'not-allowed', background: 'transparent' }} onClick={(e): void => e.stopPropagation()}>
      {action.label}
    </button>
  );
}

function PrimaryLink({ action }: { action: IntegrationAction }): React.JSX.Element {
  return (
    <Link href={action.href} onClick={(e): void => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 16px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--lumio-radius-md)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none' }}>
      {action.label}
    </Link>
  );
}

function SecondaryLink({ action }: { action: IntegrationAction }): React.JSX.Element {
  return (
    <Link href={action.href} onClick={(e): void => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 'var(--lumio-radius-md)', color: '#374151', textDecoration: 'none' }}>
      {action.label}
    </Link>
  );
}

function ActionButton({ action, active }: { action: IntegrationAction; active: boolean }): React.JSX.Element {
  if (action.external) return <ExternalActionLink action={action} />;
  if (action.primary && active) return <DisabledPrimaryButton action={action} />;
  if (action.primary) return <PrimaryLink action={action} />;
  return <SecondaryLink action={action} />;
}

function IntegrationBadge({ recommended, badge }: { recommended: boolean; badge: React.ReactNode }): React.JSX.Element {
  if (recommended) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600, px: 1, py: 0.25, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 'var(--lumio-radius-sm)' }}>
        <Star style={{ height: 12, width: 12, marginRight: 4 }} />{badge}
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600, px: 1, py: 0.25, bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--lumio-radius-sm)' }}>
      <CheckCircle2 style={{ height: 12, width: 12, marginRight: 4 }} /> {badge}
    </Box>
  );
}

interface IntegrationCardProps {
  item: IntegrationItem;
  onCardClick: (item: IntegrationItem) => void;
}

function IntegrationCardBody({ item }: { item: IntegrationItem }): React.JSX.Element {
  return (
    <Box sx={{ flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{item.name}</Typography>
        <IntegrationBadge recommended={item.recommended} badge={item.badge} />
      </Box>
      <Typography style={{ fontSize: 14, color: '#4b5563', marginTop: 4 }}>{item.description}</Typography>
      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {item.actions.map(action => <ActionButton key={action.href} action={action} active={item.active} />)}
      </Box>
    </Box>
  );
}

function isItemClickable(item: IntegrationItem): boolean {
  return Boolean(item.primaryAction?.href && !item.primaryAction.external);
}

function makeCardSx(clickable: boolean): object {
  return { border: '1px solid #e5e7eb', borderRadius: 'var(--lumio-radius-lg)', p: 2, bgcolor: 'background.paper', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: clickable ? 'pointer' : 'default', '&:hover': { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }, '&:focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: 2 } };
}

export function IntegrationCard({ item, onCardClick }: IntegrationCardProps): React.JSX.Element {
  const clickable = isItemClickable(item);
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onCardClick(item);
  };
  return (
    <Box
      data-integration-card={item.key}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      sx={makeCardSx(clickable)}
      onClick={(): void => onCardClick(item)}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ p: 1, borderRadius: 'var(--lumio-radius-sm)', bgcolor: '#f9fafb', border: '1px solid #f3f4f6', display: 'flex' }}>{item.icon}</Box>
        <IntegrationCardBody item={item} />
      </Box>
    </Box>
  );
}

export function CategoryDivider({ label }: { label: React.ReactNode }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ height: '1px', flex: 1, bgcolor: '#e5e7eb' }} />
      <Box component="span" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', px: 1.5, py: 0.5, border: '1px solid #e5e7eb', borderRadius: 'var(--lumio-radius-sm)', bgcolor: 'background.paper' }}>{label}</Box>
      <Box sx={{ height: '1px', flex: 1, bgcolor: '#e5e7eb' }} />
    </Box>
  );
}

export function IntegrationIcon({ src, alt }: { src: string; alt: string }): React.JSX.Element {
  return <Image src={src} alt={alt} width={32} height={32} style={{ borderRadius: 'var(--lumio-radius-md)' }} />;
}
