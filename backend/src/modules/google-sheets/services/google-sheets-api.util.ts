export function mapTransactionsToValues<
  TTransaction extends {
    categoryId?: string | null;
    branchId?: string | null;
    walletId?: string | null;
  },
  TCategory,
  TBranch,
  TWallet,
  TRow,
  TValue,
>(
  transactions: TTransaction[],
  categories: Map<string, TCategory>,
  branches: Map<string, TBranch>,
  wallets: Map<string, TWallet>,
  mapTransactionToRow: (
    transaction: TTransaction,
    category: TCategory | null,
    branch: TBranch | null,
    wallet: TWallet | null,
  ) => TRow,
  rowToValues: (row: TRow) => TValue,
): TValue[] {
  return transactions.map(transaction => {
    const category = transaction.categoryId ? categories.get(transaction.categoryId) || null : null;
    const branch = transaction.branchId ? branches.get(transaction.branchId) || null : null;
    const wallet = transaction.walletId ? wallets.get(transaction.walletId) || null : null;

    return rowToValues(mapTransactionToRow(transaction, category, branch, wallet));
  });
}

export function isRetryableCredentialError(error: { code?: number; message?: string } | null | undefined): boolean {
  return error?.code === 401 || error?.message?.includes('Invalid Credentials') === true;
}

export function createSheetWriteContext<TSheets>(
  accessToken: string,
  worksheetName: string | null,
  getSheetsClient: (accessToken: string) => TSheets,
): {
  sheets: TSheets;
  sheetName: string;
  range: string;
} {
  const sheetName = worksheetName || 'Sheet1';
  return {
    sheets: getSheetsClient(accessToken),
    sheetName,
    range: `${sheetName}!A:S`,
  };
}
