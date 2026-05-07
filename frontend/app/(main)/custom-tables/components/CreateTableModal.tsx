'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface CreateTableForm {
  name: string;
  description: string;
  categoryId: string;
}

interface CreateTableModalProps {
  open: boolean;
  creating: boolean;
  canCreate: boolean;
  form: CreateTableForm;
  categories: Category[];
  namingHintLabel: string;
  labels: {
    title: string;
    name: string;
    namePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    category: string;
    noCategory: string;
    creating: string;
    create: string;
    cancel: string;
  };
  onClose: () => void;
  onFormChange: (patch: Partial<CreateTableForm>) => void;
  onSubmit: () => void;
}

export function CreateTableModal({
  open,
  creating,
  canCreate,
  form,
  categories,
  namingHintLabel,
  labels,
  onClose,
  onFormChange,
  onSubmit,
}: CreateTableModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{labels.title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label={labels.name}
              placeholder={labels.namePlaceholder}
              helperText={namingHintLabel}
              fullWidth
              value={form.name}
              onChange={e => onFormChange({ name: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              label={labels.description}
              placeholder={labels.descriptionPlaceholder}
              fullWidth
              value={form.description}
              onChange={e => onFormChange({ description: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>{labels.category}</InputLabel>
              <Select
                value={form.categoryId}
                label={labels.category}
                onChange={e => onFormChange({ categoryId: e.target.value })}
              >
                <MenuItem value="">
                  <em>{labels.noCategory}</em>
                </MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, bgcolor: c.color }} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} type="button">
          {labels.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={!canCreate || creating}
          onClick={onSubmit}
          type="button"
        >
          {creating ? labels.creating : labels.create}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
