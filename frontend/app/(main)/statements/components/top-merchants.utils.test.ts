import { describe, expect, it } from 'vitest';

import { resolveMerchantFlow } from './top-merchants.utils';

describe('top merchants helpers', () => {
  it('resolves merchant flow using debit, credit and transaction type', () => {
    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 320,
        credit: 0,
        amount: 0,
        transactionType: 'expense',
      }),
    ).toEqual({ flowType: 'spend', amount: 320 });

    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 0,
        credit: 150,
        amount: 0,
        transactionType: 'income',
      }),
    ).toEqual({ flowType: 'income', amount: 150 });

    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 0,
        credit: 0,
        amount: 95,
        transactionType: 'income',
      }),
    ).toEqual({ flowType: 'income', amount: 95 });
  });
});
