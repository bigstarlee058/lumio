'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { formatDateTime } from '@/app/lib/format-datetime';
import type { StorageStatus, StorageWidgetProvider } from '@/app/lib/storage-widget-types';
import { RefreshCcw, Settings, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

type BaseStorageWidgetProps = {
  provider: StorageWidgetProvider;
  locale?: string;
};

export function BaseStorageWidget({ provider, locale }: BaseStorageWidgetProps) {
  const t = useIntlayer('storagePage');
  const pt = provider.getTranslations(t);

  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/integrations/${provider.apiPath}/status`);
      setStatus(response.data);
    } catch (error) {
      toast.error(
        pt?.errors?.loadStatus?.value || `Failed to load ${provider.providerName} status`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const response = await apiClient.get(`/integrations/${provider.apiPath}/connect`);
      const url = response.data?.url;
      if (!url) {
        toast.error(
          pt?.errors?.connectFailed?.value || `Failed to connect to ${provider.providerName}`,
        );
        return;
      }
      window.location.href = url;
    } catch (error) {
      toast.error(
        pt?.errors?.connectFailed?.value || `Failed to connect to ${provider.providerName}`,
      );
    }
  };

  const handleSyncNow = async () => {
    try {
      setWorking(true);
      await apiClient.post(`/integrations/${provider.apiPath}/sync`);
      toast.success(pt?.toasts?.syncStarted?.value || 'Sync started');
      await loadStatus();
    } catch (error) {
      toast.error(pt?.errors?.syncFailed?.value || 'Sync failed');
    } finally {
      setWorking(false);
    }
  };

  const handleImport = async () => {
    if (!provider.isPickerAvailable()) {
      toast.error(
        pt?.errors?.pickerUnavailable?.value || `${provider.providerName} picker unavailable`,
      );
      return;
    }
    try {
      setWorking(true);
      const docs = await provider.openPicker(MIME_TYPES);
      if (!docs.length) return;
      const fileIds = docs.map(doc => doc.id);
      const importResp = await apiClient.post(`/integrations/${provider.apiPath}/import`, {
        fileIds,
      });
      const results: Array<{ status?: 'ok' | 'error'; fileId?: string }> = Array.isArray(
        importResp.data?.results,
      )
        ? importResp.data.results
        : [];
      const successCount = results.filter(item => item.status === 'ok').length;
      const failed = results.filter(item => item.status === 'error');
      if (successCount > 0) {
        toast.success(
          pt?.toasts?.imported?.value?.replace('{count}', String(successCount)) ||
            `${successCount} files imported`,
        );
      }
      if (failed.length > 0) {
        const names = docs
          .filter(doc => failed.some(failure => failure.fileId === doc.id))
          .map(doc => provider.getDocName(doc))
          .filter(Boolean)
          .join(', ');
        toast.error(
          pt?.errors?.importFailed?.value?.replace('{files}', names || provider.providerName) ||
            `Failed to import ${names || 'files'}`,
        );
      }
      await loadStatus();
    } catch (error) {
      toast.error(
        pt?.errors?.importFailed?.value?.replace('{files}', provider.providerName) ||
          'Import failed',
      );
    } finally {
      setWorking(false);
    }
  };

  const statusLabel =
    status?.status === 'needs_reauth'
      ? pt?.status?.needsReauth?.value || pt?.status?.needsReauth || 'Needs re-authentication'
      : status?.connected
        ? pt?.status?.connected?.value || pt?.status?.connected || 'Connected'
        : pt?.status?.disconnected?.value || pt?.status?.disconnected || 'Disconnected';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Image src={provider.logoSrc} alt={provider.logoAlt} width={20} height={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {pt?.title?.value || pt?.title || `${provider.providerName} Sync`}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">{statusLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {loading
                ? pt?.loading?.value || pt?.loading || 'Loading...'
                : (pt?.lastSync?.value || 'Last sync: {time}').replace(
                    '{time}',
                    formatDateTime(status?.settings?.lastSyncAt, locale) || '—',
                  )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={handleImport}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                <UploadCloud className="h-4 w-4" />
                {pt?.actions?.import?.value || pt?.actions?.import || 'Import'}
              </button>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                {pt?.actions?.syncNow?.value || pt?.actions?.syncNow || 'Sync Now'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={working}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              {pt?.actions?.connect?.value || pt?.actions?.connect || 'Connect'}
            </button>
          )}
          <Link
            href={provider.settingsHref}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            {pt?.actions?.settings?.value || pt?.actions?.settings || 'Settings'}
          </Link>
        </div>
      </div>
    </div>
  );
}
