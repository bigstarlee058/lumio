import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuthButton } from './GoogleAuthButton';

const googleMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  renderButton: vi.fn(),
}));

vi.mock('@/app/i18n', () => ({
  useLocale: () => ({ locale: 'ru' }),
}));

vi.mock('next/script', () => ({
  default: () => null,
}));

describe('GoogleAuthButton', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'google-client-id');
    googleMocks.initialize.mockReset();
    googleMocks.renderButton.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: googleMocks.initialize,
          renderButton: googleMocks.renderButton,
        },
      },
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
  });

  it('renders the Google button using the active app locale', async () => {
    await act(async () => {
      root.render(
        <GoogleAuthButton onError={vi.fn()} errorFallback="Google sign-in failed" />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(googleMocks.renderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ locale: 'ru' }),
    );
  });
});
