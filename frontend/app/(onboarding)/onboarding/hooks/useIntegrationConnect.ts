import { useCallback, useState } from 'react';
import apiClient from '@/app/lib/api';
import {
  ONBOARDING_INTEGRATIONS,
  pollForIntegrationConnection,
  type OnboardingIntegrationKey,
} from './useOnboardingActions';

type UseIntegrationConnectParams = {
  refreshIntegrationStatuses: () => Promise<void>;
  onError: (msg: string) => void;
};

type UseIntegrationConnectResult = {
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
  handleConnectIntegration: (integrationKey: string) => Promise<void>;
};

const EMPTY_LOADING: Record<OnboardingIntegrationKey, boolean> = {
  dropbox: false,
  googleDrive: false,
  gmail: false,
  googleSheets: false,
  telegram: false,
};

export function useIntegrationConnect({
  refreshIntegrationStatuses,
  onError,
}: UseIntegrationConnectParams): UseIntegrationConnectResult {
  const [integrationLoading, setIntegrationLoading] =
    useState<Record<OnboardingIntegrationKey, boolean>>(EMPTY_LOADING);

  const handleConnectIntegration = useCallback(async (integrationKey: string): Promise<void> => {
    const integration = ONBOARDING_INTEGRATIONS.find(item => item.key === integrationKey);
    if (!integration) return;

    if (integration.connectMode === 'page') {
      window.open(integration.path, '_blank', 'noopener,noreferrer');
      return;
    }

    setIntegrationLoading(prev => ({ ...prev, [integration.key]: true }));
    try {
      const response = await apiClient.get(`/integrations/${integration.apiKey}/connect`);
      const url = response.data?.url;
      if (!url) throw new Error('Missing OAuth URL');

      const popup = window.open(url, `onboarding-${integration.apiKey}`, 'width=1100,height=760');
      if (!popup) {
        window.location.href = url;
        return;
      }

      await pollForIntegrationConnection({
        popup,
        integration,
        onConnected: refreshIntegrationStatuses,
      });
    } catch {
      onError('Failed to connect integration.');
    } finally {
      setIntegrationLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  }, [refreshIntegrationStatuses, onError]);

  return { integrationLoading, handleConnectIntegration };
}
