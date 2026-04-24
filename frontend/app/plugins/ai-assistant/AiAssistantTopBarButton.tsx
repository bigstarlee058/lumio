'use client';

import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useCallback, useState } from 'react';
import { usePluginState } from '../hooks/usePluginState';
import { AiAssistantDrawer } from './AiAssistantDrawer';

export function AiAssistantTopBarButton() {
  const { isEnabled } = usePluginState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpen = useCallback(() => setDrawerOpen(true), []);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  if (!isEnabled('ai-assistant')) return null;

  return (
    <>
      <button
        type="button"
        className="lumio-topbar__icon-btn"
        title="AI Assistant"
        onClick={handleOpen}
      >
        <SmartToyIcon sx={{ fontSize: 18 }} />
      </button>
      <AiAssistantDrawer isOpen={drawerOpen} onClose={handleClose} />
    </>
  );
}
