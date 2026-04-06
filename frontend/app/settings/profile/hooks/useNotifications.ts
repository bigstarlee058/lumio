'use client';

import apiClient from '@/app/lib/api';
import {
  type NotificationPreferences,
  defaultNotificationPreferences,
} from '@/app/settings/profile/profileHelpers';
import { useEffect, useState } from 'react';

export type UseNotificationsMessages = {
  loadError: string;
  saveError: string;
  savedMessage: string;
};

export type UseNotificationsReturn = {
  notificationPreferences: NotificationPreferences;
  notificationsLoading: boolean;
  notificationSavingKey: keyof NotificationPreferences | null;
  notificationError: string | null;
  notificationMessage: string | null;
  toggleNotificationPreference: (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => Promise<void>;
};

export function useNotifications(
  isAuthenticated: boolean,
  activeSection: string,
  messages: UseNotificationsMessages,
): UseNotificationsReturn {
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSavingKey, setNotificationSavingKey] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'notifications') return;

    let active = true;

    const load = async () => {
      setNotificationsLoading(true);
      setNotificationError(null);
      try {
        const response = await apiClient.get('/notifications/preferences');
        if (!active) return;
        setNotificationPreferences({
          ...defaultNotificationPreferences,
          ...(response.data || {}),
        });
      } catch {
        if (!active) return;
        setNotificationError(messages.loadError);
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeSection, isAuthenticated, messages.loadError]);

  const toggleNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    setNotificationSavingKey(key);
    setNotificationError(null);
    setNotificationMessage(null);

    const previous = notificationPreferences;
    setNotificationPreferences(current => ({ ...current, [key]: value }));

    try {
      await apiClient.patch('/notifications/preferences', { [key]: value });
      setNotificationMessage(messages.savedMessage);
    } catch {
      setNotificationPreferences(previous);
      setNotificationError(messages.saveError);
    } finally {
      setNotificationSavingKey(null);
    }
  };

  return {
    notificationPreferences,
    notificationsLoading,
    notificationSavingKey,
    notificationError,
    notificationMessage,
    toggleNotificationPreference,
  };
}
