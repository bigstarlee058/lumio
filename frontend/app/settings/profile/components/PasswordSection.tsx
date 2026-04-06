'use client';

import { Alert } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { Spinner } from '@/app/components/ui/spinner';
import type { FormEvent } from 'react';

type Passwords = { current: string; next: string; confirm: string };

type Props = {
  t: {
    passwordCard: {
      currentPasswordLabel: { value: string };
      newPasswordLabel: { value: string };
      newPasswordHelp: { value: string };
      confirmPasswordLabel: { value: string };
      submit: { value: string };
    };
  };
  tx: (path: string[], fallback: string) => string;
  passwordMessage: string | null;
  passwordError: string | null;
  passwordLoading: boolean;
  passwords: Passwords;
  setPasswords: (p: Passwords) => void;
  handlePasswordSubmit: (e: FormEvent) => void;
};

export function PasswordSection({
  t,
  tx,
  passwordMessage,
  passwordError,
  passwordLoading,
  passwords,
  setPasswords,
  handlePasswordSubmit,
}: Props) {
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
}
