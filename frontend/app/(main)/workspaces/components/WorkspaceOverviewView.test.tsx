// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={alt ?? ''} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: 'ws-1',
      name: 'Denis workspace',
      description: 'Workspace description',
      currency: 'EUR',
      backgroundImage: null,
      settings: {},
      memberRole: 'owner',
    },
    refreshWorkspaces: vi.fn(),
    clearWorkspace: vi.fn(),
    updateWorkspaceBackground: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WorkspaceOverviewView', () => {
  it('renders currency picker trigger instead of native select', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');
    const html = renderToStaticMarkup(<WorkspaceOverviewView />);

    expect(html).toContain('data-testid="workspace-currency-trigger"');
    expect(html).not.toContain('id="workspace-currency"');
    expect(html).not.toContain('Plan type');
    expect(html).not.toContain('Company address');
  });

  it('uses a compact overview layout to reduce page scrolling', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');
    const html = renderToStaticMarkup(<WorkspaceOverviewView />);

    expect(html).toContain('max-w-5xl');
    expect(html).toContain('py-4');
    expect(html).toContain('aspect-[2.8/1]');
    expect(html).toContain('sm:max-w-[320px]');
    expect(html).toContain('min-h-20');
    expect(html).toContain('rows="2"');
    expect(html).toContain('text-xs text-muted-foreground');
  });

  it('renders background preview in the top section and keeps selector inside drawer content', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');
    const html = renderToStaticMarkup(<WorkspaceOverviewView />);

    expect(html).toContain('data-testid="workspace-background-trigger"');
    expect(html).toContain('Workspace background');
    expect(html).not.toContain('lg:grid-cols-[220px_minmax(0,1fr)]');
  });

  it('opens workspace background selection in a drawer', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');

    render(<WorkspaceOverviewView />);

    fireEvent.click(screen.getByTestId('workspace-background-trigger'));

    expect(await screen.findByText('Select workspace background')).toBeTruthy();
    expect(screen.getByAltText('ferdinand-stohr-W1FIkdPAB7E-unsplash.jpg')).toBeTruthy();
  });
});
