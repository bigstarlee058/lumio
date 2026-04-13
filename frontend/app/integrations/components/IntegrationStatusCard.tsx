'use client';

import { Spinner } from '@/app/components/ui/spinner';
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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{statusLabel}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            {status?.connected ? (
              <>
                <button
                  type="button"
                  onClick={onSync}
                  disabled={saving || syncing}
                  className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  {syncing ? <Spinner className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                  {syncLabel}
                </button>
                {extraActions}
                <button
                  type="button"
                  onClick={onDisconnect}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {saving ? <Spinner className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                  {disconnectLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                {status?.status === 'needs_reauth' ? reconnectLabel : connectLabel}
              </button>
            )}
          </div>

          {!status?.connected && disconnectedHint && (
            <p className="text-xs text-gray-500 max-w-xs text-right mt-1">{disconnectedHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
