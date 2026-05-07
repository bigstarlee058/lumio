'use client';

import { ChevronLeft } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import apiClient from '@/app/lib/api';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';

type CategoryOption = { id: string; name: string; type: string };

interface BudgetFormDrawerProps {
  open: boolean;
  editing: BudgetItem | null;
  formData: BudgetFormData;
  saving: boolean;
  onFormChange: (data: BudgetFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

type FieldChange = { field: keyof BudgetFormData; value: string | number };
type FormFieldsProps = Pick<BudgetFormDrawerProps, 'editing' | 'formData'> & {
  categories: CategoryOption[];
  onChange: (change: FieldChange) => void;
};

function useExpenseCategories(open: boolean): CategoryOption[] {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    apiClient
      .get('/categories')
      .then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setCategories(data.filter((category: CategoryOption) => category.type === 'expense'));
      })
      .catch(() => {
        setCategories([]);
      });
  }, [open]);

  return categories;
}

function DrawerTitle({
  editing,
  onClose,
}: Pick<BudgetFormDrawerProps, 'editing' | 'onClose'>): React.JSX.Element {
  return (
    <div className="lumio-payable-drawer__title-wrap">
      <button
        type="button"
        onClick={onClose}
        className="lumio-payable-drawer__back-btn"
        aria-label="Cancel"
      >
        <ChevronLeft size={20} />
      </button>
      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
        {editing ? 'Edit Budget' : 'New Budget'}
      </span>
    </div>
  );
}

function CategoryField({
  value,
  disabled,
  categories,
  onChange,
}: {
  value: string;
  disabled: boolean;
  categories: CategoryOption[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <FormControl fullWidth>
      <InputLabel>Category</InputLabel>
      <Select
        value={value}
        label="Category"
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        {categories.map(category => (
          <MenuItem key={category.id} value={category.id}>
            {category.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function PeriodField({
  value,
  disabled,
  onChange,
}: {
  value: BudgetFormData['periodType'];
  disabled: boolean;
  onChange: (value: BudgetFormData['periodType']) => void;
}): React.JSX.Element {
  return (
    <FormControl fullWidth>
      <InputLabel>Period</InputLabel>
      <Select
        value={value}
        label="Period"
        onChange={event => onChange(event.target.value as BudgetFormData['periodType'])}
        disabled={disabled}
      >
        <MenuItem value="weekly">Weekly</MenuItem>
        <MenuItem value="monthly">Monthly</MenuItem>
        <MenuItem value="quarterly">Quarterly</MenuItem>
        <MenuItem value="annual">Annual</MenuItem>
      </Select>
    </FormControl>
  );
}

function NameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Name"
      value={value}
      onChange={event => onChange(event.target.value)}
      fullWidth
    />
  );
}

function LimitAmountField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Limit Amount"
      type="number"
      value={value || ''}
      onChange={event => onChange(Number(event.target.value))}
      fullWidth
      inputProps={{ min: 0, step: 1000 }}
    />
  );
}

function FormFields({
  editing,
  formData,
  categories,
  onChange,
}: FormFieldsProps): React.JSX.Element {
  const isEditing = Boolean(editing);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <NameField value={formData.name} onChange={value => onChange({ field: 'name', value })} />
      <CategoryField
        value={formData.categoryId}
        disabled={isEditing}
        categories={categories}
        onChange={value => onChange({ field: 'categoryId', value })}
      />
      <LimitAmountField
        value={formData.limitAmount}
        onChange={value => onChange({ field: 'limitAmount', value })}
      />
      <PeriodField
        value={formData.periodType}
        disabled={isEditing}
        onChange={value => onChange({ field: 'periodType', value })}
      />
    </div>
  );
}

function DrawerFooter({
  saving,
  onSave,
  onClose,
  canSave,
}: Pick<BudgetFormDrawerProps, 'saving' | 'onSave' | 'onClose'> & {
  canSave: boolean;
}): React.JSX.Element {
  return (
    <div className="lumio-payable-drawer__footer">
      <Button variant="outlined" sx={{ flex: 1 }} onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button variant="contained" sx={{ flex: 1 }} onClick={onSave} disabled={saving || !canSave}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

function DrawerBody({
  editing,
  formData,
  saving,
  onSave,
  onClose,
  categories,
  onChange,
}: Pick<BudgetFormDrawerProps, 'editing' | 'formData' | 'saving' | 'onSave' | 'onClose'> & {
  categories: CategoryOption[];
  onChange: (change: FieldChange) => void;
}): React.JSX.Element {
  const canSave = Boolean(formData.name.trim() && formData.categoryId && formData.limitAmount > 0);

  return (
    <div className="lumio-payable-drawer__body">
      <FormFields
        editing={editing}
        formData={formData}
        categories={categories}
        onChange={onChange}
      />
      <DrawerFooter saving={saving} onSave={onSave} onClose={onClose} canSave={canSave} />
    </div>
  );
}

export function BudgetFormDrawer(props: BudgetFormDrawerProps): React.JSX.Element {
  const categories = useExpenseCategories(props.open);
  const handleChange = useCallback(
    (change: FieldChange): void => {
      props.onFormChange({ ...props.formData, [change.field]: change.value });
    },
    [props],
  );

  return (
    <DrawerShell
      isOpen={props.open}
      onClose={props.onClose}
      position="right"
      width="lg"
      showCloseButton={false}
      sx={{
        maxWidth: '100%',
        borderLeft: 0,
        bgcolor: 'background.paper',
        '@media (min-width:600px)': { maxWidth: 512 },
      }}
      title={<DrawerTitle editing={props.editing} onClose={props.onClose} />}
    >
      <DrawerBody {...props} categories={categories} onChange={handleChange} />
    </DrawerShell>
  );
}
