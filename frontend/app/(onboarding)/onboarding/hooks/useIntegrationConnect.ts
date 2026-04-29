import { useCallback, useState } from 'react';
import {
  EMPTY_INTEGRATION_STATE,
  ONBOARDING_INTEGRATIONS,
  type OnboardingIntegrationKey,
} from './useOnboardingActions';

type UseIntegrationConnectParams = {
  refreshIntegrationStatuses: () => Promise<void>;
};

type UseIntegrationConnectResult = {
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
  handleConnectIntegration: (integrationKey: string) => Promise<void>;
};

export function useIntegrationConnect({
  refreshIntegrationStatuses,
}: UseIntegrationConnectParams): UseIntegrationConnectResult {
  const [integrationLoading, setIntegrationLoading] =
    useState<Record<OnboardingIntegrationKey, boolean>>(EMPTY_INTEGRATION_STATE);

  const handleConnectIntegration = useCallback(async (integrationKey: string): Promise<void> => {
    const integration = ONBOARDING_INTEGRATIONS.find(item => item.key === integrationKey);
    if (!integration) return;

    setIntegrationLoading(prev => ({ ...prev, [integration.key]: true }));
    try {
      window.open(integration.path, '_blank', 'noopener,noreferrer');
      await refreshIntegrationStatuses();
    } finally {
      setIntegrationLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  }, [refreshIntegrationStatuses]);

  return { integrationLoading, handleConnectIntegration };
}
