'use client';

import { Alert } from '@/app/components/ui/alert';
import {
  type NotificationPreferences,
  systemNotificationSettings,
  workspaceNotificationSettings,
} from '@/app/settings/profile/profileHelpers';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type NotificationKey = keyof NotificationPreferences;
type NotificationItem = { label: string; description: string };
type ToggleNotificationPreference = (key: NotificationKey, value: boolean) => Promise<void>;

type Props = {
  tx: (path: string[], fallback: string) => string;
  notificationError: string | null;
  notificationMessage: string | null;
  notificationsLoading: boolean;
  notificationPreferences: NotificationPreferences;
  notificationSavingKey: NotificationKey | null;
  toggleNotificationPreference: ToggleNotificationPreference;
};

function NotificationSettingRow({
  settingKey,
  item,
  checked,
  saving,
  onToggle,
}: {
  settingKey: NotificationKey;
  item: NotificationItem;
  checked: boolean;
  saving: boolean;
  onToggle: ToggleNotificationPreference;
}) {
  const inputId = `pref-${settingKey}`;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        borderRadius: 'var(--lumio-radius-lg)',
        border: '1px solid',
        borderColor: 'divider',
        p: 1.5,
      }}
    >
      <Stack spacing={0.25}>
        <Typography
          component="label"
          htmlFor={inputId}
          variant="body2"
          sx={{ fontWeight: 500, color: 'text.primary', cursor: 'pointer' }}
        >
          {item.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.description}
        </Typography>
      </Stack>
      <Checkbox
        id={inputId}
        checked={checked}
        onChange={(_e, val) => void onToggle(settingKey, val)}
        disabled={saving}
        aria-label={item.label}
        size="small"
        color="primary"
        sx={{ mt: -0.5 }}
      />
    </Box>
  );
}

const NOTIFICATION_KEYS = [
  'statementUploaded',
  'importCommitted',
  'categoryChanges',
  'memberActivity',
  'dataDeleted',
  'workspaceUpdated',
  'parsingErrors',
  'importFailures',
  'uncategorizedItems',
] as const;

export function NotificationsSection({
  tx,
  notificationError,
  notificationMessage,
  notificationsLoading,
  notificationPreferences,
  notificationSavingKey,
  toggleNotificationPreference,
}: Props) {
  const labels = {
    loading: tx(['notificationsCard', 'loading'], ''),
    workspaceTitle: tx(['notificationsCard', 'workspace', 'title'], ''),
    workspaceDescription: tx(['notificationsCard', 'workspace', 'description'], ''),
    systemTitle: tx(['notificationsCard', 'system', 'title'], ''),
    systemDescription: tx(['notificationsCard', 'system', 'description'], ''),
    items: Object.fromEntries(
      NOTIFICATION_KEYS.map(key => [
        key,
        {
          label: tx(['notificationsCard', 'items', key, 'label'], ''),
          description: tx(['notificationsCard', 'items', key, 'description'], ''),
        },
      ]),
    ) as Record<string, NotificationItem>,
  };

  return (
    <Stack spacing={2}>
      {notificationError ? <Alert variant="error">{notificationError}</Alert> : null}
      {notificationMessage ? <Alert variant="success">{notificationMessage}</Alert> : null}

      {notificationsLoading ? (
        <Box
          sx={{
            borderRadius: 'var(--lumio-radius-lg)',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 2.5,
            fontSize: 14,
            color: 'text.secondary',
          }}
        >
          {labels.loading}
        </Box>
      ) : (
        <>
          <Card variant="outlined">
            <Box sx={{ px: 2, pt: 2, pb: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {labels.workspaceTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {labels.workspaceDescription}
              </Typography>
            </Box>
            <CardContent>
              <Stack spacing={2}>
                {workspaceNotificationSettings.map(setting => (
                  <NotificationSettingRow
                    key={setting.key}
                    settingKey={setting.key}
                    item={labels.items[setting.key]}
                    checked={notificationPreferences[setting.key]}
                    saving={notificationSavingKey === setting.key}
                    onToggle={toggleNotificationPreference}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <Box sx={{ px: 2, pt: 2, pb: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {labels.systemTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {labels.systemDescription}
              </Typography>
            </Box>
            <CardContent>
              <Stack spacing={2}>
                {systemNotificationSettings.map(setting => (
                  <NotificationSettingRow
                    key={setting.key}
                    settingKey={setting.key}
                    item={labels.items[setting.key]}
                    checked={notificationPreferences[setting.key]}
                    saving={notificationSavingKey === setting.key}
                    onToggle={toggleNotificationPreference}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
