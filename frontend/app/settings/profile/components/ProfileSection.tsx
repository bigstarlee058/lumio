'use client';

import { Alert } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Spinner } from '@/app/components/ui/spinner';
import type { TimeZoneOption } from '@/app/settings/profile/profileHelpers';
import type { FormEvent } from 'react';

type Props = {
  t: {
    profileCard: {
      nameLabel: { value: string };
      timeZoneLabel: { value: string };
      timeZoneHelp: { value: string };
      submit: { value: string };
    };
  };
  tx: (path: string[], fallback: string) => string;
  profileMessage: string | null;
  profileError: string | null;
  profileLoading: boolean;
  profileName: string;
  setProfileName: (name: string) => void;
  setProfileMessage: (msg: string | null) => void;
  setProfileError: (err: string | null) => void;
  hasProfileChanges: boolean;
  handleProfileSubmit: (e: FormEvent) => void;
  isTimeZoneModalOpen: boolean;
  setIsTimeZoneModalOpen: (open: boolean) => void;
  setTimeZoneSearch: (q: string) => void;
  selectedTimeZoneOption: TimeZoneOption;
};

export function ProfileSection({
  t,
  tx,
  profileMessage,
  profileError,
  profileLoading,
  profileName,
  setProfileName,
  setProfileMessage,
  setProfileError,
  hasProfileChanges,
  handleProfileSubmit,
  isTimeZoneModalOpen,
  setIsTimeZoneModalOpen,
  setTimeZoneSearch,
  selectedTimeZoneOption,
}: Props) {
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
        <Alert variant="warning">{tx(['profileCard', 'unsavedChanges'], 'Unsaved changes')}</Alert>
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
