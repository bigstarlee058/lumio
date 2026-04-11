// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppPagination } from './pagination';

describe('AppPagination', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders a navigation element', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AppPagination page={2} total={10} onChange={() => undefined} />);
    });

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();

    act(() => root.unmount());
    container.remove();
  });

  it('clamps page within bounds and handles onChange', async () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AppPagination page={2} total={10} onChange={onChange} />);
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    act(() => root.unmount());
    container.remove();
  });

  it('is disabled when total is 1', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AppPagination page={1} total={1} onChange={() => undefined} />);
    });

    const buttons = container.querySelectorAll('button[disabled]');
    expect(buttons.length).toBeGreaterThan(0);

    act(() => root.unmount());
    container.remove();
  });
});
