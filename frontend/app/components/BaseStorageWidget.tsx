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
    <div style={{ border: '1px solid #e5e7eb', background: 'var(--card-bg)', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, borderRadius: '50%', background: 'rgba(var(--lumio-primary-rgb,99,102,241),0.1)', color: 'var(--lumio-primary,#6366f1)' }}>
            <Image src={provider.logoSrc} alt={provider.logoAlt} width={20} height={20} />
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              {pt?.title?.value || pt?.title || `${provider.providerName} Sync`}
            </p>
            <p style={{ fontWeight: 600, color: '#111827' }}>{statusLabel}</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>
              {loading
                ? pt?.loading?.value || pt?.loading || 'Loading...'
                : (pt?.lastSync?.value || 'Last sync: {time}').replace(
                    '{time}',
                    formatDateTime(status?.settings?.lastSyncAt, locale) || '—',
                  )}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={handleImport}
                disabled={working}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--lumio-primary,#6366f1)', color: '#fff', border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1 }}
              >
                <UploadCloud size={16} />
                {pt?.actions?.import?.value || pt?.actions?.import || 'Import'}
              </button>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={working}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--lumio-primary,#6366f1)', border: '1px solid var(--lumio-primary,#6366f1)', padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1 }}
              >
                <RefreshCcw size={16} />
                {pt?.actions?.syncNow?.value || pt?.actions?.syncNow || 'Sync Now'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={working}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--lumio-primary,#6366f1)', color: '#fff', border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1 }}
            >
              <RefreshCcw size={16} />
              {pt?.actions?.connect?.value || pt?.actions?.connect || 'Connect'}
            </button>
          )}
          <Link
            href={provider.settingsHref}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none' }}
          >
            <Settings size={16} />
            {pt?.actions?.settings?.value || pt?.actions?.settings || 'Settings'}
          </Link>
        </div>
      </div>
    </div>
  );
}
