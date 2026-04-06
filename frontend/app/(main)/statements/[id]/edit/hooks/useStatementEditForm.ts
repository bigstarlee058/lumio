'use client';

import { useAutoSave } from '@/app/hooks/useAutoSave';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { payablesApi } from '@/app/lib/payables-api';
import {
  type StatementStage,
  type StatementStageAction,
  type StatementStageActionId,
  getStatementStage,
  isStageActionBlocked,
  setStatementStage,
} from '@/app/lib/statement-workflow';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  type BranchOption,
  type CategoryOption,
  type Statement,
  type Transaction,
  type WalletOption,
  formatDate,
  normalizeDateInput,
  normalizeNumberInput,
  parseNullableNumber,
} from '../editHelpers';
import { buildPayableFromStatement } from '../payable-from-statement';

interface UseStatementEditFormMessages {
  loadDataError: string;
  saveTransactionError: string;
  deleteTransactionError: string;
  updateTransactionsError: string;
  deleteTransactionsError: string;
  assignCategoryError: string;
  exportLoading: string;
  exportSuccess: string;
  exportFailure: string;
  exportDescription: string;
  statementNamePrefix: string;
  categoryUpdated: string;
  categoryUpdateFailed: string;
}

export interface UseStatementEditFormReturn {
  statement: Statement | null;
  setStatement: React.Dispatch<React.SetStateAction<Statement | null>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  loading: boolean;
  saving: boolean;
  exportingToTable: boolean;
  optionsLoading: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingRow: string | null;
  editedData: Record<string, Partial<Transaction>>;
  categories: CategoryOption[];
  branches: BranchOption[];
  wallets: WalletOption[];
  bulkCategoryDialogOpen: boolean;
  setBulkCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statementCategoryDrawerOpen: boolean;
  setStatementCategoryDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statementCategorySaving: boolean;
  stageActionLoadingId: StatementStageActionId | null;
  currentStage: StatementStage;
  bulkCategoryId: string;
  setBulkCategoryId: React.Dispatch<React.SetStateAction<string>>;
  metadataForm: {
    balanceStart: string;
    balanceEnd: string;
    statementDateFrom: string;
    statementDateTo: string;
  };
  setMetadataForm: React.Dispatch<
    React.SetStateAction<{
      balanceStart: string;
      balanceEnd: string;
      statementDateFrom: string;
      statementDateTo: string;
    }>
  >;
  exportConfirmOpen: boolean;
  setExportConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  parsingDetailsExpanded: boolean;
  setParsingDetailsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  balanceStartInputRef: React.RefObject<HTMLInputElement | null>;
  balanceEndInputRef: React.RefObject<HTMLInputElement | null>;
  loadData: () => Promise<void>;
  handleExportToCustomTable: () => Promise<void>;
  handleRowSelect: (id: string) => void;
  handleSelectAll: () => void;
  handleEdit: (transaction: Transaction) => void;
  handleFieldChange: (
    transactionId: string,
    field: keyof Transaction,
    value: Transaction[keyof Transaction],
  ) => void;
  handleSave: (transactionId: string) => Promise<void>;
  handleCancel: () => void;
  handleMetadataChange: (field: string, value: string) => void;
  handleResolveParsingWarning: (warning: string) => void;
  handleConvertDroppedSample: (
    sample: { transaction?: unknown },
    index: number,
    warning?: string,
  ) => Promise<void>;
  handleDelete: (transactionId: string) => Promise<void>;
  handleBulkUpdate: () => Promise<void>;
  handleBulkDelete: (confirmMessage: string) => Promise<void>;
  handleOpenBulkCategory: () => void;
  handleApplyBulkCategory: () => Promise<void>;
  handleStageAction: (
    action: StatementStageAction,
    stageActionToasts: Record<StatementStageActionId, string>,
    missingCategoryCount: number,
  ) => Promise<void>;
  handleStatementCategorySelect: (
    categoryId: string,
    flattenedStatementCategories: { id: string; name: string }[],
  ) => Promise<void>;
}

