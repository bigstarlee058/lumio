'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export interface BudgetItem {
  id: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string; color?: string; icon?: string | null };
  limitAmount: number;
  limitAmountWorkspace?: number;
  manualSpentAmount: number;
  currency: string;
  workspaceCurrency?: string;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  spentAmount: number;
  percentUsed: number;
  createdAt: string;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  limitAmount: number;
  manualSpentAmount: number;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
}

export type BudgetDrawerIntent = 'create' | 'edit' | 'spending';

const EMPTY_FORM: BudgetFormData = {
  name: '',
  categoryId: '',
  limitAmount: 0,
  manualSpentAmount: 0,
  periodType: 'monthly',
  currency: 'KZT',
};

export const toNonNegativeNumber = (value: unknown): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const toOptionalNonNegativeNumber = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : toNonNegativeNumber(value);

export const normalizeBudgetItem = (budget: BudgetItem): BudgetItem => ({
  ...budget,
  limitAmount: toNonNegativeNumber(budget.limitAmount),
  limitAmountWorkspace: toOptionalNonNegativeNumber(budget.limitAmountWorkspace),
  manualSpentAmount: toNonNegativeNumber(budget.manualSpentAmount),
  spentAmount: toNonNegativeNumber(budget.spentAmount),
  percentUsed: toNonNegativeNumber(budget.percentUsed),
});

export const buildBudgetUpdatePayload = (
  formData: BudgetFormData,
  intent: BudgetDrawerIntent,
): Partial<BudgetFormData> => {
  if (intent === 'spending') {
    return {
      manualSpentAmount: toNonNegativeNumber(formData.manualSpentAmount),
    };
  }

  return {
    name: formData.name,
    categoryId: formData.categoryId,
    limitAmount: toNonNegativeNumber(formData.limitAmount),
    manualSpentAmount: toNonNegativeNumber(formData.manualSpentAmount),
    currency: formData.currency,
    periodType: formData.periodType,
  };
};

export function useBudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [drawerIntent, setDrawerIntent] = useState<BudgetDrawerIntent>('create');
  const [formData, setFormData] = useState<BudgetFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/budgets');
      const data = res.data?.data ?? res.data ?? [];
      setBudgets(Array.isArray(data) ? data.map(normalizeBudgetItem) : []);
    } catch {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingBudget(null);
    setDrawerIntent('create');
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openBudgetDrawer = useCallback((budget: BudgetItem, intent: BudgetDrawerIntent) => {
    setEditingBudget(budget);
    setDrawerIntent(intent);
    setFormData({
      name: budget.name,
      categoryId: budget.categoryId,
      limitAmount: toNonNegativeNumber(budget.limitAmount),
      manualSpentAmount: toNonNegativeNumber(budget.manualSpentAmount),
      periodType: budget.periodType,
      currency: budget.currency,
    });
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback(
    (budget: BudgetItem) => {
      openBudgetDrawer(budget, 'edit');
    },
    [openBudgetDrawer],
  );

  const openSpendingUpdate = useCallback(
    (budget: BudgetItem) => {
      openBudgetDrawer(budget, 'spending');
    },
    [openBudgetDrawer],
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBudget(null);
    setDrawerIntent('create');
    setFormData(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (editingBudget) {
        await apiClient.put(
          `/budgets/${editingBudget.id}`,
          buildBudgetUpdatePayload(formData, drawerIntent),
        );
        toast.success('Budget updated');
      } else {
        await apiClient.post('/budgets', {
          ...formData,
          limitAmount: toNonNegativeNumber(formData.limitAmount),
          manualSpentAmount: toNonNegativeNumber(formData.manualSpentAmount),
        });
        toast.success('Budget created');
      }
      closeDialog();
      await load();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Failed to save budget');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [editingBudget, formData, drawerIntent, closeDialog, load]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/budgets/${id}`);
        toast.success('Budget deleted');
        await load();
      } catch {
        toast.error('Failed to delete budget');
      }
    },
    [load],
  );

  return {
    budgets,
    loading,
    error,
    dialogOpen,
    editingBudget,
    drawerIntent,
    formData,
    saving,
    setFormData,
    openCreate,
    openEdit,
    openSpendingUpdate,
    closeDialog,
    handleSave,
    handleDelete,
    refresh: load,
  };
}
