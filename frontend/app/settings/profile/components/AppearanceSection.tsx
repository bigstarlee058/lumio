'use client';

import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import type { ThemePreference } from '@/app/lib/theme-preference';
import { ModeToggle } from '@/components/mode-toggle';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
  themePreference: ThemePreference;
  handleThemePreferenceChange: (nextTheme: ThemePreference) => void | Promise<void>;
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
    <Stack spacing={2.5}>
      {appearanceMessage ? <Alert variant="success">{appearanceMessage}</Alert> : null}
      {appearanceError ? <Alert variant="error">{appearanceError}</Alert> : null}

      <Card variant="outlined">
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t.appearanceCard.themeLabel.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.appearanceCard.themeHelp.value}
          </Typography>
        </Box>
        <CardContent>
          <Stack spacing={2}>
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
            <Typography variant="caption" color="text.secondary">
              {t.appearanceCard.followsSystem.value}
            </Typography>
            {appearanceLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: 14,
                  color: 'text.secondary',
                }}
              >
                <Spinner size={16} />
                <span>{t.appearanceCard.active.value}</span>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
