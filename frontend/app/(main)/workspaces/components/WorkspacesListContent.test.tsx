// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.hoisted(() => vi.fn());

const workspaceState = {
  workspaces: [
    {
      id: 'ws-1',
      name: 'Main Workspace',
      description: 'Workspace description',
      isFavorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  loading: false,
  switchWorkspace: vi.fn(),
  refreshWorkspaces: vi.fn(),
};

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    loading: 'Loading...',
    noWorkspaces: 'No workspaces',
    createWorkspace: 'Create Workspace',
    searchPlaceholder: 'Search workspaces...',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock('./WorkspaceCard', () => ({
  WorkspaceCard: () => <div>workspace-card</div>,
}));

describe('WorkspacesListContent', () => {
  it('routes create workspace actions to onboarding create-workspace mode', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const container = document.createElement('div');
    const root = createRoot(container);

    pushMock.mockReset();

    await act(async () => {
      root.render(<WorkspacesListContent />);
    });

    const createWorkspaceButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Create Workspace'),
    ) as HTMLButtonElement | undefined;

    expect(createWorkspaceButton).toBeTruthy();

    await act(async () => {
      createWorkspaceButton?.click();
    });

    expect(pushMock).toHaveBeenCalledWith('/onboarding?mode=create-workspace');
  });

  it('renders the shared spinner while loading', async () => {
    workspaceState.loading = true;

    try {
      const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
      const html = renderToStaticMarkup(<WorkspacesListContent />);

      expect(html).toContain('aria-label="Loading"');
      expect(html).toContain('role="status"');
    } finally {
      workspaceState.loading = false;
    }
  });

  it('does not render embedded workspace switch header', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const html = renderToStaticMarkup(<WorkspacesListContent embedded onCloseEmbedded={vi.fn()} />);

    expect(html).not.toContain('Switch workspace without leaving this page');
    expect(html).not.toContain('All Workspaces');
    expect(html).not.toContain('Close');
  });

  it('renders statements-style search bar in embedded mode', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkspacesListContent embedded onCloseEmbedded={vi.fn()} />);
    });

    const searchInput = container.querySelector('input[aria-label="Search workspaces..."]');
    expect(searchInput).toBeTruthy();
    expect(searchInput?.className).toContain('pl-11');
    expect(searchInput?.className).toContain('rounded-md');
  });

  it('switches to list format when list view button is clicked', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkspacesListContent />);
    });

    expect(container.textContent).toContain('workspace-card');

    const listViewButton = container.querySelector(
      'button[title="List view"]',
    ) as HTMLButtonElement;
    expect(listViewButton).toBeTruthy();

    await act(async () => {
      listViewButton.click();
    });

    expect(container.textContent).toContain('Workspace name');
    expect(container.textContent).not.toContain('workspace-card');
    expect(container.textContent).toContain('Main Workspace');
  });

  it('renders a more visible create workspace tile in grid view', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const html = renderToStaticMarkup(<WorkspacesListContent />);

    expect(html).toContain('Create Workspace');
    expect(html).toContain('border-gray-200');
    expect(html).toContain('bg-white');
    expect(html).toContain('shadow-sm');
    expect(html).toContain('hover:bg-gray-50');
    expect(html).toContain('mb-3 text-primary');
    expect(html).not.toContain('bg-gradient-to-br');
    expect(html).not.toContain('shadow-[0_20px_45px_-28px_rgba(30,136,229,0.55)]');
    expect(html).not.toContain('rounded-full');
  });

  it('keeps the create workspace tile at the same height as workspace cards', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const html = renderToStaticMarkup(<WorkspacesListContent />);

    expect(html).toContain('h-full');
    expect(html).toContain('w-full');
    expect(html).toContain('aspect-video');
  });
});
