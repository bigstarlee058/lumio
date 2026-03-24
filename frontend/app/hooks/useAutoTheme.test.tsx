import type { ThemePreference } from '@/app/lib/theme-preference';
// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoTheme } from './useAutoTheme';

const setThemeMock = vi.hoisted(() => vi.fn());

vi.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: setThemeMock,
  }),
}));

function Harness({ preference }: { preference: ThemePreference }) {
  useAutoTheme(preference);
  return null;
}

describe('useAutoTheme', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    localStorage.clear();
    setThemeMock.mockReset();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('applies light theme during daytime in auto mode', async () => {
    vi.setSystemTime(new Date('2026-03-25T12:00:00.000Z'));
    localStorage.setItem('user', JSON.stringify({ timeZone: 'UTC' }));

    await act(async () => {
      root.render(<Harness preference="auto" />);
    });

    expect(setThemeMock).toHaveBeenCalledWith('light');
  });

  it('switches from light to dark when schedule crosses 19:00', async () => {
    vi.setSystemTime(new Date('2026-03-25T18:59:00.000Z'));
    localStorage.setItem('user', JSON.stringify({ timeZone: 'UTC' }));

    await act(async () => {
      root.render(<Harness preference="auto" />);
    });

    expect(setThemeMock).toHaveBeenLastCalledWith('light');

    await act(async () => {
      vi.setSystemTime(new Date('2026-03-25T19:00:00.000Z'));
      vi.advanceTimersByTime(60_000);
    });

    expect(setThemeMock).toHaveBeenLastCalledWith('dark');
  });

  it('applies manual theme immediately', async () => {
    vi.setSystemTime(new Date('2026-03-25T23:00:00.000Z'));

    await act(async () => {
      root.render(<Harness preference="dark" />);
    });

    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });
});
