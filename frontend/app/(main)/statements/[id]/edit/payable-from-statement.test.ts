import { describe, expect, it } from 'vitest';

import { buildPayableFromStatement } from './payable-from-statement';

describe('buildPayableFromStatement', () => {
  it('creates payable payload from statement expense transactions', () => {
    expect(
      buildPayableFromStatement({
        statement: {
          id: 'statement-1',
          fileName: 'statement.pdf',
          statementDateTo: '2026-03-17',
          parsingDetails: {
            metadataExtracted: { headerDisplay: { currencyDisplay: 'KZT' } },
          },
        },
        transactions: [
          {
            counterpartyName: 'Test counterparty',
            debit: 125,
            credit: 0,
            transactionType: 'expense',
          },
        ],
      }),
    ).toEqual({
      vendor: 'Test counterparty',
      amount: 125,
      currency: 'KZT',
      dueDate: '2026-03-17',
      source: 'statement',
      statementId: 'statement-1',
      comment: 'Created from statement statement.pdf',
    });
  });

  it('returns null when statement has no expense amount', () => {
    expect(
      buildPayableFromStatement({
        statement: {
          id: 'statement-1',
          fileName: 'statement.pdf',
        },
        transactions: [
          {
            counterpartyName: 'Incoming',
            debit: 0,
            credit: 300,
            transactionType: 'income',
          },
        ],
      }),
    ).toBeNull();
  });
});
