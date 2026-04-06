'use client';

import { Alert } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Spinner } from '@/app/components/ui/spinner';
import type { FormEvent } from 'react';

type Props = {
  t: {
    emailCard: {
      newEmailLabel: { value: string };
      currentPasswordLabel: { value: string };
      currentPasswordHelp: { value: string };
      submit: { value: string };
    };
  };
  email: string;
  setEmail: (v: string) => void;
  emailPassword: string;
  setEmailPassword: (v: string) => void;
  emailMessage: string | null;
  emailError: string | null;
  emailLoading: boolean;
  handleEmailSubmit: (e: FormEvent) => void;
};

export function EmailSection({
  t,
  email,
  setEmail,
  emailPassword,
  setEmailPassword,
  emailMessage,
  emailError,
  emailLoading,
  handleEmailSubmit,
}: Props) {
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
