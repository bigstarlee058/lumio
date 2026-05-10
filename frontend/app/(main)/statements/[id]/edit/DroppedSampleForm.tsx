import { Box, Button, DialogActions, DialogContent, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import type { DroppedSampleDraft } from './helpers/warning-formatters';

interface DroppedSampleFormProps {
  selectedWarning: string;
  entryKey: string;
  draft: DroppedSampleDraft;
  canConvert: boolean;
  isConverting: boolean;
  onUpdateDraft: (payload: { field: keyof DroppedSampleDraft; value: string }) => void;
  onOpenCurrencyPicker: () => void;
  onCancel: () => void;
  onConvert: () => void;
}

type FieldsProps = {
  entryKey: string;
  draft: DroppedSampleDraft;
  onUpdateDraft: (payload: { field: keyof DroppedSampleDraft; value: string }) => void;
  onOpenCurrencyPicker: () => void;
};

function DroppedSampleFields({
  entryKey,
  draft,
  onUpdateDraft,
  onOpenCurrencyPicker,
}: FieldsProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 1.5,
      }}
    >
      <DatePicker
        label="Date"
        value={draft.transactionDate ? parseISO(draft.transactionDate) : null}
        onChange={(date: Date | null) =>
          onUpdateDraft({
            field: 'transactionDate',
            value: date && isValid(date) ? format(date, 'yyyy-MM-dd') : '',
          })
        }
        slotProps={{
          textField: {
            size: 'small',
            fullWidth: true,
            name: `droppedSamples.${entryKey}.transactionDate`,
          } as never,
        }}
      />
      <TextField
        size="small"
        label="Counterparty"
        name={`droppedSamples.${entryKey}.counterpartyName`}
        value={draft.counterpartyName}
        onChange={event => onUpdateDraft({ field: 'counterpartyName', value: event.target.value })}
      />
      <TextField
        size="small"
        label="Payment purpose"
        name={`droppedSamples.${entryKey}.paymentPurpose`}
        value={draft.paymentPurpose}
        onChange={event => onUpdateDraft({ field: 'paymentPurpose', value: event.target.value })}
      />
      <TextField
        size="small"
        label="Currency"
        name={`droppedSamples.${entryKey}.currency`}
        value={draft.currency}
        onClick={onOpenCurrencyPicker}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault();
            onOpenCurrencyPicker();
          }
        }}
        InputProps={{ readOnly: true }}
        sx={{ '& .MuiInputBase-input': { cursor: 'pointer' } }}
      />
      <TextField
        size="small"
        type="number"
        label="Debit"
        name={`droppedSamples.${entryKey}.debit`}
        value={draft.debit}
        onChange={event => onUpdateDraft({ field: 'debit', value: event.target.value })}
      />
      <TextField
        size="small"
        type="number"
        label="Credit"
        name={`droppedSamples.${entryKey}.credit`}
        value={draft.credit}
        onChange={event => onUpdateDraft({ field: 'credit', value: event.target.value })}
      />
    </Box>
  );
}

export function DroppedSampleForm({
  selectedWarning,
  entryKey,
  draft,
  canConvert,
  isConverting,
  onUpdateDraft,
  onOpenCurrencyPicker,
  onCancel,
  onConvert,
}: DroppedSampleFormProps): React.ReactElement {
  return (
    <>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {selectedWarning}
        </Typography>
        <DroppedSampleFields
          entryKey={entryKey}
          draft={draft}
          onUpdateDraft={onUpdateDraft}
          onOpenCurrencyPicker={onOpenCurrencyPicker}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Fill in a valid date and either debit or credit to convert this row.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={!canConvert || isConverting} onClick={onConvert}>
          Convert to transaction
        </Button>
      </DialogActions>
    </>
  );
}
