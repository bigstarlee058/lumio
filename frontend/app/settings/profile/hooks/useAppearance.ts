'use client';

import type { User } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import {
  THEME_STORAGE_EVENT,
  type ThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import { useEffect, useState } from 'react';

export type UseAppearanceMessages = {
  successFallback: string;
  errorFallback: string;
};

export type UseAppearanceReturn = {
  themePreference: ThemePreference;
  appearanceMessage: string | null;
  appearanceError: string | null;
  appearanceLoading: boolean;
  handleThemePreferenceChange: (nextTheme: ThemePreference) => Promise<void>;
};

export function useAppearance(
  user: User | null | undefined,
  setUser: (user: User) => void,
  messages: UseAppearanceMessages,
): UseAppearanceReturn {
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto');
  const [appearanceMessage, setAppearanceMessage] = useState<string | null>(null);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);

  useEffect(() => {
    setThemePreference(resolveThemePreference(user?.themePreference));
  }, [user?.themePreference]);

  const handleThemePreferenceChange = async (nextThemePreference: ThemePreference) => {
    setAppearanceMessage(null);
    setAppearanceError(null);

    try {
      setAppearanceLoading(true);
      const response = await apiClient.patch('/users/me/preferences', {
        themePreference: nextThemePreference,
      });

      const responseUser = response.data?.user;
      const nextUser = responseUser
        ? { ...(user || {}), ...responseUser, themePreference: nextThemePreference }
        : user
          ? { ...user, themePreference: nextThemePreference }
          : null;

      setThemePreference(nextThemePreference);

      if (nextUser) {
        setUser(nextUser as User);
        localStorage.setItem('user', JSON.stringify(nextUser));
        window.dispatchEvent(
          new CustomEvent(THEME_STORAGE_EVENT, {
            detail: { themePreference: nextThemePreference },
          }),
        );
      }

      setAppearanceMessage(response.data?.message || messages.successFallback);
    } catch (error: unknown) {
      setAppearanceError(getApiErrorMessage(error, messages.errorFallback));
    } finally {
      setAppearanceLoading(false);
    }
  };

  return {
    themePreference,
    appearanceMessage,
    appearanceError,
    appearanceLoading,
    handleThemePreferenceChange,
  };
}
