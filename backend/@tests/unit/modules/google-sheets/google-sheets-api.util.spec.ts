import {
  createSheetWriteContext,
  isRetryableCredentialError,
  mapTransactionsToValues,
} from '@/modules/google-sheets/services/google-sheets-api.util';

type TestTransaction = {
  categoryId?: string | null;
  branchId?: string | null;
  walletId?: string | null;
};

type NamedItem = { name: string };
type MappedRow = {
  transaction: TestTransaction;
  category: NamedItem | null;
  branch: NamedItem | null;
  wallet: NamedItem | null;
};

describe('google-sheets-api.util', () => {
  it('maps transactions to sheet values with lookup maps', () => {
    const transactions: TestTransaction[] = [
      {
        categoryId: 'category-1',
        branchId: 'branch-1',
        walletId: 'wallet-1',
      },
    ];
    const categories = new Map<string, NamedItem>([['category-1', { name: 'Food' }]]);
    const branches = new Map<string, NamedItem>([['branch-1', { name: 'HQ' }]]);
    const wallets = new Map<string, NamedItem>([['wallet-1', { name: 'Main' }]]);

    const values = mapTransactionsToValues(
      transactions,
      categories,
      branches,
      wallets,
      (
        transaction: TestTransaction,
        category: NamedItem | null,
        branch: NamedItem | null,
        wallet: NamedItem | null,
      ): MappedRow => ({ transaction, category, branch, wallet }),
      (row: MappedRow) => [row.wallet?.name, row.branch?.name, row.category?.name],
    );

    expect(values).toEqual([['Main', 'HQ', 'Food']]);
  });

  it('detects retryable credential errors', () => {
    expect(isRetryableCredentialError({ code: 401 })).toBe(true);
    expect(isRetryableCredentialError({ message: 'Invalid Credentials' })).toBe(true);
    expect(isRetryableCredentialError({ code: 500, message: 'Other' })).toBe(false);
  });

  it('builds shared sheet write context', () => {
    expect(createSheetWriteContext('token', null, (token: string) => ({ token }))).toEqual({
      sheets: { token: 'token' },
      sheetName: 'Sheet1',
      range: 'Sheet1!A:S',
    });
    expect(createSheetWriteContext('token', 'Ops', (token: string) => ({ token }))).toEqual({
      sheets: { token: 'token' },
      sheetName: 'Ops',
      range: 'Ops!A:S',
    });
  });
});
