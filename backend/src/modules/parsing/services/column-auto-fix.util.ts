export interface IssueRowMatch<TTransaction, TSchema> {
  columnSchema: TSchema | undefined;
  affectedRows: Array<{ rowIndex: number; transaction: TTransaction }>;
}

export function getIssueRowsWithSchema<
  TTransaction,
  TSchema extends { name: string },
  TIssue extends { field: string; rowIndices: number[] },
>(
  transactions: TTransaction[],
  issue: TIssue,
  schema: TSchema[],
): IssueRowMatch<TTransaction, TSchema> {
  return {
    columnSchema: schema.find(col => col.name === issue.field),
    affectedRows: issue.rowIndices.map(rowIndex => ({
      rowIndex,
      transaction: transactions[rowIndex],
    })),
  };
}

export function forEachIssueRowWithSchema<
  TTransaction,
  TSchema extends { name: string },
  TIssue extends { field: string; rowIndices: number[] },
>(
  transactions: TTransaction[],
  issue: TIssue,
  schema: TSchema[],
  iteratee: (context: {
    columnSchema: TSchema;
    rowIndex: number;
    transaction: TTransaction;
  }) => void,
): boolean {
  const { columnSchema, affectedRows } = getIssueRowsWithSchema(transactions, issue, schema);
  if (!columnSchema) {
    return false;
  }

  for (const { rowIndex, transaction } of affectedRows) {
    iteratee({ columnSchema, rowIndex, transaction });
  }

  return true;
}
