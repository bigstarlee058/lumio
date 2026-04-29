// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIntegrationConnect } from './useIntegrationConnect';

describe('useIntegrationConnect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens integration settings pages instead of external auth windows', async () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    const refreshIntegrationStatuses = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useIntegrationConnect({
        refreshIntegrationStatuses,
      }),
    );

    await act(async () => {
      await result.current.handleConnectIntegration('s3Compatible');
      await result.current.handleConnectIntegration('webdav');
      await result.current.handleConnectIntegration('imap');
      await result.current.handleConnectIntegration('smtp');
      await result.current.handleConnectIntegration('aiCompatible');
      await result.current.handleConnectIntegration('telegram');
      await result.current.handleConnectIntegration('appUrl');
    });

    expect(openMock.mock.calls).toEqual([
      ['/integrations/s3-compatible', '_blank', 'noopener,noreferrer'],
      ['/integrations/webdav', '_blank', 'noopener,noreferrer'],
      ['/integrations/imap', '_blank', 'noopener,noreferrer'],
      ['/integrations/smtp', '_blank', 'noopener,noreferrer'],
      ['/integrations/ai-compatible', '_blank', 'noopener,noreferrer'],
      ['/settings/telegram', '_blank', 'noopener,noreferrer'],
      ['/integrations/app-url', '_blank', 'noopener,noreferrer'],
    ]);
    expect(refreshIntegrationStatuses).toHaveBeenCalledTimes(7);
  });
});
