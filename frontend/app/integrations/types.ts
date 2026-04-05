export type IntegrationConnectionStatus = 'connected' | 'disconnected' | 'needs_reauth';

export type IntegrationStatus = {
  connected: boolean;
  status: IntegrationConnectionStatus;
  settings?: Record<string, unknown> | null;
};

export type IntegrationStatusMessages = {
  errors: {
    loadStatus: string;
    connectFailed: string;
    disconnectFailed: string;
    syncFailed: string;
  };
  toasts: {
    connected: string;
    connecting: string;
    disconnected: string;
    syncStarted: string;
  };
  /** The query param value that signals a successful OAuth callback (defaults to 'connected') */
  successCallbackParam?: string;
};
