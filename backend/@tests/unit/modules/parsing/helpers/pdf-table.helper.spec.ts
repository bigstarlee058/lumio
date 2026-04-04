import { getExcludedColumnIndexes } from '@/modules/parsing/helpers/pdf-table.helper';

describe('pdf-table.helper', () => {
  it('collects excluded column indexes for the provided keys', () => {
    expect(
      getExcludedColumnIndexes(
        {
          date: 0,
          document: 1,
          debit: 5,
          credit: 6,
          purpose: 7,
        },
        ['date', 'document', 'debit', 'credit', 'purpose'],
      ),
    ).toEqual(new Set([0, 1, 5, 6, 7]));
  });
});