export function useStatementEditForm(
  statementId: string,
  user: { id: string } | null | undefined,
  router: { push: (path: string) => void },
  messages: UseStatementEditFormMessages,
): UseStatementEditFormReturn {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exportingToTable, setExportingToTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, Partial<Transaction>>>({});
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [statementCategoryDrawerOpen, setStatementCategoryDrawerOpen] = useState(false);
  const [statementCategorySaving, setStatementCategorySaving] = useState(false);
  const [stageActionLoadingId, setStageActionLoadingId] = useState<StatementStageActionId | null>(
    null,
  );
  const [currentStage, setCurrentStage] = useState<StatementStage>('submit');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [metadataForm, setMetadataForm] = useState({
    balanceStart: '',
    balanceEnd: '',
    statementDateFrom: '',
    statementDateTo: '',
  });
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [parsingDetailsExpanded, setParsingDetailsExpanded] = useState(true);
  const balanceStartInputRef = useRef<HTMLInputElement | null>(null);
  const balanceEndInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setOptionsLoading(true);
      const [statementRes, transactionsRes, categoriesRes, branchesRes, walletsRes] =
        await Promise.all([
          apiClient.get(`/statements/${statementId}`),
          apiClient.get(`/transactions?statement_id=${statementId}&limit=1000`),
          apiClient.get('/categories'),
          apiClient.get('/branches'),
          apiClient.get('/wallets'),
        ]);

      const statementData = statementRes.data?.data || statementRes.data;
      setStatement(statementData);

      const transactionsData = transactionsRes.data.data || transactionsRes.data;
      setTransactions(transactionsData);
      setCategories(categoriesRes.data?.data || categoriesRes.data || []);
      setBranches(branchesRes.data?.data || branchesRes.data || []);
      setWallets(walletsRes.data?.data || walletsRes.data || []);

      const extractedMeta = statementData?.parsingDetails?.metadataExtracted || {};
      setMetadataForm({
        balanceStart: normalizeNumberInput(
          statementData?.balanceStart ?? extractedMeta.balanceStart,
        ),
        balanceEnd: normalizeNumberInput(statementData?.balanceEnd ?? extractedMeta.balanceEnd),
        statementDateFrom: normalizeDateInput(
          statementData?.statementDateFrom ?? extractedMeta.dateFrom,
        ),
        statementDateTo: normalizeDateInput(statementData?.statementDateTo ?? extractedMeta.dateTo),
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.loadDataError));
    } finally {
      setLoading(false);
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (user && statementId) {
      setCurrentStage(getStatementStage(statementId));
      loadData();
    }
  }, [user, statementId]);

  const handleMetadataAutoSave = useCallback(
    async (formData: typeof metadataForm) => {
      try {
        const payload = {
          balanceStart: parseNullableNumber(formData.balanceStart),
          balanceEnd: parseNullableNumber(formData.balanceEnd),
          statementDateFrom: formData.statementDateFrom || null,
          statementDateTo: formData.statementDateTo || null,
        };
        const response = await apiClient.patch(`/statements/${statementId}`, payload);
        const updatedStatement = response.data?.data || response.data;
        setStatement(updatedStatement);
      } catch (err) {
        console.error('Metadata autosave failed:', err);
      }
    },
    [statementId],
  );

  useAutoSave({
    data: metadataForm,
    onSave: handleMetadataAutoSave,
    debounceMs: 500,
    enabled: Boolean(statementId && statement && !loading),
  });

  const handleExportToCustomTable = async () => {
    if (!statementId) return;
    setExportingToTable(true);
    const toastId = toast.loading(messages.exportLoading);

    if (!statement) {
      toast.error(messages.exportFailure, { id: toastId });
      setExportingToTable(false);
      return;
    }

    try {
      const rawName = `${messages.statementNamePrefix}${statement.fileName}`;
      const MAX_NAME_LENGTH = 120;
      const name = rawName.length > MAX_NAME_LENGTH ? rawName.slice(0, MAX_NAME_LENGTH) : rawName;

      const description = messages.exportDescription
        .replace('{{dateFrom}}', formatDate(statement.statementDateFrom))
        .replace('{{dateTo}}', formatDate(statement.statementDateTo));

      const payload = {
        statementIds: [statementId],
        name,
        description,
      };

      const response = await apiClient.post('/custom-tables/from-statements', payload);
      const tableId = response?.data?.tableId || response?.data?.id;

      if (tableId) {
        toast.success(messages.exportSuccess, { id: toastId });
        router.push(`/custom-tables/${tableId}`);
      } else {
        toast.error(messages.exportFailure, { id: toastId });
        router.push('/custom-tables');
      }
    } catch (err) {
      console.error('Export to custom table failed:', err);
      toast.error(messages.exportFailure, { id: toastId });
    } finally {
      setExportingToTable(false);
    }
  };

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === transactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map(t => t.id)));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingRow(transaction.id);
    setEditedData({ [transaction.id]: { ...transaction } });
  };

  const handleFieldChange = (
    transactionId: string,
    field: keyof Transaction,
    value: Transaction[keyof Transaction],
  ) => {
    setEditedData({
      ...editedData,
      [transactionId]: {
        ...editedData[transactionId],
        [field]: value,
      },
    });
  };

  const handleSave = async (transactionId: string) => {
    try {
      const updates = editedData[transactionId];
      await apiClient.patch(`/transactions/${transactionId}`, updates);
      setTransactions(prev => prev.map(t => (t.id === transactionId ? { ...t, ...updates } : t)));
      setEditingRow(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.saveTransactionError));
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm(prev => ({ ...prev, [field]: value }));
  };

  const handleResolveParsingWarning = useCallback((warning: string) => {
    setParsingDetailsExpanded(true);
    const target = /balance mismatch/i.test(warning)
      ? balanceEndInputRef.current || balanceStartInputRef.current
      : null;
    if (target) {
      window.setTimeout(() => {
        if (typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        target.focus();
      }, 0);
    }
  }, []);

  const handleConvertDroppedSample = useCallback(
    async (sample: { transaction?: unknown }, index: number, warning?: string) => {
      const response = await apiClient.post(`/statements/${statementId}/convert-dropped-sample`, {
        index,
        warning,
        transaction: sample.transaction,
      });

      const updatedStatement = response.data?.statement || response.data?.data?.statement;
      const createdTransaction = response.data?.transaction || response.data?.data?.transaction;

      if (updatedStatement) setStatement(updatedStatement);

      if (createdTransaction) {
        setTransactions(prev => [createdTransaction, ...prev]);
      } else {
        await loadData();
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    [statementId],
  );

  const handleDelete = async (transactionId: string) => {
    try {
      await apiClient.delete(`/transactions/${transactionId}`);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.deleteTransactionError));
    }
  };

  const handleBulkUpdate = async () => {
    try {
      setSaving(true);
      const updates = Array.from(selectedRows)
        .filter(id => editedData[id])
        .map(id => ({ id, updates: editedData[id] }));
      await apiClient.patch('/transactions/bulk', { items: updates });
      await loadData();
      setSelectedRows(new Set());
      setEditedData({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.updateTransactionsError));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async (confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    try {
      setSaving(true);
      await apiClient.post('/transactions/bulk-delete', { ids: Array.from(selectedRows) });
      setTransactions(prev => prev.filter(t => !selectedRows.has(t.id)));
      setSelectedRows(new Set());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.deleteTransactionsError));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBulkCategory = () => {
    if (selectedRows.size === 0) return;
    setBulkCategoryDialogOpen(true);
  };

  const handleApplyBulkCategory = async () => {
    if (!bulkCategoryId) return;
    try {
      setSaving(true);
      const items = Array.from(selectedRows).map(id => ({
        id,
        updates: { categoryId: bulkCategoryId },
      }));
      await apiClient.patch('/transactions/bulk', { items });
      await loadData();
      setSelectedRows(new Set());
      setBulkCategoryDialogOpen(false);
      setBulkCategoryId('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, messages.assignCategoryError));
    } finally {
      setSaving(false);
    }
  };

  const handleStageAction = async (
    action: StatementStageAction,
    stageActionToasts: Record<StatementStageActionId, string>,
    missingCategoryCount: number,
  ) => {
    if (!statement?.id) return;
    if (isStageActionBlocked(action.id, missingCategoryCount)) return;
    setStageActionLoadingId(action.id);
    try {
      if (action.id === 'pay') {
        const payableDraft = buildPayableFromStatement({ statement, transactions });
        if (!payableDraft) {
          toast.error('No expense amount available to create payable');
          setStageActionLoadingId(null);
          return;
        }
        await payablesApi.create(payableDraft);
      }
      setStatementStage(statement.id, action.nextStage);
      setCurrentStage(action.nextStage);
      setStageActionLoadingId(null);
      toast.success(stageActionToasts[action.id]);
      router.push(action.redirectPath);
    } catch (err) {
      console.error('Failed to process stage action:', err);
      setStageActionLoadingId(null);
      toast.error(action.id === 'pay' ? 'Failed to create payable' : 'Failed to update stage');
    }
  };

  const handleStatementCategorySelect = async (
    categoryId: string,
    flattenedStatementCategories: { id: string; name: string }[],
  ) => {
    if (!statement?.id || statementCategorySaving) return;
    try {
      setStatementCategorySaving(true);
      const response = await apiClient.patch(`/storage/files/${statement.id}/category`, {
        categoryId: categoryId || null,
      });
      const selectedCategory =
        response.data?.category ||
        flattenedStatementCategories.find(cat => cat.id === categoryId) ||
        null;
      setStatement(prev =>
        prev
          ? {
              ...prev,
              categoryId: response.data?.categoryId ?? (categoryId || null),
              category: selectedCategory,
            }
          : prev,
      );
      toast.success(messages.categoryUpdated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '') || messages.categoryUpdateFailed);
    } finally {
      setStatementCategorySaving(false);
    }
  };

  return {
    statement,
    setStatement,
    transactions,
    setTransactions,
    loading,
    saving,
    exportingToTable,
    optionsLoading,
    error,
    setError,
    success,
    setSuccess,
    selectedRows,
    setSelectedRows,
    editingRow,
    editedData,
    categories,
    branches,
    wallets,
    bulkCategoryDialogOpen,
    setBulkCategoryDialogOpen,
    statementCategoryDrawerOpen,
    setStatementCategoryDrawerOpen,
    statementCategorySaving,
    stageActionLoadingId,
    currentStage,
    bulkCategoryId,
    setBulkCategoryId,
    metadataForm,
    setMetadataForm,
    exportConfirmOpen,
    setExportConfirmOpen,
    parsingDetailsExpanded,
    setParsingDetailsExpanded,
    balanceStartInputRef,
    balanceEndInputRef,
    loadData,
    handleExportToCustomTable,
    handleRowSelect,
    handleSelectAll,
    handleEdit,
    handleFieldChange,
    handleSave,
    handleCancel,
    handleMetadataChange,
    handleResolveParsingWarning,
    handleConvertDroppedSample,
    handleDelete,
    handleBulkUpdate,
    handleBulkDelete,
    handleOpenBulkCategory,
    handleApplyBulkCategory,
    handleStageAction,
    handleStatementCategorySelect,
  };
}
