'use client';

import { Tab, Tabs } from '@mui/material';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';

type DashboardTabsProps = { activeTab: DashboardTabId; onTabChange: (tab: DashboardTabId) => void };

const TAB_SX = {
  fontSize: '13px',
  letterSpacing: '1px',
  fontWeight: 600,
  fontFamily: 'var(--font-dashboard-mono)',
  textTransform: 'uppercase' as const,
  color: 'var(--muted-foreground)',
  minWidth: 'auto',
  padding: '0 0 16px 0',
  '&.Mui-selected': { color: 'var(--foreground)' },
};
const TABS_SX = {
  minHeight: '48px',
  '& .MuiTabs-indicator': { backgroundColor: 'var(--primary)', height: '2px' },
  '& .MuiTabs-flexContainer': { gap: '40px' },
  '& .MuiTab-root:hover': { backgroundColor: 'transparent !important', color: 'var(--foreground)' },
};

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps): React.JSX.Element {
  // eslint-disable-next-line max-params
  const handleChange = (_: React.SyntheticEvent, value: DashboardTabId): void => onTabChange(value);
  return (
    <Tabs value={activeTab} onChange={handleChange} sx={TABS_SX}>
      <Tab value="overview" label="Overview" disableRipple sx={TAB_SX} />
      <Tab value="trends" label="Trends" disableRipple sx={TAB_SX} />
      <Tab value="data-health" label="Data Health" disableRipple sx={TAB_SX} />
    </Tabs>
  );
}
