// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const workspaceState = vi.hoisted(() => ({
  currentWorkspaceId: 'workspace-1',
}));

vi.mock('@heroui/react', () => ({
  HeroUIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@mui/material/styles', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock('react-intlayer', () => ({
  IntlayerProviderContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/lib/theme-preference', () => ({
  DEFAULT_THEME_PREFERENCE: 'light',
  THEME_STORAGE_EVENT: 'lumio-theme-change',
  getStoredThemePreference: () => 'light',
  resolveThemePreference: (value: string) => value,
}));

vi.mock('./components/side-panel', () => ({
  SidePanelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./contexts/WorkspaceContext', () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWorkspace: () => ({
    currentWorkspace: workspaceState.currentWorkspaceId
      ? { id: workspaceState.currentWorkspaceId }
      : null,
    loading: false,
  }),
}));

vi.mock('./hooks/useAutoTheme', () => ({
  useAutoTheme: vi.fn(),
}));

vi.mock('./hooks/useHTMLLanguage', () => ({
  useHTMLLanguage: vi.fn(),
}));

vi.mock('./mantine-theme', () => ({
  mantineCssVariablesResolver: () => ({}),
  mantineTheme: {},
}));

vi.mock('./theme', () => ({
  createAppTheme: () => ({}),
}));

vi.mock('./tours/components/TourAutoStarter', () => ({
  TourAutoStarter: () => null,
}));

describe('Providers', () => {
  it('remounts workspace-scoped children when the active workspace changes', async () => {
    const { Providers } = await import('./providers');

    let instanceCounter = 0;

    function Probe() {
      const [instanceId] = React.useState(() => `probe-${++instanceCounter}`);

      return <div data-testid="probe">{instanceId}</div>;
    }

    const { rerender } = render(
      <Providers initialLocale="en">
        <Probe />
      </Providers>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('probe-1');

    workspaceState.currentWorkspaceId = 'workspace-2';

    rerender(
      <Providers initialLocale="en">
        <Probe />
      </Providers>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('probe-2');
  });
});
