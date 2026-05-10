// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const refreshWorkspacesMock = vi.hoisted(() => vi.fn());
const clearWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: Fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={alt ?? ''} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    delete: deleteMock,
  },
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
    refreshWorkspaces: refreshWorkspacesMock,
    clearWorkspace: clearWorkspaceMock,
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
  beforeEach(() => {
    deleteMock.mockReset();
    replaceMock.mockReset();
    refreshWorkspacesMock.mockReset();
    clearWorkspaceMock.mockReset();
    deleteMock.mockResolvedValue(undefined);
    refreshWorkspacesMock.mockResolvedValue(undefined);
  });

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

  it('uses dark-safe text styles in the workspace background drawer', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');

    render(<WorkspaceOverviewView />);

    fireEvent.click(screen.getByTestId('workspace-background-trigger'));

    const title = await screen.findByText('Select workspace background');
    const help = screen.getByText('Choose the image shown on your workspace card.');

    expect(title.className).toContain('text-foreground');
    expect(help.className).toContain('text-muted-foreground');
    expect(title.className).not.toContain('text-[#0f3428]');
    expect(help.className).not.toContain('text-gray-500');
  });

  it('uses dark-safe styles in the workspace currency drawer', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');

    render(<WorkspaceOverviewView />);

    fireEvent.click(screen.getByTestId('workspace-currency-trigger'));

    const title = await screen.findByText('Select a currency');
    const searchInput = screen.getByPlaceholderText('Search') as HTMLInputElement;
    const recentsLabel = screen.getByText('Recents');
    const selectedButton = screen
      .getAllByRole('button')
      .find(
        button => button.textContent?.includes('EUR - €') && button.className.includes('bg-muted'),
      ) as HTMLButtonElement;

    expect(title.className).toContain('text-foreground');
    expect(title.className).not.toContain('text-[#0f3428]');

    expect(searchInput.className).toContain('bg-background');
    expect(searchInput.className).toContain('text-foreground');
    expect(searchInput.className).toContain('border-border');
    expect(searchInput.className).not.toContain('bg-white');
    expect(searchInput.className).not.toContain('text-gray-900');

    expect(selectedButton.className).toContain('bg-muted');
    expect(selectedButton.className).not.toContain('bg-[#ebe8e2]');
    expect(selectedButton.textContent).toContain('EUR - €');

    expect(recentsLabel.className).toContain('text-muted-foreground');
    expect(recentsLabel.className).not.toContain('text-gray-500');
  });

  it('requires typing the workspace name before enabling delete confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');

    render(<WorkspaceOverviewView />);

    fireEvent.click(screen.getByRole('button', { name: /delete workspace/i }));

    const deleteDialog = await screen.findByRole('dialog');
    expect(screen.getByText('Delete workspace?')).toBeTruthy();
    expect(deleteDialog.textContent).toContain(
      'This will permanently delete the workspace and all related data.',
    );
    expect(confirmSpy).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    const nameInput = screen
      .getByRole('dialog')
      .querySelector('#delete-workspace-name') as HTMLInputElement;

    expect(confirmButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Wrong name' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Denis workspace' } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/workspaces/ws-1');
    });
    expect(clearWorkspaceMock).toHaveBeenCalled();
    expect(refreshWorkspacesMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/workspaces/list');

    confirmSpy.mockRestore();
  });
});
