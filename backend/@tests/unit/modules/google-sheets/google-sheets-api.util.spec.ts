import {
  createSheetWriteContext,
  isRetryableCredentialError,
  mapTransactionsToValues,
} from '@/modules/google-sheets/services/google-sheets-api.util';

describe('google-sheets-api.util', () => {
  it('maps transactions to sheet values with lookup maps', () => {
    const transactions = [
      {
        categoryId: 'category-1',
        branchId: 'branch-1',
        walletId: 'wallet-1',
      },
    ];
    const categories = new Map([['category-1', { name: 'Food' }]]);
    const branches = new Map([['branch-1', { name: 'HQ' }]]);
    const wallets = new Map([['wallet-1', { name: 'Main' }]]);

    const values = mapTransactionsToValues(
      transactions as any,
      categories as any,
      branches as any,
      wallets as any,
      (transaction, category, branch, wallet) => ({ transaction, category, branch, wallet }),
      row => [row.wallet.name, row.branch.name, row.category.name],
    );

    expect(values).toEqual([['Main', 'HQ', 'Food']]);
  });

  it('detects retryable credential errors', () => {
    expect(isRetryableCredentialError({ code: 401 })).toBe(true);
    expect(isRetryableCredentialError({ message: 'Invalid Credentials' })).toBe(true);
    expect(isRetryableCredentialError({ code: 500, message: 'Other' })).toBe(false);
  });

  it('builds shared sheet write context', () => {
    expect(createSheetWriteContext('token', null, token => ({ token }))).toEqual({
      sheets: { token: 'token' },
      sheetName: 'Sheet1',
      range: 'Sheet1!A:S',
    });
    expect(createSheetWriteContext('token', 'Ops', token => ({ token }))).toEqual({
      sheets: { token: 'token' },
      sheetName: 'Ops',
      range: 'Ops!A:S',
    });
  });
});
