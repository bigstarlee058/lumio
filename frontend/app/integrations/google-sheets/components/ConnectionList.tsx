'use client';

import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import type { GoogleSheetConnection } from '../useGoogleSheetsPage';
import { ConnectionCard } from './ConnectionCard';

interface ConnectionListTexts {
  list: {
    title: React.ReactNode;
    subtitle: React.ReactNode;
    empty: React.ReactNode;
    badges: { oauthNeeded: React.ReactNode; active: React.ReactNode };
    fields: { worksheetPrefix: { value: string }; lastSyncPrefix: { value: string } };
    actions: { authorize: React.ReactNode; sync: React.ReactNode; disconnect: React.ReactNode };
    dash: React.ReactNode;
  };
}

interface ConnectionListProps {
  connections: GoogleSheetConnection[];
  loadingList: boolean;
  emptyState: boolean;
  syncingId: string | null;
  removingId: string | null;
  locale: string;
  t: ConnectionListTexts;
  onAuthorize: () => void;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
}

function LoadingSkeleton(): JSX.Element {
  return (
    <Stack spacing={1}>
      {[1, 2].map(key => (
        <Box key={key} sx={{ borderRadius: 'var(--lumio-radius-lg)', border: '1px solid #f3f4f6', bgcolor: '#f9fafb', p: 1.5, height: 80, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      ))}
    </Stack>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ConnectionList({ connections, loadingList, emptyState, syncingId, removingId, locale, t, onAuthorize, onSync, onRemove }: ConnectionListProps): JSX.Element {
  return (
    <Box sx={{ borderRadius: 'var(--lumio-radius-lg)', border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 2, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} data-tour-id="gs-integration-list">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{t.list.title}</Typography>
        <Typography style={{ fontSize: 12, color: '#6b7280' }}>{t.list.subtitle}</Typography>
      </Box>
      {loadingList ? <LoadingSkeleton /> : emptyState ? (
        <Box sx={{ borderRadius: 'var(--lumio-radius-lg)', border: '1px dashed #e5e7eb', bgcolor: '#f9fafb', p: 2 }}>
          <Typography style={{ fontSize: 14, color: '#4b5563' }}>{t.list.empty}</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {[...connections.keys()].map(index => (
            <ConnectionCard
              key={connections[index].id}
              item={connections[index]}
              index={index}
              syncingId={syncingId}
              removingId={removingId}
              locale={locale}
              t={t}
              onAuthorize={onAuthorize}
              onSync={onSync}
              onRemove={onRemove}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
