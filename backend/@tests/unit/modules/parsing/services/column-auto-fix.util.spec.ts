import {
  forEachIssueRowWithSchema,
  getIssueRowsWithSchema,
} from '@/modules/parsing/services/column-auto-fix.util';

describe('column-auto-fix.util', () => {
  it('returns matched schema and row-index pairs for an issue', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const schema = [{ name: 'documentNumber', dataType: 'string' }];
    const issue = { field: 'documentNumber', rowIndices: [1] };

    expect(getIssueRowsWithSchema(rows as any, issue as any, schema as any)).toEqual({
      columnSchema: { name: 'documentNumber', dataType: 'string' },
      affectedRows: [{ rowIndex: 1, transaction: { id: 2 } }],
    });
  });

  it('iterates rows only when schema is present', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const schema = [{ name: 'documentNumber', dataType: 'string' }];
    const issue = { field: 'documentNumber', rowIndices: [0, 1] };
    const visited: Array<{ rowIndex: number; transaction: { id: number }; schemaName: string }> = [];

    expect(
      forEachIssueRowWithSchema(rows as any, issue as any, schema as any, ({
        rowIndex,
        transaction,
        columnSchema,
      }) => {
        visited.push({ rowIndex, transaction, schemaName: columnSchema.name });
      }),
    ).toBe(true);

    expect(visited).toEqual([
      { rowIndex: 0, transaction: { id: 1 }, schemaName: 'documentNumber' },
      { rowIndex: 1, transaction: { id: 2 }, schemaName: 'documentNumber' },
    ]);
    expect(forEachIssueRowWithSchema(rows as any, { field: 'missing', rowIndices: [0] } as any, schema as any, () => {})).toBe(false);
  });
});
