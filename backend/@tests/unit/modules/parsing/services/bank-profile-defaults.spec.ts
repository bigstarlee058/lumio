import {
  createSharedProfileSections,
  createStatementColumns,
} from '@/modules/parsing/services/bank-profile-defaults';

describe('bank-profile-defaults', () => {
  it('creates statement columns with optional document and currency fields', () => {
    expect(
      createStatementColumns({
        includeDocumentNumber: true,
        includeCounterpartyBin: true,
        includeCurrency: true,
      }),
    ).toEqual([
      { name: 'transactionDate', type: 'date', required: true, index: 0 },
      { name: 'documentNumber', type: 'string', required: false, index: 1 },
      { name: 'counterpartyName', type: 'string', required: true, index: 2 },
      { name: 'counterpartyBin', type: 'string', required: false, index: 3 },
      { name: 'debit', type: 'amount', required: false, index: 4 },
      { name: 'credit', type: 'amount', required: false, index: 5 },
      { name: 'paymentPurpose', type: 'string', required: true, index: 6 },
      { name: 'currency', type: 'currency', required: false, index: 7 },
    ]);
  });

  it('creates shared validation, quality, and feature defaults', () => {
    expect(
      createSharedProfileSections({
        expectedColumns: 6,
        useMLClassification: false,
        fallbackMode: 'heuristic',
      }),
    ).toEqual({
      validation: {
        requiredFields: ['transactionDate', 'counterpartyName', 'paymentPurpose'],
      },
      quality: {
        expectedColumns: 6,
        toleranceLevels: {
          amount: 0.01,
          date: 1,
          balance: 0.02,
        },
        checksumValidation: true,
        duplicateDetection: true,
      },
      features: {
        useMLClassification: false,
        useAdvancedExtraction: true,
        useAutoFix: true,
        useChecksumValidation: true,
        fallbackMode: 'heuristic',
      },
    });
  });
});
