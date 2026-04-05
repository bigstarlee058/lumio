'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getChooserDocName, pickDropboxFolder } from '@/app/lib/dropboxChooser';
import { formatDateTime } from '@/app/lib/format-datetime';
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
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-gray-800 font-semibold mb-2">
            {t.status?.disconnected?.value || 'Disconnected'}
          </p>
          <p className="text-sm text-gray-600">
            {t.header?.subtitle || 'Connect Dropbox to sync your statements'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={24} height={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t.header?.title || 'Dropbox Integration'}
          </h1>
          <p className="text-secondary mt-1">
            {t.header?.subtitle || 'Connect Dropbox to sync your statements'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Spinner className="h-4 w-4" />
          {t.loading}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
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
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t.settings?.title || 'Settings'}
                </h2>
                <button
                  type="button"
                  onClick={handlePickFolder}
                  disabled={!status?.connected || saving}
                  className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  {t.actions?.pickFolder || 'Pick Folder'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t.settings?.folder || 'Folder'}</p>
                  <p className="font-medium text-gray-900">
                    {status?.settings?.folderName ||
                      status?.settings?.folderId ||
                      t.settings?.folderPlaceholder ||
                      'No folder selected'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t.settings?.lastSync || 'Last Sync'}</p>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(status?.settings?.lastSyncAt, user?.locale) || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    {t.settings?.syncEnabled || 'Sync Enabled'}
                  </p>
                  <div className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={status?.settings?.syncEnabled ?? true}
                      onCheckedChange={checked => updateSettings({ syncEnabled: checked })}
                      disabled={!status?.connected || saving}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      {status?.settings?.syncEnabled
                        ? t.status?.connected || 'Enabled'
                        : t.status?.disconnected || 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">{t.settings?.syncTime || 'Sync Time'}</p>
                  <input
                    type="time"
                    value={status?.settings?.syncTime || '03:00'}
                    onChange={e => updateSettings({ syncTime: e.target.value })}
                    disabled={!status?.connected || saving}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t.settings?.timeZone || 'Time Zone'}</p>
                  <p className="font-medium text-gray-900">{status?.settings?.timeZone || 'UTC'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {status?.connected && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-primary mt-1" />
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  {t.settings?.syncEnabled ||
                    'Enable automatic sync to upload new statements to Dropbox'}
                </p>
                <p>
                  {t.settings?.folderPlaceholder || 'Pick a folder to organize your synced files'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
