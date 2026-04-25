'use client';

import { Box, Grid, TextField, Typography } from '@mui/material';
import type {
  CreateFromStatementsForm,
  CreateFromStatementsModalLabels,
  FormatLabelFn,
  SelectedStatementSummary,
  StatementOption,
} from './types';

function PreviewItem({ option }: { option: StatementOption }): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        px: 1,
        py: 0.5,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--foreground)' }}>
        {option.title}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)', flexShrink: 0, marginLeft: 8 }}>
        {option.rowsLabel}
      </span>
    </Box>
  );
}

interface PreviewStatsProps {
  selectedStatementSummary: SelectedStatementSummary;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
}

function PreviewStats({ selectedStatementSummary, labels, formatLabel }: PreviewStatsProps): React.JSX.Element {
  return (
    <>
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
        {labels.previewTitle}
      </Typography>
      <Typography style={{ marginTop: 4, fontSize: 14, color: 'var(--foreground)' }}>
        {formatLabel({ template: labels.previewSummary, values: { statements: selectedStatementSummary.selectedCount } })}
      </Typography>
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
        {formatLabel({ template: labels.previewRows, values: { rows: selectedStatementSummary.totalRows } })}
      </Typography>
      <Typography style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>
        {labels.previewEditable}
      </Typography>
    </>
  );
}

interface SelectionPreviewProps {
  selectedStatementSummary: SelectedStatementSummary;
  selectedStatementPreviewItems: StatementOption[];
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
}

function SelectionPreview({
  selectedStatementSummary,
  selectedStatementPreviewItems,
  labels,
  formatLabel,
}: SelectionPreviewProps): React.JSX.Element {
  return (
    <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'var(--muted)', p: 1.5 }}>
      <PreviewStats
        selectedStatementSummary={selectedStatementSummary}
        labels={labels}
        formatLabel={formatLabel}
      />
      <Box sx={{ mt: 1.5, maxHeight: 128, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {selectedStatementPreviewItems.map(option => (
          <PreviewItem key={option.representativeId} option={option} />
        ))}
      </Box>
    </Box>
  );
}

interface Step2FormFieldsProps {
  form: CreateFromStatementsForm;
  namingHintLabel: string;
  labels: CreateFromStatementsModalLabels;
  onFormChange: (patch: Partial<CreateFromStatementsForm>) => void;
}

function Step2FormFields({ form, namingHintLabel, labels, onFormChange }: Step2FormFieldsProps): React.JSX.Element {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          label={labels.nameOptional}
          placeholder={labels.namePlaceholder}
          helperText={namingHintLabel}
          fullWidth
          size="small"
          value={form.name}
          onChange={e => onFormChange({ name: e.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <TextField
          label={labels.descriptionOptional}
          placeholder={labels.descriptionPlaceholder}
          fullWidth
          size="small"
          value={form.description}
          onChange={e => onFormChange({ description: e.target.value })}
        />
      </Grid>
    </Grid>
  );
}

export interface Step2ContentProps {
  form: CreateFromStatementsForm;
  namingHintLabel: string;
  selectedStatementSummary: SelectedStatementSummary;
  selectedStatementPreviewItems: StatementOption[];
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onFormChange: (patch: Partial<CreateFromStatementsForm>) => void;
}

export function Step2Content({
  form,
  namingHintLabel,
  selectedStatementSummary,
  selectedStatementPreviewItems,
  labels,
  formatLabel,
  onFormChange,
}: Step2ContentProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {labels.step2Description}
      </Typography>
      <Step2FormFields
        form={form}
        namingHintLabel={namingHintLabel}
        labels={labels}
        onFormChange={onFormChange}
      />
      <SelectionPreview
        selectedStatementSummary={selectedStatementSummary}
        selectedStatementPreviewItems={selectedStatementPreviewItems}
        labels={labels}
        formatLabel={formatLabel}
      />
    </Box>
  );
}
