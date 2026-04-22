'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { Box, Stack, Typography } from '@mui/material';
import { AlertCircle, CheckCircle2, Plug, RefreshCcw, Trash2 } from 'lucide-react';
import type React from 'react';
import type { GoogleSheetConnection } from '../useGoogleSheetsPage';

interface ConnectionCardTexts {
  list: {
    badges: { oauthNeeded: React.ReactNode; active: React.ReactNode };
    fields: { worksheetPrefix: { value: string }; lastSyncPrefix: { value: string } };
    actions: { authorize: React.ReactNode; sync: React.ReactNode; disconnect: React.ReactNode };
    dash: React.ReactNode;
  };
}

interface ConnectionCardProps {
  item: GoogleSheetConnection;
  index: number;
  syncingId: string | null;
  removingId: string | null;
  locale: string;
  t: ConnectionCardTexts;
  onAuthorize: () => void;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
}

const LOCALE_MAP: Record<string, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' };

function formatLastSync({ lastSync, locale }: { lastSync: string | null | undefined; locale: string }): string {
  if (!lastSync) return '';
  return new Date(lastSync).toLocaleString(LOCALE_MAP[locale] ?? 'en-US');
}

function ConnectionStatus({ oauthConnected, t }: { oauthConnected: boolean | undefined; t: ConnectionCardTexts }): JSX.Element {
  if (oauthConnected === false) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--lumio-radius-sm)', bgcolor: '#fffbeb', px: 1, py: 0.25, fontSize: 11, fontWeight: 600, color: '#92400e', border: '1px solid #fde68a' }}>
        <AlertCircle style={{ height: 12, width: 12, marginRight: 4 }} /> {t.list.badges.oauthNeeded}
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--lumio-radius-sm)', bgcolor: '#ecfdf5', px: 1, py: 0.25, fontSize: 11, fontWeight: 600, color: '#065f46', border: '1px solid #d1fae5' }}>
      <CheckCircle2 style={{ height: 12, width: 12, marginRight: 4 }} /> {t.list.badges.active}
    </Box>
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export function ConnectionCard({ item, index, syncingId, removingId, locale, t, onAuthorize, onSync, onRemove }: ConnectionCardProps): JSX.Element {
  const isSyncing = syncingId === item.id;
  const isRemoving = removingId === item.id;
  const isDisabled = isSyncing || item.oauthConnected === false;
  const lastSyncText = item.lastSync ? formatLastSync({ lastSync: item.lastSync, locale }) : String(t.list.dash ?? '-');

  return (
    <Box sx={{ borderRadius: 'var(--lumio-radius-lg)', border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 1.5, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} data-tour-id={index === 0 ? 'gs-integration-connection-card' : undefined}>
      <Stack spacing={1.5}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography style={{ fontWeight: 600, color: '#111827' }}>{item.sheetName}</Typography>
            <ConnectionStatus oauthConnected={item.oauthConnected} t={t} />
          </Box>
          <Typography style={{ fontSize: 12, color: '#6b7280', marginTop: 4, wordBreak: 'break-all' }}>ID: {item.sheetId}</Typography>
          {item.worksheetName && <Typography style={{ fontSize: 12, color: '#6b7280' }}>{t.list.fields.worksheetPrefix.value}: {item.worksheetName}</Typography>}
          <Typography style={{ fontSize: 12, color: '#6b7280' }}>{t.list.fields.lastSyncPrefix.value}: {lastSyncText}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {item.oauthConnected === false && (
            <button type="button" onClick={onAuthorize} data-tour-id={index === 0 ? 'gs-integration-authorize' : undefined} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--lumio-radius-md)', border: '1px solid #fcd34d', background: '#fffbeb', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#78350f', cursor: 'pointer' }}>
              <Plug style={{ height: 16, width: 16 }} />{t.list.actions.authorize}
            </button>
          )}
          <button type="button" onClick={(): void => onSync(item.id)} disabled={isDisabled} data-tour-id={index === 0 ? 'gs-integration-sync' : undefined} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--lumio-radius-md)', border: '1px solid var(--color-primary)', background: 'transparent', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}>
            {isSyncing ? <Spinner size={16} /> : <RefreshCcw style={{ height: 16, width: 16 }} />}
            {t.list.actions.sync}
          </button>
          <button type="button" onClick={(): void => onRemove(item.id)} disabled={isRemoving} data-tour-id={index === 0 ? 'gs-integration-disconnect' : undefined} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--lumio-radius-md)', border: '1px solid #e5e7eb', background: 'transparent', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: isRemoving ? 'not-allowed' : 'pointer', opacity: isRemoving ? 0.6 : 1 }}>
            {isRemoving ? <Spinner size={16} /> : <Trash2 style={{ height: 16, width: 16 }} />}
            {t.list.actions.disconnect}
          </button>
        </Box>
      </Stack>
    </Box>
  );
}
