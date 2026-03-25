// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());
const switchWorkspaceMock = vi.hoisted(() => vi.fn());
const refreshWorkspacesMock = vi.hoisted(() => vi.fn());
const onCloseMock = vi.hoisted(() => vi.fn());
const onSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  api: {
    post: postMock,
  },
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    switchWorkspace: switchWorkspaceMock,
    refreshWorkspaces: refreshWorkspacesMock,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@heroui/modal', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="create-workspace-modal">{children}</div> : null,
  ModalContent: ({ children }: { children: (onClose: () => void) => React.ReactNode }) => (
    <div>{children(() => undefined)}</div>
  ),
  ModalHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ModalBody: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ModalFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@heroui/react', () => ({
  Button: ({ children, onClick, isDisabled, type = 'button', ...props }: any) => (
    <button type={type} onClick={onClick} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ label, value, onValueChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <input aria-label={label} value={value} placeholder={placeholder} onChange={e => onValueChange?.(e.target.value)} />
    </label>
  ),
  Textarea: ({ label, value, onValueChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <textarea aria-label={label} value={value} placeholder={placeholder} onChange={e => onValueChange?.(e.target.value)} />
    </label>
  ),
}));

vi.mock('./ServiceIntegrationSuggestions', () => ({
  ServiceIntegrationSuggestions: ({ onSkip }: { onSkip: () => void }) => (
    <div>
      <h3>Connect Your Services</h3>
      <button type="button" onClick={onSkip}>
        Skip for now
      </button>
    </div>
  ),
}));

describe('CreateWorkspaceModal', () => {
  beforeEach(() => {
    postMock.mockReset();
    switchWorkspaceMock.mockReset();
    refreshWorkspacesMock.mockReset();
    onCloseMock.mockReset();
    onSuccessMock.mockReset();
    postMock.mockResolvedValue({ data: { id: 'workspace-123' } });
    switchWorkspaceMock.mockResolvedValue(undefined);
    refreshWorkspacesMock.mockResolvedValue(undefined);
  });

  it('opens currency selection in a drawer-like picker instead of the inline modal picker', async () => {
    const { CreateWorkspaceModal } = await import('./CreateWorkspaceModal');

    render(<CreateWorkspaceModal isOpen onClose={onCloseMock} onSuccess={onSuccessMock} />);

    fireEvent.change(screen.getByLabelText('Workspace Name'), {
      target: { value: 'Demo workspace' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Background Image')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /select a currency/i }));

    expect(screen.getByLabelText('Close currency drawer')).toBeTruthy();
    expect(screen.queryByLabelText('Close currency picker')).toBeNull();
  });

  it('shows integrations step before closing or calling success on next from customization', async () => {
    const { CreateWorkspaceModal } = await import('./CreateWorkspaceModal');

    render(<CreateWorkspaceModal isOpen onClose={onCloseMock} onSuccess={onSuccessMock} />);

    fireEvent.change(screen.getByLabelText('Workspace Name'), {
      target: { value: 'Demo workspace' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText('Connect Your Services')).toBeTruthy();
    });

    expect(postMock).not.toHaveBeenCalled();
    expect(switchWorkspaceMock).not.toHaveBeenCalled();
    expect(refreshWorkspacesMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
    expect(onSuccessMock).not.toHaveBeenCalled();
  });
});
