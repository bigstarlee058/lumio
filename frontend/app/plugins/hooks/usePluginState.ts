'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { PluginKey } from '../types';

const STORAGE_KEY = 'LUMIO_PLUGINS_STATE';
const EVENT_NAME = 'lumio-plugin-state-change';

function readState(): Record<PluginKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<PluginKey, boolean>) : ({} as Record<PluginKey, boolean>);
  } catch {
    return {} as Record<PluginKey, boolean>;
  }
}

function writeState(state: Record<PluginKey, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

let snapshot = readState();

function subscribe(cb: () => void): () => void {
  const handler = (): void => {
    snapshot = readState();
    cb();
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

function getSnapshot(): Record<PluginKey, boolean> {
  return snapshot;
}

function getServerSnapshot(): Record<PluginKey, boolean> {
  return {} as Record<PluginKey, boolean>;
}

export function usePluginState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isEnabled = useCallback(
    (key: PluginKey): boolean => Boolean(state[key]),
    [state],
  );

  const toggle = useCallback((key: PluginKey): void => {
    const current = readState();
    writeState({ ...current, [key]: !current[key] });
  }, []);

  const enabledPlugins = useMemo(
    () => (Object.keys(state) as PluginKey[]).filter(k => state[k]),
    [state],
  );

  return { isEnabled, toggle, enabledPlugins };
}
