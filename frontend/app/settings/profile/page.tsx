'use client';

import { Alert } from '@/app/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Label } from '@/app/components/ui/label';
import { Select as UiSelect } from '@/app/components/ui/select';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import { cn } from '@/app/lib/utils';
import { AppearanceSection } from '@/app/settings/profile/components/AppearanceSection';
import { ChangelogSection } from '@/app/settings/profile/components/ChangelogSection';
import { EmailSection } from '@/app/settings/profile/components/EmailSection';
import { NotificationsSection } from '@/app/settings/profile/components/NotificationsSection';
import { PasswordSection } from '@/app/settings/profile/components/PasswordSection';
import { ProfileSection } from '@/app/settings/profile/components/ProfileSection';
import { SessionsSection } from '@/app/settings/profile/components/SessionsSection';
import { useAppearance } from '@/app/settings/profile/hooks/useAppearance';
import { useAvatarUpload } from '@/app/settings/profile/hooks/useAvatarUpload';
import { useChangelog } from '@/app/settings/profile/hooks/useChangelog';
import { useEmailForm } from '@/app/settings/profile/hooks/useEmailForm';
import { useNotifications } from '@/app/settings/profile/hooks/useNotifications';
import { usePasswordForm } from '@/app/settings/profile/hooks/usePasswordForm';
import { useProfileForm } from '@/app/settings/profile/hooks/useProfileForm';
import { useSessions } from '@/app/settings/profile/hooks/useSessions';
import {
  type SectionId,
  type TimeZoneOption,
  getInitials,
  normalizeSection,
  resolveTimeZoneOptions,
  sections,
} from '@/app/settings/profile/profileHelpers';
import { Bell, Check, Clock, Lock, Mail, Palette, Pencil, Search, Shield, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const { locale } = useLocale();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const t = useIntlayer('settingsProfilePage');
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [isTimeZoneModalOpen, setIsTimeZoneModalOpen] = useState(false);
  const [timeZoneSearch, setTimeZoneSearch] = useState('');
  const timeZoneOptions = useMemo(resolveTimeZoneOptions, []);
  const tx = useCallback(
    (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );

  const isAuthenticated = useMemo(() => !!user, [user]);

  const {
    profileName,
    setProfileName,
    profileTimeZone,
    setProfileTimeZone,
    profileMessage,
    setProfileMessage,
    profileError,
    setProfileError,
    profileLoading,
    hasProfileChanges,
    handleProfileSubmit,
  } = useProfileForm(user, setUser, {
    successFallback: t.profileCard.successFallback.value,
    errorFallback: t.profileCard.errorFallback.value,
  });

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    sessionsMessage,
    logoutSessionLoadingId,
    loadSessions,
    handleLogoutSession,
    handleLogoutAll,
  } = useSessions(isAuthenticated, activeSection, {
    loadError: tx(['sessionsCard', 'sessionsLoadError'], 'Failed to load sessions'),
    logoutAllConfirm: tx(
      ['sessionsCard', 'logoutAllConfirm'],
      'Log out of all devices? You will need to sign in again on each device.',
    ),
    logoutCurrentConfirm: tx(
      ['sessionsCard', 'logoutCurrentConfirm'],
      'Log out on this device? You will need to sign in again.',
    ),
    logoutSessionConfirm: tx(
      ['sessionsCard', 'logoutSessionConfirm'],
      'Log out this device session?',
    ),
    sessionLogoutSuccess: tx(['sessionsCard', 'sessionLogoutSuccess'], 'Session logged out'),
    sessionLogoutError: tx(['sessionsCard', 'sessionLogoutError'], 'Failed to log out session'),
  });

  const {
    notificationPreferences,
    notificationsLoading,
    notificationSavingKey,
    notificationError,
    notificationMessage,
    toggleNotificationPreference,
  } = useNotifications(isAuthenticated, activeSection, {
    loadError: tx(['notificationsCard', 'errors', 'load'], ''),
    saveError: tx(['notificationsCard', 'errors', 'save'], ''),
    savedMessage: tx(['notificationsCard', 'messages', 'saved'], ''),
  });

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

  const {
    avatarError,
    setAvatarError,
    avatarUploading,
    avatarMessage,
    avatarErrorMessage,
    avatarInputRef,
    handleAvatarSelect,
  } = useAvatarUpload(user, setUser, {
    sizeError: tx(['profileCard', 'avatarSizeError'], 'Avatar file is too large'),
    updated: tx(['profileCard', 'avatarUpdated'], 'Avatar updated'),
    errorFallback: tx(['profileCard', 'avatarError'], 'Failed to update avatar'),
  });

  const {
    themePreference,
    appearanceMessage,
    appearanceError,
    appearanceLoading,
    handleThemePreferenceChange,
  } = useAppearance(user, setUser, {
    successFallback: t.appearanceCard.title.value,
    errorFallback: t.profileCard.errorFallback.value,
  });

  const {
    email,
    setEmail,
    emailPassword,
    setEmailPassword,
    emailMessage,
    emailError,
    emailLoading,
    handleEmailSubmit,
  } = useEmailForm(user, {
    passwordRequired: t.validation.passwordRequiredForEmail.value,
    successFallback: t.emailCard.successFallback.value,
    errorFallback: t.emailCard.errorFallback.value,
  });

  const {
    passwords,
    setPasswords,
    passwordMessage,
    passwordError,
    passwordLoading,
    handlePasswordSubmit,
  } = usePasswordForm({
    mismatch: t.validation.passwordMismatch.value,
    confirmSubmit: tx(
      ['passwordCard', 'confirmSubmit'],
      'Update password now? You may need to sign in again on other devices.',
    ),
    successFallback: t.passwordCard.successFallback.value,
    errorFallback: t.passwordCard.errorFallback.value,
  });

  const workspaceReady = !!(currentWorkspace && !workspaceLoading);
  const { changelogEntries, changelogLoading, changelogSelectedEntry, setChangelogSelectedEntry } =
    useChangelog(isAuthenticated, activeSection, workspaceReady);

  useEffect(() => {
    setActiveSection(normalizeSection(window.location.hash?.replace('#', '')));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeSection}`);
  }, [activeSection]);

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
      icon: ComponentType<{ size?: number; className?: string }>;
    }
  > = {
    profile: { title: t.profileCard.title.value, icon: UserCircle },
    appearance: {
      title: t.appearanceCard.title.value,
      description: t.appearanceCard.description.value,
      icon: Palette,
    },
    sessions: {
      title: t.sessionsCard.title.value,
      description: t.sessionsCard.logoutAllHelp.value,
      icon: Shield,
    },
    email: { title: t.emailCard.title.value, icon: Mail },
    password: { title: t.passwordCard.title.value, icon: Lock },
    notifications: {
      title: tx(['notificationsCard', 'title'], 'Notifications'),
      description: tx(['notificationsCard', 'description'], ''),
      icon: Bell,
    },
    changelog: {
      title: tx(['changelogCard', 'title'], 'Changelog'),
      description: tx(['changelogCard', 'description'], ''),
      icon: Clock,
    },
  };

  const sectionContent: Record<SectionId, React.ReactElement> = {
    profile: (
      <ProfileSection
        t={t}
        tx={tx}
        profileMessage={profileMessage}
        profileError={profileError}
        profileLoading={profileLoading}
        profileName={profileName}
        setProfileName={setProfileName}
        setProfileMessage={setProfileMessage}
        setProfileError={setProfileError}
        hasProfileChanges={hasProfileChanges}
        handleProfileSubmit={handleProfileSubmit}
        isTimeZoneModalOpen={isTimeZoneModalOpen}
        setIsTimeZoneModalOpen={setIsTimeZoneModalOpen}
        setTimeZoneSearch={setTimeZoneSearch}
        selectedTimeZoneOption={selectedTimeZoneOption}
      />
    ),
    appearance: (
      <AppearanceSection
        t={t}
        tx={tx}
        appearanceMessage={appearanceMessage}
        appearanceError={appearanceError}
        appearanceLoading={appearanceLoading}
        themePreference={themePreference}
        handleThemePreferenceChange={handleThemePreferenceChange}
      />
    ),
    sessions: (
      <SessionsSection
        t={t}
        tx={tx}
        sessionsMessage={sessionsMessage}
        sessionsError={sessionsError}
        sessionsLoading={sessionsLoading}
        sessions={sessions}
        userLastLogin={user?.lastLogin}
        logoutSessionLoadingId={logoutSessionLoadingId}
        handleLogoutSession={handleLogoutSession}
        handleLogoutAll={handleLogoutAll}
      />
    ),
    email: (
      <EmailSection
        t={t}
        email={email}
        setEmail={setEmail}
        emailPassword={emailPassword}
        setEmailPassword={setEmailPassword}
        emailMessage={emailMessage}
        emailError={emailError}
        emailLoading={emailLoading}
        handleEmailSubmit={handleEmailSubmit}
      />
    ),
    password: (
      <PasswordSection
        t={t}
        tx={tx}
        passwordMessage={passwordMessage}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        passwords={passwords}
        setPasswords={setPasswords}
        handlePasswordSubmit={handlePasswordSubmit}
      />
    ),
    notifications: (
      <NotificationsSection
        tx={tx}
        notificationError={notificationError}
        notificationMessage={notificationMessage}
        notificationsLoading={notificationsLoading}
        notificationPreferences={notificationPreferences}
        notificationSavingKey={notificationSavingKey}
        toggleNotificationPreference={toggleNotificationPreference}
      />
    ),
    changelog: (
      <ChangelogSection
        tx={tx}
        locale={locale}
        changelogEntries={changelogEntries}
        changelogLoading={changelogLoading}
        changelogSelectedEntry={changelogSelectedEntry}
        setChangelogSelectedEntry={setChangelogSelectedEntry}
      />
    ),
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
                      <Pencil size={14} className="text-muted-foreground" />
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
                        <Icon size={18} />
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
                      <Pencil size={14} className="text-muted-foreground" />
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
                  <ActiveIcon size={20} />
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
            <CardContent className="p-6 lg:p-8">{sectionContent[activeSection]}</CardContent>
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
