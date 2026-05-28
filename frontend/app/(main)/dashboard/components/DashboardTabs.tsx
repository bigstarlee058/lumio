'use client';

import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { Tab, Tabs } from '@mui/material';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';

type DashboardTabsProps = { activeTab: DashboardTabId; onTabChange: (tab: DashboardTabId) => void };

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps): React.JSX.Element {
  // eslint-disable-next-line max-params
  const handleChange = (_: React.SyntheticEvent, value: DashboardTabId): void => onTabChange(value);
  return (
    <Tabs
      value={activeTab}
      onChange={handleChange}
      variant="scrollable"
      scrollButtons={false}
      sx={sharedMuiTabsSx}
    >
      <Tab value="finance-ops" label="Finance Ops" />
      <Tab value="overview" label="Overview" />
      <Tab value="trends" label="Trends" />
      <Tab value="data-health" label="Data Health" />
    </Tabs>
  );
}
