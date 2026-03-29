import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('Batch 2 workspace scoping migrations', () => {
  const backendRoot = process.cwd();

  const readMigration = (filename: string) => {
    const filePath = path.join(backendRoot, 'src', 'migrations', filename);
    expect(existsSync(filePath)).toBe(true);
    return readFileSync(filePath, 'utf8');
  };

  it('creates data-entry migration with workspace backfill and index swap', () => {
    const source = readMigration('1764200000003-AddWorkspaceIdToDataEntries.ts');
    const dataEntryUpdate = source.match(/UPDATE "data_entries" entry[\s\S]*?DO \$\$/)?.[0];

    expect(source).toContain('ALTER TABLE "data_entries" ADD COLUMN "workspace_id"');
    expect(source).toContain('ALTER TABLE "data_entry_custom_fields" ADD COLUMN "workspace_id"');
    expect(source).toContain('IDX_data_entries_workspace_type_date');
    expect(source).toContain('IDX_data_entries_workspace_custom_tab_date');
    expect(source).toContain('IDX_data_entry_custom_fields_workspace_name_unique');
    expect(source).toContain('ALTER TABLE "data_entries" ALTER COLUMN "workspace_id" SET NOT NULL');
    expect(source).toContain(
      'ALTER TABLE "data_entry_custom_fields" ALTER COLUMN "workspace_id" SET NOT NULL',
    );
    expect(dataEntryUpdate).toBeDefined();
    expect(dataEntryUpdate).not.toContain(
      'LEFT JOIN "data_entry_custom_fields" field ON field."id" = entry."custom_tab_id"',
    );
    expect(dataEntryUpdate).toContain('SELECT field."workspace_id"');
    expect(source).not.toContain('DELETE FROM "data_entries"');
    expect(source).not.toContain('DELETE FROM "data_entry_custom_fields"');
  });

  it('creates storage-view migration with workspace backfill and no silent delete', () => {
    const source = readMigration('1764200000004-AddWorkspaceIdToStorageViews.ts');

    expect(source).toContain('ALTER TABLE "storage_views" ADD COLUMN "workspace_id"');
    expect(source).toContain('IDX_storage_views_workspace');
    expect(source).toContain(
      'ALTER TABLE "storage_views" ALTER COLUMN "workspace_id" SET NOT NULL',
    );
    expect(source).not.toContain('DELETE FROM "storage_views"');
  });

  it('creates not-null migration that backfills before enforcing constraints', () => {
    const source = readMigration('1764200000005-MakeWorkspaceIdNotNull.ts');

    expect(source).toContain("await this.ensureNotNull(queryRunner, 'transactions')");
    expect(source).toContain("await this.ensureNotNull(queryRunner, 'statements')");
    expect(source).toContain("await this.ensureNotNull(queryRunner, 'categories')");
    expect(source).toContain("await this.ensureNotNull(queryRunner, 'custom_tables')");
    expect(source).toContain('ALTER TABLE "${table}" ALTER COLUMN "workspace_id" SET NOT NULL');
    expect(source).toContain('RAISE EXCEPTION');
    expect(source).not.toContain('SELECT DISTINCT "user_id"');
    expect(source).toContain('SELECT DISTINCT ON (transaction."tax_rate_id")');
    expect(source).toContain('transaction."tax_rate_id"');
    expect(source).not.toContain('DELETE FROM "transactions"');
    expect(source).not.toContain('DELETE FROM "statements"');
    expect(source).not.toContain('DELETE FROM "categories"');
  });

  it('normalizes category_learning columns before later workspace enforcement', () => {
    const source = readMigration('1762099999999-NormalizeCategoryLearningColumns.ts');

    expect(source).toContain('category_learning');
    expect(source).toContain('information_schema.columns');
    expect(source).toContain("await this.renameColumnIfNeeded(queryRunner, 'userId', 'user_id')");
    expect(source).toContain(
      "await this.renameColumnIfNeeded(queryRunner, 'categoryId', 'category_id')",
    );
    expect(source).toContain(
      "await this.renameColumnIfNeeded(queryRunner, 'paymentPurpose', 'payment_purpose')",
    );
    expect(source).toContain(
      "await this.renameColumnIfNeeded(queryRunner, 'counterpartyName', 'counterparty_name')",
    );
    expect(source).toContain(
      "await this.renameColumnIfNeeded(queryRunner, 'learnedFrom', 'learned_from')",
    );
    expect(source).toContain("name = 'NormalizeCategoryLearningColumns1762099999999'");
  });

  it('guards category_learning access in not-null migration', () => {
    const source = readMigration('1764200000005-MakeWorkspaceIdNotNull.ts');

    expect(source).toContain(
      "const hasCategoryLearning = await queryRunner.hasTable('category_learning')",
    );
    expect(source).toContain('if (hasCategoryLearning)');
    expect(source).toContain("await this.ensureNotNull(queryRunner, 'category_learning')");
  });
});
