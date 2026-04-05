import {
  forEachIssueRowWithSchema,
  getIssueRowsWithSchema,
} from '@/modules/parsing/services/column-auto-fix.util';

type TestTransaction = { id: number };
type TestSchema = { name: string; dataType: 'string' };
type TestIssue = { field: string; rowIndices: number[] };

describe('column-auto-fix.util', () => {
  it('returns matched schema and row-index pairs for an issue', () => {
    const rows: TestTransaction[] = [{ id: 1 }, { id: 2 }];
    const schema: TestSchema[] = [{ name: 'documentNumber', dataType: 'string' }];
    const issue: TestIssue = { field: 'documentNumber', rowIndices: [1] };

    expect(getIssueRowsWithSchema(rows, issue, schema)).toEqual({
      columnSchema: { name: 'documentNumber', dataType: 'string' },
      affectedRows: [{ rowIndex: 1, transaction: { id: 2 } }],
    });
  });

  it('iterates rows only when schema is present', () => {
    const rows: TestTransaction[] = [{ id: 1 }, { id: 2 }];
    const schema: TestSchema[] = [{ name: 'documentNumber', dataType: 'string' }];
    const issue: TestIssue = { field: 'documentNumber', rowIndices: [0, 1] };
    const visited: Array<{ rowIndex: number; transaction: { id: number }; schemaName: string }> =
      [];

    expect(
      forEachIssueRowWithSchema(
        rows,
        issue,
        schema,
        ({
          rowIndex,
          transaction,
          columnSchema,
        }: {
          rowIndex: number;
          transaction: TestTransaction;
          columnSchema: TestSchema;
        }) => {
          visited.push({ rowIndex, transaction, schemaName: columnSchema.name });
        },
      ),
    ).toBe(true);

    expect(visited).toEqual([
      { rowIndex: 0, transaction: { id: 1 }, schemaName: 'documentNumber' },
      { rowIndex: 1, transaction: { id: 2 }, schemaName: 'documentNumber' },
    ]);
    expect(
      forEachIssueRowWithSchema(rows, { field: 'missing', rowIndices: [0] }, schema, () => {}),
    ).toBe(false);
  });
});
