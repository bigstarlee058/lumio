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
  /**
   * When provided, the hook skips its own error toast on `?status=error` and
   * calls this callback instead, allowing the page to show a custom error message.
   */
  onCallbackError?: (reason?: string) => void;
};
