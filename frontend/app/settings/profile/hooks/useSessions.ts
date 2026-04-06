'use client';

import apiClient from '@/app/lib/api';
import { type UserSession, getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export type UseSessionsMessages = {
  loadError: string;
  logoutAllConfirm: string;
  logoutCurrentConfirm: string;
  logoutSessionConfirm: string;
  sessionLogoutSuccess: string;
  sessionLogoutError: string;
};

export type UseSessionsReturn = {
  sessions: UserSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  sessionsMessage: string | null;
  logoutSessionLoadingId: string | null;
  loadSessions: () => Promise<void>;
  handleLogoutSession: (session: UserSession) => Promise<void>;
  handleLogoutAll: () => Promise<void>;
};

export function useSessions(
  isAuthenticated: boolean,
  activeSection: string,
  messages: UseSessionsMessages,
): UseSessionsReturn {
  const router = useRouter();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);
  const [logoutSessionLoadingId, setLogoutSessionLoadingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const response = await apiClient.get<UserSession[]>('/auth/sessions');
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      setSessionsError(getApiErrorMessage(error, messages.loadError));
    } finally {
      setSessionsLoading(false);
    }
  }, [messages.loadError]);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'sessions') return;
    loadSessions();
  }, [activeSection, isAuthenticated, loadSessions]);

  const handleLogoutAll = useCallback(async () => {
    if (!window.confirm(messages.logoutAllConfirm)) return;
    try {
      await apiClient.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout-all error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [messages.logoutAllConfirm, router]);

  const handleLogoutSession = useCallback(
    async (session: UserSession) => {
      const confirmMessage = session.isCurrent
        ? messages.logoutCurrentConfirm
        : messages.logoutSessionConfirm;

      if (!window.confirm(confirmMessage)) return;

      try {
        setLogoutSessionLoadingId(session.id);
        setSessionsError(null);
        setSessionsMessage(null);
        await apiClient.post(`/auth/sessions/${session.id}/logout`);

        if (session.isCurrent) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }

        setSessions(prev => prev.filter(current => current.id !== session.id));
        setSessionsMessage(messages.sessionLogoutSuccess);
      } catch (error: unknown) {
        setSessionsError(getApiErrorMessage(error, messages.sessionLogoutError));
      } finally {
        setLogoutSessionLoadingId(null);
      }
    },
    [messages, router],
  );

  return {
    sessions,
    sessionsLoading,
    sessionsError,
    sessionsMessage,
    logoutSessionLoadingId,
    loadSessions,
    handleLogoutSession,
    handleLogoutAll,
  };
}
