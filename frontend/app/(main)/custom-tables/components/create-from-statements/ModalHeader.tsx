'use client';

import { DialogTitle, Typography } from '@mui/material';
import type { CreateFromStatementsModalLabels, FormatLabelFn } from '../CreateFromStatementsModal';

interface ModalHeaderProps {
  step: 1 | 2;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
}

export function ModalHeader({ step, labels, formatLabel }: ModalHeaderProps): React.JSX.Element {
  return (
    <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2.5 }}>
      <Typography style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)' }}>
        {labels.title}
      </Typography>
      <Typography style={{ marginTop: 4, fontSize: 14, color: 'var(--muted-foreground)' }}>
        {formatLabel({ template: labels.stepCounter, values: { current: step, total: 2 } })}
      </Typography>
    </DialogTitle>
  );
}
