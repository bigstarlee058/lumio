import { labelValue } from '../editHelpers';

type Labels = Record<string, { value?: string } | undefined>;

type PageContent = {
  labels: Record<string, { value?: string; toString?: () => string } | string | undefined>;
  errors: { loadData: { value: string }; saveTransaction: { value: string }; deleteTransaction: { value: string }; updateTransactions: { value: string }; deleteTransactions: { value: string }; assignCategory: { value: string } };
};

type Messages = {
  loadDataError: string; saveTransactionError: string; deleteTransactionError: string;
  updateTransactionsError: string; deleteTransactionsError: string; assignCategoryError: string;
  exportLoading: string; exportSuccess: string; exportFailure: string; exportDescription: string;
  statementNamePrefix: string; categoryUpdated: string; categoryUpdateFailed: string;
};

export function buildMessages(t: PageContent, labels: Labels): Messages {
  const tl = t.labels as Labels;
  return {
    loadDataError: t.errors.loadData.value,
    saveTransactionError: t.errors.saveTransaction.value,
    deleteTransactionError: t.errors.deleteTransaction.value,
    updateTransactionsError: t.errors.updateTransactions.value,
    deleteTransactionsError: t.errors.deleteTransactions.value,
    assignCategoryError: t.errors.assignCategory.value,
    exportLoading: labelValue(tl.exportLoading, 'Exporting...'),
    exportSuccess: labelValue(tl.exportSuccess, 'Exported successfully'),
    exportFailure: labelValue(tl.exportFailure, 'Export failed'),
    exportDescription: labelValue(tl.exportDescription, ''),
    statementNamePrefix: labelValue(tl.statementNamePrefix, ''),
    categoryUpdated: labelValue(labels.categoryUpdated, 'Category updated'),
    categoryUpdateFailed: labelValue(labels.categoryUpdateFailed, 'Failed to update category'),
  };
}

type HeaderT = { labels: { back: string; transactionsCount: { value?: string }; requireCategory: { value: string }; selectCategoryHint: { value: string }; disabledSuffix: { value: string }; exportButton: { value: string } } };

export function buildHeaderT(t: PageContent): HeaderT {
  const tl = t.labels as Labels;
  return {
    labels: {
      back: labelValue(tl.back, 'Back'),
      transactionsCount: { value: labelValue(tl.transactionsCount, 'transactions') },
      requireCategory: { value: labelValue(tl.requireCategory, '{count} require a category') },
      selectCategoryHint: { value: labelValue(tl.selectCategoryHint, 'Assign categories to continue') },
      disabledSuffix: { value: labelValue(tl.disabledSuffix, ' (disabled)') },
      exportButton: { value: labelValue(tl.exportButton, 'Export to table') },
    },
  };
}

type ExportDialogLabels = { exportConfirmTitle: { value: string }; exportConfirmBody: { value: string }; cancel: { value: string }; exportConfirmConfirm: { value: string } };

export function buildExportDialogLabels(t: PageContent): ExportDialogLabels {
  const tl = t.labels as Labels;
  return {
    exportConfirmTitle: { value: labelValue(tl.exportConfirmTitle, 'Export to table') },
    exportConfirmBody: { value: labelValue(tl.exportConfirmBody, 'This will create a new custom table.') },
    cancel: { value: labelValue(tl.cancel, 'Cancel') },
    exportConfirmConfirm: { value: labelValue(tl.exportConfirmConfirm, 'Export') },
  };
}

export function buildCategoryDrawerLabels(labels: Labels): { title: string; searchPlaceholder: string; allOption: string; noResults: string } {
  return {
    title: labelValue(labels.categoryDrawerTitle, 'Category'),
    searchPlaceholder: labelValue(labels.categorySearchPlaceholder, 'Search'),
    allOption: labelValue(labels.categoryAllOption, 'All'),
    noResults: labelValue(labels.categoryNoResults, 'No categories found'),
  };
}

export function buildUiLabels(t: PageContent, labels: Labels): {
  headerT: ReturnType<typeof buildHeaderT>;
  exportDialog: ReturnType<typeof buildExportDialogLabels>;
  categoryDrawer: ReturnType<typeof buildCategoryDrawerLabels>;
  changesSaved: string;
} {
  return {
    headerT: buildHeaderT(t),
    exportDialog: buildExportDialogLabels(t),
    categoryDrawer: buildCategoryDrawerLabels(labels),
    changesSaved: labelValue(labels.changesSaved, 'Changes saved'),
  };
}
