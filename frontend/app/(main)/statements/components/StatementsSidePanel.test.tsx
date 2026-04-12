// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  user: null as null | { id: string },
}));
const workspaceState = vi.hoisted(() => ({
  currentWorkspace: { id: 'workspace-1' } as null | { id: string },
}));
const capturedConfigRef = vi.hoisted(() => ({
  current: null as null | {
    sections?: Array<{
      items?: Array<{
        id?: string;
        icon?: React.ReactNode;
        badge?: number;
      }>;
    }>;
    footer?: {
      content?: React.ReactElement<{
        onScan: () => void;
        onLocalUpload: () => void;
      }>;
    };
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({}),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock('@/app/components/side-panel', () => ({
  useSidePanelConfig: ({ config }: { config: unknown }) => {
    capturedConfigRef.current = config as {
      footer?: {
        content?: React.ReactElement<{
          onScan: () => void;
          onLocalUpload: () => void;
        }>;
      };
    };
  },
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/app/lib/payables-api', () => ({
  payablesApi: {
    getSummary: vi.fn(),
  },
}));

describe('StatementsSidePanel FAB navigation', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    pushMock.mockReset();
    capturedConfigRef.current = null;
    authState.user = null;
    workspaceState.currentWorkspace = { id: 'workspace-1' };
  });

  it('redirects to submit with scan drawer query from non-submit pages', async () => {
    const { default: StatementsSidePanel } = await import('./StatementsSidePanel');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="top-spenders" />);
    });

    const onScan = capturedConfigRef.current?.footer?.content?.props.onScan;
    expect(onScan).toBeTypeOf('function');

    await act(async () => {
      onScan?.();
    });

    expect(pushMock).toHaveBeenCalledWith('/statements/submit?openExpenseDrawer=scan');

    await act(async () => {
      root.unmount();
    });
  });

  it('uses Ban icon for unapproved cash navigation item', async () => {
    const [{ default: StatementsSidePanel }, { Ban }] = await Promise.all([
      import('./StatementsSidePanel'),
      import('lucide-react'),
    ]);
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="unapproved-cash" />);
    });

    const unapprovedCashItem = capturedConfigRef.current?.sections
      ?.flatMap(section => section.items ?? [])
      .find(item => item.id === 'unapproved-cash');

    expect(React.isValidElement(unapprovedCashItem?.icon)).toBe(true);
    expect((unapprovedCashItem?.icon as React.ReactElement).type).toBe(Ban);

    await act(async () => {
      root.unmount();
    });
  });

  it('uses payables summary counts for the pay badge', async () => {
    const { default: apiClient } = await import('@/app/lib/api');
    const { payablesApi } = await import('@/app/lib/payables-api');
    const { default: StatementsSidePanel } = await import('./StatementsSidePanel');
    authState.user = { id: 'user-1' };

    vi.mocked(payablesApi.getSummary).mockResolvedValue({
      toPay: 1200,
      overdue: 300,
      dueThisWeek: 450,
      paidThisMonth: 900,
      toPayCount: 2,
      overdueCount: 3,
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/statements') {
        return Promise.resolve({ data: { data: [], total: 0 } });
      }

      if (url === '/transactions') {
        return Promise.resolve({ data: { data: [], total: 0 } });
      }

      if (url === '/reports/top-categories') {
        return Promise.resolve({ data: { categories: [] } });
      }

      if (
        url === '/integrations/dropbox/status' ||
        url === '/integrations/google-drive/status' ||
        url === '/integrations/gmail/status'
      ) {
        return Promise.resolve({ data: { connected: false } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="pay" />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const payItem = capturedConfigRef.current?.sections
      ?.flatMap(section => section.items ?? [])
      .find(item => item.id === 'pay');

    expect(payItem?.badge).toBe(5);

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps pay badge from payables summary when statement flow fails', async () => {
    const { default: apiClient } = await import('@/app/lib/api');
    const { payablesApi } = await import('@/app/lib/payables-api');
    const { default: StatementsSidePanel } = await import('./StatementsSidePanel');
    authState.user = { id: 'user-1' };

    vi.mocked(payablesApi.getSummary).mockResolvedValue({
      toPay: 400,
      overdue: 100,
      dueThisWeek: 200,
      paidThisMonth: 50,
      toPayCount: 4,
      overdueCount: 1,
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/statements') {
        return Promise.reject(new Error('statements failed'));
      }

      if (
        url === '/integrations/dropbox/status' ||
        url === '/integrations/google-drive/status' ||
        url === '/integrations/gmail/status'
      ) {
        return Promise.resolve({ data: { connected: false } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="pay" />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const payItem = capturedConfigRef.current?.sections
      ?.flatMap(section => section.items ?? [])
      .find(item => item.id === 'pay');
    const submitItem = capturedConfigRef.current?.sections
      ?.flatMap(section => section.items ?? [])
      .find(item => item.id === 'submit');

    expect(payItem?.badge).toBe(5);
    expect(submitItem?.badge).toBe(0);

    await act(async () => {
      root.unmount();
    });
  });

  it('shows tables reports navigation item with custom tables count', async () => {
    const { default: apiClient } = await import('@/app/lib/api');
    const { payablesApi } = await import('@/app/lib/payables-api');
    const { default: StatementsSidePanel } = await import('./StatementsSidePanel');
    authState.user = { id: 'user-1' };

    vi.mocked(payablesApi.getSummary).mockResolvedValue({
      toPay: 0,
      overdue: 0,
      dueThisWeek: 0,
      paidThisMonth: 0,
      toPayCount: 0,
      overdueCount: 0,
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/statements') {
        return Promise.resolve({ data: { data: [], total: 0 } });
      }

      if (url === '/transactions') {
        return Promise.resolve({ data: { data: [], total: 0 } });
      }

      if (url === '/reports/top-categories') {
        return Promise.resolve({ data: { categories: [] } });
      }

      if (url === '/custom-tables') {
        return Promise.resolve({
          data: [
            { id: 'table-1', name: 'Ops', source: 'manual' },
            { id: 'table-2', name: 'GS', source: 'google_sheets_import' },
          ],
        });
      }

      if (
        url === '/integrations/dropbox/status' ||
        url === '/integrations/google-drive/status' ||
        url === '/integrations/gmail/status'
      ) {
        return Promise.resolve({ data: { connected: false } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="top-merchants" />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const tablesReportsItem = capturedConfigRef.current?.sections
      ?.flatMap(section => section.items ?? [])
      .find(item => item.id === 'tables-reports');

    expect(tablesReportsItem).toBeDefined();
    expect(tablesReportsItem?.badge).toBe(2);

    await act(async () => {
      root.unmount();
    });
  });
});
