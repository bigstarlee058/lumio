import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeCategoryLearningColumns1762099999999 implements MigrationInterface {
  name = 'NormalizeCategoryLearningColumns1762099999999';

  private async hasColumn(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
    const result = await queryRunner.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'category_learning'
          AND column_name = $1
        LIMIT 1
      `,
      [columnName],
    );

    return result.length > 0;
  }

  private async renameColumnIfNeeded(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    if ((await this.hasColumn(queryRunner, from)) && !(await this.hasColumn(queryRunner, to))) {
      await queryRunner.query(`ALTER TABLE "category_learning" RENAME COLUMN "${from}" TO "${to}"`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCategoryLearning = await queryRunner.hasTable('category_learning');
    if (!hasCategoryLearning) {
      return;
    }

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace_category"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace"');

    await this.renameColumnIfNeeded(queryRunner, 'userId', 'user_id');
    await this.renameColumnIfNeeded(queryRunner, 'workspaceId', 'workspace_id');
    await this.renameColumnIfNeeded(queryRunner, 'categoryId', 'category_id');
    await this.renameColumnIfNeeded(queryRunner, 'paymentPurpose', 'payment_purpose');
    await this.renameColumnIfNeeded(queryRunner, 'counterpartyName', 'counterparty_name');
    await this.renameColumnIfNeeded(queryRunner, 'learnedFrom', 'learned_from');
    await this.renameColumnIfNeeded(queryRunner, 'createdAt', 'created_at');

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_category_learning_workspace" ON "category_learning" ("workspace_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_category_learning_workspace_category" ON "category_learning" ("workspace_id", "category_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCategoryLearning = await queryRunner.hasTable('category_learning');
    if (!hasCategoryLearning) {
      return;
    }

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace_category"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace"');

    await this.renameColumnIfNeeded(queryRunner, 'user_id', 'userId');
    await this.renameColumnIfNeeded(queryRunner, 'workspace_id', 'workspaceId');
    await this.renameColumnIfNeeded(queryRunner, 'category_id', 'categoryId');
    await this.renameColumnIfNeeded(queryRunner, 'payment_purpose', 'paymentPurpose');
    await this.renameColumnIfNeeded(queryRunner, 'counterparty_name', 'counterpartyName');
    await this.renameColumnIfNeeded(queryRunner, 'learned_from', 'learnedFrom');
    await this.renameColumnIfNeeded(queryRunner, 'created_at', 'createdAt');
  }
}
