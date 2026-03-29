import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('Batch 1 workspace scoping migrations', () => {
  const backendRoot = process.cwd();

  const readMigration = (filename: string) => {
    const filePath = path.join(backendRoot, 'src', 'migrations', filename);
    expect(existsSync(filePath)).toBe(true);
    return readFileSync(filePath, 'utf8');
  };

  it('creates a wallet migration that duplicates cross-workspace rows instead of deleting data', () => {
    const source = readMigration('1764200000000-AddWorkspaceIdToWallets.ts');

    expect(source).toContain('ALTER TABLE "wallets"');
    expect(source).toContain('workspace_id');
    expect(source).toContain('INSERT INTO "wallets"');
    expect(source).toContain('UPDATE "transactions"');
    expect(source).not.toContain('DELETE FROM "wallets"');
  });

  it('creates a branch migration that duplicates cross-workspace rows instead of deleting data', () => {
    const source = readMigration('1764200000001-AddWorkspaceIdToBranches.ts');

    expect(source).toContain('ALTER TABLE "branches"');
    expect(source).toContain('workspace_id');
    expect(source).toContain('INSERT INTO "branches"');
    expect(source).toContain('UPDATE "transactions"');
    expect(source).not.toContain('DELETE FROM "branches"');
  });

  it('creates a tag migration that duplicates cross-workspace rows and rewires joins', () => {
    const source = readMigration('1764200000002-AddWorkspaceIdToTags.ts');
    const statementTagUpdate = source.match(
      /UPDATE "statement_tags" statement_tag[\s\S]*?UPDATE "folders" folder/,
    )?.[0];

    expect(source).toContain('ALTER TABLE "tags"');
    expect(source).toContain('workspace_id');
    expect(source).toContain('INSERT INTO "tags"');
    expect(source).toContain('UPDATE "statement_tags"');
    expect(source).toContain('UPDATE "folders"');
    expect(statementTagUpdate).toBeDefined();
    expect(statementTagUpdate).not.toContain(
      'INNER JOIN "statements" statement ON statement."id" = statement_tag."statement_id"',
    );
    expect(statementTagUpdate).toContain(
      'FROM "tmp_tag_duplicates" duplicates, "statements" statement',
    );
    expect(source).not.toContain('DELETE FROM "tags"');
  });
});
