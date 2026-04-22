'use client';

import type React from 'react';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

type WorkspaceSettings = Record<string, unknown>;
type WorkspacePermissions = Record<string, boolean>;

interface WorkspaceStats {
  integrationCount: number;
  recentActivity: boolean;
  memberCount: number;
  lastAccessedAt: Date | null;
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  backgroundImage: string | null;
  currency: string | null;
  isFavorite: boolean;
  settings: WorkspaceSettings | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberRole?: string;
  memberPermissions?: WorkspacePermissions;
  stats?: WorkspaceStats;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
  clearWorkspace: () => void;
  refreshWorkspaces: () => Promise<void>;
  toggleFavorite: (workspaceId: string) => Promise<void>;
  updateWorkspaceBackground: (params: { workspaceId: string; backgroundImage: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface WorkspaceSetters {
  setWorkspaces: SetState<Workspace[]>;
  setCurrentWorkspace: SetState<Workspace | null>;
  setLoading: SetState<boolean>;
  setError: SetState<string | null>;
}

async function fetchAndSetWorkspaces({
  setWorkspaces,
  setCurrentWorkspace,
  setLoading,
  setError,
}: WorkspaceSetters): Promise<void> {
  try {
    setLoading(true);
    setError(null);
    const response = await api.get('/workspaces');
    const data: Workspace[] = response.data;
    setWorkspaces(data);
    const storedId = localStorage.getItem('currentWorkspaceId');
    const found = storedId ? data.find(w => w.id === storedId) : null;
    const workspace = found ?? data[0] ?? null;
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspace.id);
    }
  } catch (err) {
    console.error('Failed to fetch workspaces:', err);
    setError(getApiErrorMessage(err, 'Failed to load workspaces'));
  } finally {
    setLoading(false);
  }
}

async function apiSwitchWorkspace(
  { workspaceId, refreshWorkspaces }: { workspaceId: string; refreshWorkspaces: () => Promise<void> },
  workspaces: Workspace[],
  setters: WorkspaceSetters,
): Promise<void> {
  try {
    setters.setLoading(true);
    setters.setError(null);
    await api.post(`/workspaces/${workspaceId}/switch`);
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setters.setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
    } else {
      await refreshWorkspaces();
    }
  } catch (err) {
    setters.setError(getApiErrorMessage(err, 'Failed to switch workspace'));
    throw err;
  } finally {
    setters.setLoading(false);
  }
}

async function apiToggleFavorite(
  { workspaceId }: { workspaceId: string },
  setters: Pick<WorkspaceSetters, 'setWorkspaces' | 'setCurrentWorkspace'>,
): Promise<void> {
  try {
    const response = await api.patch(`/workspaces/${workspaceId}/favorite`);
    const isFavorite: boolean = response.data.isFavorite;
    setters.setWorkspaces(prev => prev.map(w => (w.id === workspaceId ? { ...w, isFavorite } : w)));
    setters.setCurrentWorkspace(prev => (prev?.id === workspaceId ? { ...prev, isFavorite } : prev));
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
    throw err;
  }
}

async function apiUpdateBackground(
  { workspaceId, backgroundImage }: { workspaceId: string; backgroundImage: string },
  setters: Pick<WorkspaceSetters, 'setWorkspaces' | 'setCurrentWorkspace'>,
): Promise<void> {
  try {
    await api.patch(`/workspaces/${workspaceId}`, { backgroundImage });
    setters.setWorkspaces(prev =>
      prev.map(w => (w.id === workspaceId ? { ...w, backgroundImage } : w)),
    );
    setters.setCurrentWorkspace(prev =>
      prev?.id === workspaceId ? { ...prev, backgroundImage } : prev,
    );
  } catch (err) {
    console.error('Failed to update background:', err);
    throw err;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setters: WorkspaceSetters = { setWorkspaces, setCurrentWorkspace, setLoading, setError };
  const miniSetters = { setWorkspaces, setCurrentWorkspace };

  const refreshWorkspaces = useCallback(
    async () => fetchAndSetWorkspaces(setters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const switchWorkspace = useCallback(
    async (workspaceId: string) =>
      apiSwitchWorkspace({ workspaceId, refreshWorkspaces }, workspaces, setters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaces, refreshWorkspaces],
  );

  const clearWorkspace = useCallback(() => {
    setCurrentWorkspace(null);
    localStorage.removeItem('currentWorkspaceId');
  }, []);

  const toggleFavorite = useCallback(
    async (workspaceId: string) => apiToggleFavorite({ workspaceId }, miniSetters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const updateWorkspaceBackground = useCallback(
    async (params: { workspaceId: string; backgroundImage: string }) =>
      apiUpdateBackground(params, miniSetters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      void refreshWorkspaces();
    } else {
      setCurrentWorkspace(null);
      setWorkspaces([]);
      setError(null);
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    switchWorkspace,
    clearWorkspace,
    refreshWorkspaces,
    toggleFavorite,
    updateWorkspaceBackground,
    loading,
    error,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
