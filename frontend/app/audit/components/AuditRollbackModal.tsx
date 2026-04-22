'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { JSX } from 'react';
import type { RollbackState } from '../hooks/useAuditRollback';

type MsgProps = { rollbackTarget: NonNullable<RollbackState['rollbackTarget']>; rollbackError: string | null };
function RollbackMessage({ rollbackTarget, rollbackError }: MsgProps): JSX.Element {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" style={{ color: '#4b5563' }}>
        This will attempt to rollback:{' '}
        {rollbackTarget.description || `${rollbackTarget.entityType} ${rollbackTarget.entityId}`}.
      </Typography>
      {rollbackTarget.diff && (
        <Alert severity="warning" sx={{ fontSize: 12 }}>
          Rollback is based on stored diff data. Review changes before continuing.
        </Alert>
      )}
      {rollbackError && (
        <Typography variant="body2" style={{ color: '#dc2626' }}>{rollbackError}</Typography>
      )}
    </Stack>
  );
}

export function AuditRollbackModal({ rollback }: { rollback: RollbackState }): JSX.Element {
  return (
    <ConfirmModal
      isOpen={Boolean(rollback.rollbackTarget)}
      onClose={rollback.cancelRollback}
      onConfirm={rollback.confirmRollback}
      title="Confirm rollback"
      message={rollback.rollbackTarget && <RollbackMessage rollbackTarget={rollback.rollbackTarget} rollbackError={rollback.rollbackError} />}
      confirmText={rollback.rollbackLoading ? 'Rolling back...' : 'Rollback'}
      cancelText="Cancel"
      isDestructive
      isLoading={rollback.rollbackLoading}
      manualClose
    />
  );
}
