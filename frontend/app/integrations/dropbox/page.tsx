'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getChooserDocName, pickDropboxFolder } from '@/app/lib/dropboxChooser';
import { formatDateTime } from '@/app/lib/format-datetime';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { IntegrationStatusCard } from '../components/IntegrationStatusCard';
import { useIntegrationStatus } from '../hooks/useIntegrationStatus';

type DropboxSettings = {
  folderId?: string | null;
  folderName?: string | null;
  syncEnabled?: boolean;
  syncTime?: string;
  timeZone?: string | null;
  lastSyncAt?: string | null;
};

type DropboxStatus = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  settings?: DropboxSettings | null;
};

export default function DropboxIntegrationPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('dropboxIntegrationPage');
  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

  const messages = useMemo(
    () => ({
      errors: {
        loadStatus: t.errors?.loadStatus?.value || 'Failed to load Dropbox status',
        connectFailed: t.errors?.connectFailed?.value || 'Failed to connect to Dropbox',
        disconnectFailed: t.errors?.disconnectFailed?.value || 'Failed to disconnect',
        syncFailed: 'Sync failed',
      },
      toasts: {
        connected: t.toasts?.connected?.value || 'Connected to Dropbox!',
        connecting: t.toasts?.connecting?.value || 'Connecting to Dropbox...',
        disconnected: t.toasts?.disconnected?.value || 'Disconnected from Dropbox',
        syncStarted: t.toasts?.syncStarted?.value || 'Sync started',
      },
    }),
    [t],
  );

  const {
    status: baseStatus,
    loading,
    saving,
    syncing,
    loadStatus,
    handleConnect,
    handleDisconnect,
    handleSync,
  } = useIntegrationStatus({
    apiPath: 'dropbox',
    user,
    messages,
  });

  const status = baseStatus as DropboxStatus | null;

  const updateSettings = async (payload: Partial<DropboxSettings>) => {
    try {
      await apiClient.post('/integrations/dropbox/settings', payload);
      toast.success(t.toasts?.settingsSaved?.value || 'Settings saved');
      await loadStatus();
    } catch {
      toast.error(t.errors?.connectFailed?.value || 'Failed to save settings');
    }
  };

  const handlePickFolder = async () => {
    if (!appKey) {
      toast.error(t.errors?.pickerUnavailable?.value || 'Dropbox Chooser is not available');
      return;
    }
    try {
      const folder = await pickDropboxFolder({ appKey });
      if (!folder) return;
      await updateSettings({
        folderId: folder.id,
        folderName: getChooserDocName(folder),
      });
    } catch {
      toast.error(t.errors?.pickerUnavailable?.value || 'Failed to pick folder');
    }
  };

  const statusLabel = useMemo(() => {
    if (!status) return '';
    if (status.status === 'needs_reauth')
      return t.status?.needsReauth?.value || 'Needs re-authentication';
    if (status.connected) return t.status?.connected?.value || 'Connected';
    return t.status?.disconnected?.value || 'Disconnected';
  }, [status, t]);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '60vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}
      >
        <Spinner size={24} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 768, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box
          sx={{
            borderRadius: 0,
            border: '1px solid #e5e7eb',
            bgcolor: 'background.paper',
            p: 3,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}
        >
          <Typography style={{ color: '#1f2937', fontWeight: 600, marginBottom: 8 }}>
            {t.status?.disconnected?.value || 'Disconnected'}
          </Typography>
          <Typography style={{ fontSize: 14, color: '#4b5563' }}>
            {t.header?.subtitle || 'Connect Dropbox to sync your statements'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: '#fff',
            opacity: 0.1,
            display: 'flex',
          }}
        >
          <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={24} height={24} />
        </Box>
        <Box>
          <Typography variant="h4" style={{ fontWeight: 700, color: '#111827' }}>
            {t.header?.title || 'Dropbox Integration'}
          </Typography>
          <Typography style={{ color: '#6b7280', marginTop: 4 }}>
            {t.header?.subtitle || 'Connect Dropbox to sync your statements'}
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography style={{ fontSize: 14, color: '#6b7280' }}>{t.loading}</Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <IntegrationStatusCard
            status={status}
            title={t.header?.title || 'Dropbox'}
            statusLabel={statusLabel}
            saving={saving}
            syncing={syncing}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            connectLabel={t.actions?.connect || 'Connect'}
            reconnectLabel={t.actions?.reconnect || 'Reconnect'}
            syncLabel={t.actions?.syncNow || 'Sync Now'}
            disconnectLabel={t.actions?.disconnect || 'Disconnect'}
            disconnectedHint="We'll create a folder in your Dropbox and sync files daily."
          />

          {status?.connected && (
            <Box
              sx={{
                borderRadius: 0,
                border: '1px solid #e5e7eb',
                bgcolor: 'background.paper',
                p: 3,
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
              >
                <Typography style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                  {t.settings?.title || 'Settings'}
                </Typography>
                <button
                  type="button"
                  onClick={handlePickFolder}
                  disabled={!status?.connected || saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid var(--color-primary)',
                    borderRadius: 0,
                    padding: '6px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t.actions?.pickFolder || 'Pick Folder'}
                </button>
              </Box>

              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                <Stack spacing={0.5}>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                    {t.settings?.folder || 'Folder'}
                  </Typography>
                  <Typography style={{ fontWeight: 500, color: '#111827' }}>
                    {status?.settings?.folderName ||
                      status?.settings?.folderId ||
                      t.settings?.folderPlaceholder ||
                      'No folder selected'}
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                    {t.settings?.lastSync || 'Last Sync'}
                  </Typography>
                  <Typography style={{ fontWeight: 500, color: '#111827' }}>
                    {formatDateTime(status?.settings?.lastSyncAt, user?.locale) || '—'}
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                    {t.settings?.syncEnabled || 'Sync Enabled'}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      checked={status?.settings?.syncEnabled ?? true}
                      onCheckedChange={checked => updateSettings({ syncEnabled: checked })}
                      disabled={!status?.connected || saving}
                    />
                    <Typography style={{ fontSize: 14, color: '#374151' }}>
                      {status?.settings?.syncEnabled
                        ? t.status?.connected || 'Enabled'
                        : t.status?.disconnected || 'Disabled'}
                    </Typography>
                  </Box>
                </Stack>
                <Stack spacing={1}>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                    {t.settings?.syncTime || 'Sync Time'}
                  </Typography>
                  <input
                    type="time"
                    value={status?.settings?.syncTime || '03:00'}
                    onChange={e => updateSettings({ syncTime: e.target.value })}
                    disabled={!status?.connected || saving}
                    style={{
                      width: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: 0,
                      padding: '8px 12px',
                      fontSize: 14,
                      color: '#111827',
                    }}
                  />
                </Stack>
                <Stack spacing={0.5}>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                    {t.settings?.timeZone || 'Time Zone'}
                  </Typography>
                  <Typography style={{ fontWeight: 500, color: '#111827' }}>
                    {status?.settings?.timeZone || 'UTC'}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          )}
        </Stack>

        {status?.connected && (
          <Box
            sx={{
              borderRadius: 0,
              border: '1px solid #e5e7eb',
              bgcolor: 'background.paper',
              p: 3,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              height: 'fit-content',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <AlertCircle style={{ height: 20, width: 20, color: 'var(--color-primary)', marginTop: 4 }} />
              <Stack spacing={1}>
                <Typography style={{ fontSize: 14, color: '#4b5563' }}>
                  {t.settings?.syncEnabled ||
                    'Enable automatic sync to upload new statements to Dropbox'}
                </Typography>
                <Typography style={{ fontSize: 14, color: '#4b5563' }}>
                  {t.settings?.folderPlaceholder || 'Pick a folder to organize your synced files'}
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
