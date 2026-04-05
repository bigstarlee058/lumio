'use client';

import { type ChangelogEntry, ChangelogModal } from '@/app/components/ChangelogModal';
import { Alert } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select as UiSelect } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { MAX_AVATAR_SIZE_BYTES } from '@/app/lib/constants';
import {
  THEME_STORAGE_EVENT,
  type ThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { cn } from '@/app/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import EditIcon from '@mui/icons-material/Edit';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import TabletMacOutlinedIcon from '@mui/icons-material/TabletMacOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import type { AxiosError } from 'axios';
import { CalendarDays, Check, Clock3, FileText, Palette, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ApiErrorResponse = { message?: string; error?: { message?: string } };
type UserSession = {
  id: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

type TimeZoneOption = {
  value: string;
  label: string;
};


type NotificationPreferences = {
  statementUploaded: boolean;
  importCommitted: boolean;
  categoryChanges: boolean;
  memberActivity: boolean;
  dataDeleted: boolean;
  workspaceUpdated: boolean;
  parsingErrors: boolean;
  importFailures: boolean;
  uncategorizedItems: boolean;
};

interface ChangelogPayload {
  entries?: ChangelogEntry[];
}

const defaultNotificationPreferences: NotificationPreferences = {
  statementUploaded: true,
  importCommitted: true,
  categoryChanges: true,
  memberActivity: true,
  dataDeleted: true,
  workspaceUpdated: true,
  parsingErrors: true,
  importFailures: true,
  uncategorizedItems: true,
};

const workspaceNotificationSettings: Array<{
  key: keyof NotificationPreferences;
}> = [
  { key: 'statementUploaded' },
  { key: 'importCommitted' },
  { key: 'categoryChanges' },
  { key: 'memberActivity' },
  { key: 'dataDeleted' },
  { key: 'workspaceUpdated' },
];

const systemNotificationSettings: Array<{
  key: keyof NotificationPreferences;
}> = [{ key: 'parsingErrors' }, { key: 'importFailures' }, { key: 'uncategorizedItems' }];

const sections = [
  'profile',
  'appearance',
  'sessions',
  'email',
  'password',
  'notifications',
  'changelog',
] as const;
type SectionId = (typeof sections)[number];

const normalizeSection = (value: string | null | undefined): SectionId => {
  if (!value) return 'profile';
  if ((sections as readonly string[]).includes(value)) return value as SectionId;
  return 'profile';
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return (
    axiosError?.response?.data?.message || axiosError?.response?.data?.error?.message || fallback
  );
};

const getInitials = (value: string) => {
  if (!value) return '—';
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '—';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
};

const getSessionIcon = (device: string) => {
  const normalized = device.toLowerCase();
  if (normalized.includes('mobile')) {
    return SmartphoneOutlinedIcon;
  }
  if (normalized.includes('tablet')) {
    return TabletMacOutlinedIcon;
  }
  if (normalized.includes('bot')) {
    return SmartToyOutlinedIcon;
  }
  return DesktopWindowsOutlinedIcon;
};

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Asia/Almaty',
  'Asia/Astana',
  'Asia/Tashkent',
  'Europe/Berlin',
  'America/New_York',
];

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

const resolveTimeZoneOptions = () => {
  const intl = Intl as IntlWithSupportedValuesOf;
  if (typeof Intl !== 'undefined' && typeof intl.supportedValuesOf === 'function') {
    try {
      const zones = intl.supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) {
        return zones;
      }
    } catch {
      // Fallback below
    }
  }

  return COMMON_TIMEZONES;
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const { locale } = useLocale();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const t = useIntlayer('settingsProfilePage');
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [profileName, setProfileName] = useState('');
  const [profileTimeZone, setProfileTimeZone] = useState<string>('');
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState<string | null>(null);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);
  const [logoutSessionLoadingId, setLogoutSessionLoadingId] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSavingKey, setNotificationSavingKey] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarErrorMessage, setAvatarErrorMessage] = useState<string | null>(null);
  const [isTimeZoneModalOpen, setIsTimeZoneModalOpen] = useState(false);
  const [timeZoneSearch, setTimeZoneSearch] = useState('');
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogSelectedEntry, setChangelogSelectedEntry] = useState<ChangelogEntry | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const timeZoneOptions = useMemo(resolveTimeZoneOptions, []);
  const tx = useCallback(
    (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );

  const timeZoneSelectOptions = useMemo<TimeZoneOption[]>(() => {
    const autoLabel = t.profileCard.timeZones.auto.value;
    const utcLabel = t.profileCard.timeZones.utc.value;

    return [
      { value: '', label: autoLabel },
      ...timeZoneOptions.map(zone => ({
        value: zone,
        label: zone === 'UTC' ? utcLabel : zone,
      })),
    ];
  }, [t, timeZoneOptions]);

  const selectedTimeZoneOption = useMemo<TimeZoneOption>(() => {
    const matched = timeZoneSelectOptions.find(option => option.value === profileTimeZone);
    if (matched) {
      return matched;
    }

    if (profileTimeZone) {
      return { value: profileTimeZone, label: profileTimeZone };
    }

    return timeZoneSelectOptions[0] || { value: '', label: t.profileCard.timeZones.auto.value };
  }, [profileTimeZone, t, timeZoneSelectOptions]);

  const handleTimeZoneChange = useCallback((value: string) => {
    setProfileTimeZone(value);
    setProfileMessage(null);
    setProfileError(null);
    setIsTimeZoneModalOpen(false);
  }, []);

  const filteredTimeZoneSelectOptions = useMemo(() => {
    const query = timeZoneSearch.trim().toLowerCase();
    if (!query) {
      return timeZoneSelectOptions;
    }

    return timeZoneSelectOptions.filter(option => option.label.toLowerCase().includes(query));
  }, [timeZoneSearch, timeZoneSelectOptions]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.name) {
      setProfileName(user.name);
    }
    setProfileTimeZone(user?.timeZone || '');
    setThemePreference(resolveThemePreference(user?.themePreference));
  }, [user]);

  useEffect(() => {
    setActiveSection(normalizeSection(window.location.hash?.replace('#', '')));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeSection}`);
  }, [activeSection]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const isAuthenticated = useMemo(() => !!user, [user]);
  const hasProfileChanges = useMemo(() => {
    return (
      profileName.trim() !== (user?.name || '').trim() || profileTimeZone !== (user?.timeZone || '')
    );
  }, [profileName, profileTimeZone, user?.name, user?.timeZone]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    const normalizedName = profileName.trim();
    if (!hasProfileChanges) {
      return;
    }

    try {
      setProfileLoading(true);
      const response = await apiClient.patch('/users/me/preferences', {
        name: normalizedName,
        timeZone: profileTimeZone ? profileTimeZone : null,
      });

      const responseUser = response.data?.user;
      const nextUser = responseUser
        ? { ...(user || {}), ...responseUser }
        : user
          ? {
              ...user,
              name: normalizedName,
              timeZone: profileTimeZone || null,
            }
          : null;

      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }

      setProfileMessage(response.data?.message || t.profileCard.successFallback.value);
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error, t.profileCard.errorFallback.value));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarMessage(null);
    setAvatarErrorMessage(null);

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarErrorMessage(tx(['profileCard', 'avatarSizeError'], 'Avatar file is too large'));
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await apiClient.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUser = response.data?.user || user;
      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setAvatarMessage(tx(['profileCard', 'avatarUpdated'], 'Avatar updated'));
    } catch (error: unknown) {
      setAvatarErrorMessage(
        getApiErrorMessage(error, tx(['profileCard', 'avatarError'], 'Failed to update avatar')),
      );
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

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
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
        window.dispatchEvent(
          new CustomEvent(THEME_STORAGE_EVENT, {
            detail: { themePreference: nextThemePreference },
          }),
        );
      }

      setAppearanceMessage(response.data?.message || t.appearanceCard.title.value);
    } catch (error: unknown) {
      setAppearanceError(getApiErrorMessage(error, t.profileCard.errorFallback.value));
    } finally {
      setAppearanceLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm(
      tx(
        ['sessionsCard', 'logoutAllConfirm'],
        'Log out of all devices? You will need to sign in again on each device.',
      ),
    );

    if (!confirmed) {
      return;
    }

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
  };

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const response = await apiClient.get<UserSession[]>('/auth/sessions');
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      setSessionsError(
        getApiErrorMessage(
          error,
          tx(['sessionsCard', 'sessionsLoadError'], 'Failed to load sessions'),
        ),
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'sessions') {
      return;
    }

    loadSessions();
  }, [activeSection, isAuthenticated, loadSessions]);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'notifications') {
      return;
    }

    let active = true;
    const loadNotificationPreferences = async () => {
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
        setNotificationError(tx(['notificationsCard', 'errors', 'load'], ''));
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotificationPreferences();
    return () => {
      active = false;
    };
  }, [activeSection, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'changelog') {
      return;
    }

    if (!currentWorkspace || workspaceLoading) {
      return;
    }

    let cancelled = false;

    const loadChangelog = async () => {
      try {
        setChangelogLoading(true);
        const response = await fetch('/changelog.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Failed to load changelog: ${response.status}`);
        }

        const payload = (await response.json()) as ChangelogPayload;
        if (!cancelled) {
          setChangelogEntries(Array.isArray(payload.entries) ? payload.entries : []);
        }
      } catch {
        if (!cancelled) {
          setChangelogEntries([]);
        }
      } finally {
        if (!cancelled) {
          setChangelogLoading(false);
        }
      }
    };

    void loadChangelog();

    return () => {
      cancelled = true;
    };
  }, [activeSection, currentWorkspace, isAuthenticated, workspaceLoading]);

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
      setNotificationMessage(tx(['notificationsCard', 'messages', 'saved'], ''));
    } catch {
      setNotificationPreferences(previous);
      setNotificationError(tx(['notificationsCard', 'errors', 'save'], ''));
    } finally {
      setNotificationSavingKey(null);
    }
  };

  const handleLogoutSession = async (session: UserSession) => {
    const confirmMessage = session.isCurrent
      ? tx(
          ['sessionsCard', 'logoutCurrentConfirm'],
          'Log out on this device? You will need to sign in again.',
        )
      : tx(['sessionsCard', 'logoutSessionConfirm'], 'Log out this device session?');

    if (!window.confirm(confirmMessage)) {
      return;
    }

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
      setSessionsMessage(tx(['sessionsCard', 'sessionLogoutSuccess'], 'Session logged out'));
    } catch (error: unknown) {
      setSessionsError(
        getApiErrorMessage(
          error,
          tx(['sessionsCard', 'sessionLogoutError'], 'Failed to log out session'),
        ),
      );
    } finally {
      setLogoutSessionLoadingId(null);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailMessage(null);
    setEmailError(null);

    if (!emailPassword) {
      setEmailError(t.validation.passwordRequiredForEmail.value);
      return;
    }

    try {
      setEmailLoading(true);
      const response = await apiClient.patch('/users/me/email', {
        email,
        currentPassword: emailPassword,
      });

      setEmailMessage(response.data?.message || t.emailCard.successFallback.value);
      setEmailPassword('');
    } catch (error: unknown) {
      setEmailError(getApiErrorMessage(error, t.emailCard.errorFallback.value));
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwords.next !== passwords.confirm) {
      setPasswordError(t.validation.passwordMismatch.value);
      return;
    }

    const confirmed = window.confirm(
      tx(
        ['passwordCard', 'confirmSubmit'],
        'Update password now? You may need to sign in again on other devices.',
      ),
    );

    if (!confirmed) {
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiClient.patch('/users/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });

      setPasswordMessage(response.data?.message || t.passwordCard.successFallback.value);
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (error: unknown) {
      setPasswordError(getApiErrorMessage(error, t.passwordCard.errorFallback.value));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-shared flex justify-center px-4 py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container-shared px-4 py-10">
        <Alert className="max-w-xl" variant="default">
          {t.authRequired.value}
        </Alert>
      </div>
    );
  }

  const sectionMeta: Record<
    SectionId,
    {
      title: string;
      description?: string;
      icon: ComponentType<{ className?: string }>;
    }
  > = {
    profile: { title: t.profileCard.title.value, icon: AccountCircleIcon },
    appearance: {
      title: t.appearanceCard.title.value,
      description: t.appearanceCard.description.value,
      icon: Palette,
    },
    sessions: {
      title: t.sessionsCard.title.value,
      description: t.sessionsCard.logoutAllHelp.value,
      icon: SecurityIcon,
    },
    email: { title: t.emailCard.title.value, icon: MailOutlineIcon },
    password: { title: t.passwordCard.title.value, icon: LockOutlinedIcon },
    notifications: {
      title: tx(['notificationsCard', 'title'], 'Notifications'),
      description: tx(['notificationsCard', 'description'], ''),
      icon: NotificationsNoneOutlinedIcon,
    },
    changelog: {
      title: tx(['changelogCard', 'title'], 'Changelog'),
      description: tx(['changelogCard', 'description'], ''),
      icon: UpdateOutlinedIcon,
    },
  };

  const notificationLabels = {
    loading: tx(['notificationsCard', 'loading'], ''),
    workspaceTitle: tx(['notificationsCard', 'workspace', 'title'], ''),
    workspaceDescription: tx(['notificationsCard', 'workspace', 'description'], ''),
    systemTitle: tx(['notificationsCard', 'system', 'title'], ''),
    systemDescription: tx(['notificationsCard', 'system', 'description'], ''),
    items: {
      statementUploaded: {
        label: tx(['notificationsCard', 'items', 'statementUploaded', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'statementUploaded', 'description'], ''),
      },
      importCommitted: {
        label: tx(['notificationsCard', 'items', 'importCommitted', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'importCommitted', 'description'], ''),
      },
      categoryChanges: {
        label: tx(['notificationsCard', 'items', 'categoryChanges', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'categoryChanges', 'description'], ''),
      },
      memberActivity: {
        label: tx(['notificationsCard', 'items', 'memberActivity', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'memberActivity', 'description'], ''),
      },
      dataDeleted: {
        label: tx(['notificationsCard', 'items', 'dataDeleted', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'dataDeleted', 'description'], ''),
      },
      workspaceUpdated: {
        label: tx(['notificationsCard', 'items', 'workspaceUpdated', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'workspaceUpdated', 'description'], ''),
      },
      parsingErrors: {
        label: tx(['notificationsCard', 'items', 'parsingErrors', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'parsingErrors', 'description'], ''),
      },
      importFailures: {
        label: tx(['notificationsCard', 'items', 'importFailures', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'importFailures', 'description'], ''),
      },
      uncategorizedItems: {
        label: tx(['notificationsCard', 'items', 'uncategorizedItems', 'label'], ''),
        description: tx(['notificationsCard', 'items', 'uncategorizedItems', 'description'], ''),
      },
    },
  };

  const renderSectionContent = () => {
    if (activeSection === 'profile') {
      return (
        <form className="space-y-5" onSubmit={handleProfileSubmit}>
          {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
          {profileError && <Alert variant="error">{profileError}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="profile-name">{t.profileCard.nameLabel.value}</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={e => {
                setProfileName(e.target.value);
                setProfileMessage(null);
                setProfileError(null);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-timezone">{t.profileCard.timeZoneLabel.value}</Label>
            <button
              id="profile-timezone-trigger"
              data-testid="profile-timezone-trigger"
              type="button"
              onClick={() => {
                setIsTimeZoneModalOpen(true);
                setTimeZoneSearch('');
              }}
              className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary"
              aria-haspopup="dialog"
              aria-expanded={isTimeZoneModalOpen}
            >
              <span>{selectedTimeZoneOption.label}</span>
              <span className="text-muted-foreground">v</span>
            </button>
            <p className="text-xs text-muted-foreground">{t.profileCard.timeZoneHelp.value}</p>
          </div>

          {hasProfileChanges && (
            <Alert variant="warning">
              {tx(['profileCard', 'unsavedChanges'], 'Unsaved changes')}
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={profileLoading || !hasProfileChanges} className="gap-2">
              {profileLoading && <Spinner className="h-4 w-4 text-inherit" />}
              {t.profileCard.submit.value}
            </Button>
          </div>
        </form>
      );
    }

    if (activeSection === 'appearance') {
      return (
        <div className="space-y-5">
          {appearanceMessage ? <Alert variant="success">{appearanceMessage}</Alert> : null}
          {appearanceError ? <Alert variant="error">{appearanceError}</Alert> : null}

          <Card>
            <CardHeader>
              <CardTitle>{t.appearanceCard.themeLabel.value}</CardTitle>
              <CardDescription>{t.appearanceCard.themeHelp.value}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModeToggle
                value={themePreference}
                onThemeChange={handleThemePreferenceChange}
                showPreview={false}
                labels={{
                  light: t.appearanceCard.light.value,
                  dark: t.appearanceCard.dark.value,
                  auto: tx(['appearanceCard', 'auto'], 'Auto'),
                  active: t.appearanceCard.active.value,
                  followsSystem: t.appearanceCard.followsSystem.value,
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t.appearanceCard.followsSystem.value}
              </p>
              {appearanceLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4 text-inherit" />
                  <span>{t.appearanceCard.active.value}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === 'sessions') {
      return (
        <div className="space-y-5">
          {sessionsMessage && <Alert variant="success">{sessionsMessage}</Alert>}
          {sessionsError && <Alert variant="error">{sessionsError}</Alert>}
          <Alert variant="warning">
            {tx(
              ['sessionsCard', 'securityHint'],
              'Only sign out devices you recognize. Signing out current device ends this session immediately.',
            )}
          </Alert>

          <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t.sessionsCard.lastLoginLabel.value}:
            </span>{' '}
            {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">
              {tx(['sessionsCard', 'activeSessionsLabel'], 'Active devices')}
            </div>

            {sessionsLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-5 text-sm text-muted-foreground">
                <Spinner className="h-[18px] w-[18px] text-inherit" />
                {tx(['sessionsCard', 'loadingLabel'], 'Loading sessions...')}
              </div>
            ) : sessions.length ? (
              <div className="space-y-2">
                {sessions.map(session => {
                  const SessionIcon = getSessionIcon(session.device);
                  const isLogoutLoading = logoutSessionLoadingId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 px-4 py-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <SessionIcon className="text-[20px]" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                            <span>{`${session.device} · ${session.browser}`}</span>
                            {session.isCurrent && (
                              <Badge variant="info">
                                {tx(['sessionsCard', 'currentSessionBadge'], 'This device')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.os}
                            {session.ipAddress
                              ? ` · ${tx(['sessionsCard', 'ipLabel'], 'IP')}: ${session.ipAddress}`
                              : ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx(['sessionsCard', 'lastActiveLabel'], 'Last active')}:{' '}
                            {new Date(session.lastUsedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant={session.isCurrent ? 'destructive' : 'outline'}
                          onClick={() => handleLogoutSession(session)}
                          disabled={isLogoutLoading}
                          className="gap-2"
                        >
                          {isLogoutLoading && (
                            <Spinner className="h-[14px] w-[14px] text-inherit" />
                          )}
                          <LogoutIcon className="text-[18px]" />
                          {tx(['sessionsCard', 'logoutSessionButton'], 'Log out')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/60 px-4 py-6 text-sm text-muted-foreground">
                {tx(['sessionsCard', 'emptySessionsLabel'], 'No active sessions found.')}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleLogoutAll} className="gap-2">
              <LogoutIcon className="text-[18px]" />
              {t.sessionsCard.logoutAllButton.value}
            </Button>
          </div>
        </div>
      );
    }

    if (activeSection === 'email') {
      return (
        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          {emailMessage && <Alert variant="success">{emailMessage}</Alert>}
          {emailError && <Alert variant="error">{emailError}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="email-next">{t.emailCard.newEmailLabel.value}</Label>
            <Input
              id="email-next"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-password">{t.emailCard.currentPasswordLabel.value}</Label>
            <Input
              id="email-password"
              type="password"
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{t.emailCard.currentPasswordHelp.value}</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={emailLoading} className="gap-2">
              {emailLoading && <Spinner className="h-4 w-4 text-inherit" />}
              {t.emailCard.submit.value}
            </Button>
          </div>
        </form>
      );
    }

    if (activeSection === 'notifications') {
      return (
        <div className="space-y-4">
          {notificationError ? <Alert variant="error">{notificationError}</Alert> : null}
          {notificationMessage ? <Alert variant="success">{notificationMessage}</Alert> : null}

          {notificationsLoading ? (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-5 text-sm text-muted-foreground">
              {notificationLabels.loading}
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{notificationLabels.workspaceTitle}</CardTitle>
                  <CardDescription>{notificationLabels.workspaceDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workspaceNotificationSettings.map(setting => {
                    const inputId = `workspace-pref-${setting.key}`;
                    const item =
                      notificationLabels.items[
                        setting.key as keyof typeof notificationLabels.items
                      ];
                    return (
                      <div
                        key={setting.key}
                        className="flex items-start justify-between gap-4 rounded-xl border border-border p-3"
                      >
                        <div className="space-y-1">
                          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                            {item.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Checkbox
                          id={inputId}
                          checked={notificationPreferences[setting.key]}
                          onCheckedChange={checked =>
                            void toggleNotificationPreference(setting.key, checked)
                          }
                          disabled={notificationSavingKey === setting.key}
                          aria-label={item.label}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{notificationLabels.systemTitle}</CardTitle>
                  <CardDescription>{notificationLabels.systemDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemNotificationSettings.map(setting => {
                    const inputId = `system-pref-${setting.key}`;
                    const item =
                      notificationLabels.items[
                        setting.key as keyof typeof notificationLabels.items
                      ];
                    return (
                      <div
                        key={setting.key}
                        className="flex items-start justify-between gap-4 rounded-xl border border-border p-3"
                      >
                        <div className="space-y-1">
                          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                            {item.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Checkbox
                          id={inputId}
                          checked={notificationPreferences[setting.key]}
                          onCheckedChange={checked =>
                            void toggleNotificationPreference(setting.key, checked)
                          }
                          disabled={notificationSavingKey === setting.key}
                          aria-label={item.label}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      );
    }

    if (activeSection === 'changelog') {
      const releaseLabelText = tx(['changelogCard', 'releaseLabel'], 'Release');
      const closeLabelText = tx(['changelogCard', 'closeLabel'], 'Close changelog');
      const emptyText = tx(['changelogCard', 'empty'], 'No published updates yet.');
      const loadingText = tx(['changelogCard', 'loading'], 'Loading changelog...');
      const openDetailsText = tx(['changelogCard', 'openDetails'], 'Open details');

      const formattedEntries = changelogEntries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = Number.isNaN(date.getTime())
          ? entry.date
          : new Intl.DateTimeFormat(locale || 'ru', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(date);

        return {
          ...entry,
          dateLabel: formattedDate,
        };
      });

      return (
        <div className="space-y-4">
          {changelogLoading ? (
            <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
              {loadingText}
            </div>
          ) : formattedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{emptyText}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formattedEntries.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setChangelogSelectedEntry(entry)}
                  className="w-full rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                        {entry.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {entry.summary}
                      </p>
                    </div>

                    {entry.version ? (
                      <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        {entry.version}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {entry.dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {openDetailsText}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <ChangelogModal
            isOpen={Boolean(changelogSelectedEntry)}
            onClose={() => setChangelogSelectedEntry(null)}
            entry={changelogSelectedEntry}
            releaseLabel={releaseLabelText}
            closeLabel={closeLabelText}
          />
        </div>
      );
    }

    return (
      <form className="space-y-5" onSubmit={handlePasswordSubmit}>
        {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
        {passwordError && <Alert variant="error">{passwordError}</Alert>}
        <Alert variant="warning">
          {tx(
            ['passwordCard', 'securityHint'],
            'Use a unique password and keep your account email secure. Confirm before applying password changes.',
          )}
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="password-current">{t.passwordCard.currentPasswordLabel.value}</Label>
          <Input
            id="password-current"
            type="password"
            value={passwords.current}
            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
            required
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="password-next">{t.passwordCard.newPasswordLabel.value}</Label>
          <Input
            id="password-next"
            type="password"
            value={passwords.next}
            onChange={e => setPasswords({ ...passwords, next: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">{t.passwordCard.newPasswordHelp.value}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-confirm">{t.passwordCard.confirmPasswordLabel.value}</Label>
          <Input
            id="password-confirm"
            type="password"
            value={passwords.confirm}
            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={passwordLoading} className="gap-2">
            {passwordLoading && <Spinner className="h-4 w-4 text-inherit" />}
            {t.passwordCard.submit.value}
          </Button>
        </div>
      </form>
    );
  };

  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;
  const displayName = profileName || user?.name || user?.email?.split('@')[0] || '—';
  const initials = getInitials(displayName);
  const avatarUrl = normalizeAvatarUrl(user?.avatarUrl);

  return (
    <div className="container-shared px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Card className="border-border bg-card shadow-sm dark:bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col items-center gap-2 pb-3">
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-base font-semibold"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </button>
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {tx(['profileCard', 'editPhotoLabel'], 'Edit photo')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card shadow">
                      <EditIcon className="text-muted-foreground" fontSize="small" />
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </div>
                  {avatarMessage && <Alert variant="success">{avatarMessage}</Alert>}
                  {avatarErrorMessage && <Alert variant="error">{avatarErrorMessage}</Alert>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map(id => {
                  const Icon = sectionMeta[id].icon;
                  const isActive = id === activeSection;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-all hover:bg-muted',
                        isActive && 'font-semibold',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-[18px]',
                          isActive ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        <Icon className="text-[18px]" />
                      </span>
                      <span>{sectionMeta[id].title}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="lg:hidden">
            <Card className="border-border bg-card shadow-sm dark:bg-card">
              <CardContent className="space-y-2">
                <div className="flex justify-center pb-2">
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-base font-semibold"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </button>
                    <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {tx(['profileCard', 'editPhotoLabel'], 'Edit photo')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow">
                      <EditIcon className="text-muted-foreground" fontSize="small" />
                    </div>
                  </div>
                </div>
                <Label htmlFor="profile-section">{t.navigation.sectionLabel.value}</Label>
                <UiSelect
                  id="profile-section"
                  value={activeSection}
                  onChange={e => setActiveSection(normalizeSection(e.target.value))}
                >
                  {sections.map(id => (
                    <option key={id} value={id}>
                      {sectionMeta[id].title}
                    </option>
                  ))}
                </UiSelect>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card shadow-sm dark:bg-card">
            <CardHeader className="border-b border-border bg-muted/60 dark:bg-muted/60">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ActiveIcon className="text-[20px]" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {activeMeta.title}
                  </CardTitle>
                  {activeMeta.description && (
                    <CardDescription className="mt-1 text-sm text-muted-foreground">
                      {activeMeta.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">{renderSectionContent()}</CardContent>
          </Card>
        </main>
      </div>

      <DrawerShell
        isOpen={isTimeZoneModalOpen}
        onClose={() => {
          setIsTimeZoneModalOpen(false);
          setTimeZoneSearch('');
        }}
        title={t.profileCard.timeZoneLabel.value}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-timezone"
                type="text"
                value={timeZoneSearch}
                onChange={event => setTimeZoneSearch(event.target.value)}
                placeholder={t.profileCard.timeZones.auto.value}
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              {filteredTimeZoneSelectOptions.length > 0 ? (
                filteredTimeZoneSelectOptions.map(option => {
                  const isSelected = option.value === selectedTimeZoneOption.value;
                  return (
                    <button
                      key={option.value || '__auto'}
                      type="button"
                      onClick={() => handleTimeZoneChange(option.value)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl bg-card px-3 py-3 text-sm text-muted-foreground">
                  No time zones found
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            {t.profileCard.timeZoneHelp.value}
          </p>
        </div>
      </DrawerShell>
    </div>
  );
}
