'use client';

import { Alert } from '@/app/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Spinner } from '@/app/components/ui/spinner';
import { ModeToggle } from '@/components/mode-toggle';

type Props = {
  t: {
    appearanceCard: {
      themeLabel: { value: string };
      themeHelp: { value: string };
      light: { value: string };
      dark: { value: string };
      active: { value: string };
      followsSystem: { value: string };
    };
  };
  tx: (path: string[], fallback: string) => string;
  appearanceMessage: string | null;
  appearanceError: string | null;
  appearanceLoading: boolean;
  themePreference: string;
  handleThemePreferenceChange: (v: string) => void;
};

export function AppearanceSection({
  t,
  tx,
  appearanceMessage,
  appearanceError,
  appearanceLoading,
  themePreference,
  handleThemePreferenceChange,
}: Props) {
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
          <p className="text-xs text-muted-foreground">{t.appearanceCard.followsSystem.value}</p>
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
