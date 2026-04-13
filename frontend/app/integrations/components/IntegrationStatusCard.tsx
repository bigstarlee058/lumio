'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { Box, Button, Stack, Typography } from '@mui/material';
import { CheckCircle2, Link2Off, RefreshCcw, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IntegrationStatus } from '../types';

type IntegrationStatusCardProps = {
  status: IntegrationStatus | null;
  title: ReactNode;
  statusLabel: ReactNode;
  saving: boolean;
  syncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  connectLabel: ReactNode;
  reconnectLabel: ReactNode;
  syncLabel: ReactNode;
  disconnectLabel: ReactNode;
  /** Optional hint shown below the buttons when not connected */
  disconnectedHint?: string;
  /** Optional extra actions rendered after the sync/disconnect buttons */
  extraActions?: ReactNode;
};

export function IntegrationStatusCard({
  status,
  title,
  statusLabel,
  saving,
  syncing,
  onConnect,
  onDisconnect,
  onSync,
  connectLabel,
  reconnectLabel,
  syncLabel,
  disconnectLabel,
  disconnectedHint,
  extraActions,
}: IntegrationStatusCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 0,
        border: '1px solid #e5e7eb',
        bgcolor: '#fff',
        p: 3,
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {status?.connected ? (
            <CheckCircle2 style={{ height: 24, width: 24, color: '#10b981' }} />
          ) : (
            <XCircle style={{ height: 24, width: 24, color: '#ef4444' }} />
          )}
          <Box>
            <Typography style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
              {title}
            </Typography>
            <Typography style={{ fontSize: 14, color: '#6b7280' }}>{statusLabel}</Typography>
          </Box>
        </Box>

        <Stack alignItems="flex-end" spacing={1}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {status?.connected ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onSync}
                  disabled={saving || syncing}
                  startIcon={
                    syncing ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <RefreshCcw style={{ height: 16, width: 16 }} />
                    )
                  }
                  sx={{
                    borderRadius: 0,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                  }}
                >
                  {syncLabel}
                </Button>
                {extraActions}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onDisconnect}
                  disabled={saving}
                  startIcon={
                    saving ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Link2Off style={{ height: 16, width: 16 }} />
                    )
                  }
                  sx={{
                    borderRadius: 0,
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f9fafb' },
                  }}
                >
                  {disconnectLabel}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                size="small"
                onClick={onConnect}
                disabled={saving}
                startIcon={
                  saving ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <RefreshCcw style={{ height: 16, width: 16 }} />
                  )
                }
                sx={{
                  borderRadius: 0,
                  fontWeight: 600,
                  fontSize: 14,
                  textTransform: 'none',
                }}
              >
                {status?.status === 'needs_reauth' ? reconnectLabel : connectLabel}
              </Button>
            )}
          </Box>

          {!status?.connected && disconnectedHint && (
            <Typography
              style={{ fontSize: 12, color: '#6b7280', maxWidth: 280, textAlign: 'right' }}
            >
              {disconnectedHint}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
