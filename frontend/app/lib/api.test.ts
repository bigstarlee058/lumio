import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => {
  const apiClient = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  });

  return {
    apiClient,
    axiosPost: vi.fn(),
    responseRejected: undefined as ((error: unknown) => Promise<unknown>) | undefined,
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosMocks.apiClient),
    post: axiosMocks.axiosPost,
  },
}));

describe('apiClient auth retry handling', () => {
  const storage = new Map<string, string>();

  beforeEach(async () => {
    vi.resetModules();
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
    axiosMocks.axiosPost.mockReset();
    axiosMocks.apiClient.mockReset();
    axiosMocks.apiClient.interceptors.request.use.mockReset();
    axiosMocks.apiClient.interceptors.response.use.mockImplementation((_success, rejected) => {
      axiosMocks.responseRejected = rejected;
    });

    await import('./api');
  });

  it('does not replace login 401 errors with refresh-token failures', async () => {
    const loginError = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    };

    await expect(axiosMocks.responseRejected?.(loginError)).rejects.toBe(loginError);
    expect(axiosMocks.axiosPost).not.toHaveBeenCalled();
  });

  it('still refreshes retryable 401 errors outside auth endpoints', async () => {
    localStorage.setItem('refresh_token', 'refresh-token');
    axiosMocks.axiosPost.mockResolvedValue({ data: { access_token: 'new-access-token' } });
    axiosMocks.apiClient.mockResolvedValue({ data: 'retried' });
    const originalRequest = { url: '/dashboard', headers: {} };

    await expect(
      axiosMocks.responseRejected?.({ response: { status: 401 }, config: originalRequest }),
    ).resolves.toEqual({ data: 'retried' });

    expect(axiosMocks.axiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      { headers: { Authorization: 'Bearer refresh-token' } },
    );
    expect(localStorage.getItem('access_token')).toBe('new-access-token');
  });
});
