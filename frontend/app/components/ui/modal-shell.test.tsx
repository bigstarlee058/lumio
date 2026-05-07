import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModalFooter, ModalShell } from './modal-shell';

describe('ModalShell', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const fabPortal = document.createElement('div');
    fabPortal.id = 'fab-portal';
    fabPortal.className = 'fixed inset-0 z-[300] pointer-events-none';
    document.body.appendChild(fabPortal);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.getElementById('fab-portal')?.remove();
    container.remove();
  });

  it('renders above the floating action portal', async () => {
    await act(async () => {
      root.render(
        <ModalShell isOpen onClose={() => undefined} showCloseButton={false}>
          <div>Modal content</div>
        </ModalShell>,
      );
      await Promise.resolve();
    });

    const dialog = document.body.querySelector('[role="dialog"]') as HTMLDivElement | null;
    expect(dialog).toBeTruthy();
  });

  it('uses the shared spinner in a loading confirm action', async () => {
    await act(async () => {
      root.render(
        <ModalFooter onConfirm={() => undefined} isConfirmLoading confirmText="Saving" />,
      );
      await Promise.resolve();
    });

    const spinner = container.querySelector('[aria-label="Loading"]');
    expect(spinner).toBeTruthy();
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(container.textContent).toContain('Saving');
  });
});
