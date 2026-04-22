'use client';

import React from 'react';

import { Box } from '@mui/material';

type Tab = 'details' | 'history';

interface RowDrawerTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function tabSx(active: boolean): object {
  return {
    px: 1.5,
    py: 0.5,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    bgcolor: active ? '#111827' : 'transparent',
    color: active ? '#fff' : '#4b5563',
  };
}

export function RowDrawerTabBar({ activeTab, onTabChange }: RowDrawerTabBarProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: '1px solid #e5e7eb',
        pb: 1,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onTabChange('details')}
        sx={tabSx(activeTab === 'details')}
      >
        Details
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onTabChange('history')}
        sx={tabSx(activeTab === 'history')}
      >
        History
      </Box>
    </Box>
  );
}
