'use client';

import { Alert } from '@/app/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  systemNotificationSettings,
  workspaceNotificationSettings,
} from '@/app/settings/profile/profileHelpers';

type NotificationItem = { label: string; description: string };

type Props = {
  tx: (path: string[], fallback: string) => string;
  notificationError: string | null;
  notificationMessage: string | null;
  notificationsLoading: boolean;
  notificationPreferences: Record<string, boolean>;
  notificationSavingKey: string | null;
  toggleNotificationPreference: (key: string, checked: boolean | 'indeterminate') => Promise<void>;
};

function NotificationSettingRow({
  settingKey,
  item,
  checked,
  saving,
  onToggle,
}: {
  settingKey: string;
  item: NotificationItem;
  checked: boolean;
  saving: boolean;
  onToggle: (key: string, checked: boolean | 'indeterminate') => Promise<void>;
}) {
  const inputId = `pref-${settingKey}`;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {item.label}
        </label>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      <Checkbox
        id={inputId}
        checked={checked}
        onCheckedChange={value => void onToggle(settingKey, value)}
        disabled={saving}
        aria-label={item.label}
      />
    </div>
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
    <div className="space-y-4">
      {notificationError ? <Alert variant="error">{notificationError}</Alert> : null}
      {notificationMessage ? <Alert variant="success">{notificationMessage}</Alert> : null}

      {notificationsLoading ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-5 text-sm text-muted-foreground">
          {labels.loading}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{labels.workspaceTitle}</CardTitle>
              <CardDescription>{labels.workspaceDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{labels.systemTitle}</CardTitle>
              <CardDescription>{labels.systemDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
