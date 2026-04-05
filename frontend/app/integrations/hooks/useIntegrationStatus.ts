'use client';

import apiClient from '@/app/lib/api';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { IntegrationStatus, IntegrationStatusMessages } from '../types';

export type UseIntegrationStatusConfig = {
  /** The API route segment, e.g. 'gmail', 'dropbox', 'google-drive' */
  apiPath: string;
  /** User object — status is loaded only when truthy (checked for truthiness only) */
  user: object | null | undefined;
  messages: IntegrationStatusMessages;
};

export type UseIntegrationStatusResult = {
  status: IntegrationStatus | null;
  loading: boolean;
  saving: boolean;
  syncing: boolean;
  loadStatus: () => Promise<void>;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleSync: () => Promise<void>;
};

export function useIntegrationStatus({
  apiPath,
  user,
  messages,
}: UseIntegrationStatusConfig): UseIntegrationStatusResult {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const base = `/integrations/${apiPath}`;

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${base}/status`);
      setStatus(response.data);
    } catch {
      toast.error(messages.errors.loadStatus);
    } finally {
      setLoading(false);
    }
  }, [base, messages.errors.loadStatus]);

  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user, loadStatus]);

  useEffect(() => {
    const successParam = messages.successCallbackParam ?? 'connected';
    const statusParam = searchParams.get('status');
    if (statusParam === successParam || statusParam === 'success') {
      toast.success(messages.toasts.connected);
    }
    if (statusParam === 'error') {
      if (messages.onCallbackError) {
        const reason = searchParams.get('reason') ?? undefined;
        messages.onCallbackError(reason);
      } else {
        toast.error(messages.errors.connectFailed);
      }
    }
  }, [searchParams, messages]);

  const handleConnect = useCallback(async () => {
    try {
      toast.success(messages.toasts.connecting);
      const response = await apiClient.get(`${base}/connect`);
      const url = response.data?.url as string | undefined;
      if (!url) {
        toast.error(messages.errors.connectFailed);
        return;
      }
      window.location.href = url;
    } catch {
      toast.error(messages.errors.connectFailed);
    }
  }, [base, messages]);

  const handleDisconnect = useCallback(async () => {
    try {
      setSaving(true);
      await apiClient.post(`${base}/disconnect`);
      toast.success(messages.toasts.disconnected);
      await loadStatus();
    } catch {
      toast.error(messages.errors.disconnectFailed);
    } finally {
      setSaving(false);
    }
  }, [base, messages, loadStatus]);

  const handleSync = useCallback(async () => {
    try {
      setSyncing(true);
      await apiClient.post(`${base}/sync`);
      toast.success(messages.toasts.syncStarted);
      await loadStatus();
    } catch {
      toast.error(messages.errors.syncFailed);
    } finally {
      setSyncing(false);
    }
  }, [base, messages, loadStatus]);

  return {
    status,
    loading,
    saving,
    syncing,
    loadStatus,
    handleConnect,
    handleDisconnect,
    handleSync,
  };
}
