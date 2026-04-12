// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ButtonMockProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  isDisabled?: boolean;
};

type FieldMockProps = {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
};

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

vi.mock('@mui/material/Dialog', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="create-workspace-modal">{children}</div> : null,
}));

vi.mock('@mui/material/DialogTitle', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mui/material/DialogContent', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mui/material/DialogActions', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mui/material/Button', () => ({
  default: ({ children, onClick, disabled, type = 'button', ...props }: ButtonMockProps) => (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@mui/material/TextField', () => ({
  default: ({ label, value, onChange, placeholder, multiline }: FieldMockProps & { multiline?: boolean }) => (
    <label>
      <span>{label}</span>
      {multiline ? (
        <textarea aria-label={label ?? ''} value={value} placeholder={placeholder} onChange={e => onChange?.({ target: { value: e.target.value } } as React.ChangeEvent<HTMLInputElement>)} />
      ) : (
        <input aria-label={label ?? ''} value={value} placeholder={placeholder} onChange={onChange} />
      )}
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
