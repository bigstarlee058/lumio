import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeWorkspaceIdNotNull1764200000005 implements MigrationInterface {
  name = 'MakeWorkspaceIdNotNull1764200000005';

  private async backfillViaUser(queryRunner: QueryRunner, table: string, userColumn = 'user_id') {
    await queryRunner.query(`
      UPDATE "${table}" record
      SET "workspace_id" = COALESCE(
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = record."${userColumn}"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      )
      FROM "users" owner
      WHERE record."${userColumn}" = owner."id"
        AND record."workspace_id" IS NULL
    `);
  }

  private async ensureNotNull(queryRunner: QueryRunner, table: string) {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "${table}" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION '${table} workspace backfill failed';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "workspace_id" SET NOT NULL`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCategoryLearning = await queryRunner.hasTable('category_learning');

    await this.backfillViaUser(queryRunner, 'statements');

    await queryRunner.query(`
      UPDATE "transactions" transaction
      SET "workspace_id" = statement."workspace_id"
      FROM "statements" statement
      WHERE transaction."statement_id" = statement."id"
        AND transaction."workspace_id" IS NULL
    `);

    await this.backfillViaUser(queryRunner, 'categories');
    await this.backfillViaUser(queryRunner, 'audit_events', 'actor_id');
    await this.backfillViaUser(queryRunner, 'notifications', 'recipient_id');
    await this.backfillViaUser(queryRunner, 'insights');
    await this.backfillViaUser(queryRunner, 'custom_tables');
    await this.backfillViaUser(queryRunner, 'folders');
    await this.backfillViaUser(queryRunner, 'google_sheets_credentials');
    await this.backfillViaUser(queryRunner, 'google_sheets');
    await this.backfillViaUser(queryRunner, 'categorization_rules');
    await this.backfillViaUser(queryRunner, 'idempotency_keys');

    await queryRunner.query(`
      UPDATE "tax_rates" tax_rate
      SET "workspace_id" = COALESCE(
        (
          SELECT transaction_workspace."workspace_id"
          FROM (
            SELECT DISTINCT ON (transaction."tax_rate_id")
              transaction."tax_rate_id",
              transaction."workspace_id"
            FROM "transactions" transaction
            WHERE transaction."tax_rate_id" IS NOT NULL
              AND transaction."workspace_id" IS NOT NULL
            ORDER BY transaction."tax_rate_id", transaction."created_at" ASC
          ) transaction_workspace
          WHERE transaction_workspace."tax_rate_id" = tax_rate."id"
          LIMIT 1
        ),
        (
          SELECT workspace."id"
          FROM "workspaces" workspace
          WHERE workspace."owner_id" IS NOT NULL
            AND workspace."id" = (
              SELECT owner."workspace_id"
              FROM "users" owner
              WHERE owner."id" = workspace."owner_id"
              LIMIT 1
            )
          ORDER BY workspace."created_at" ASC
          LIMIT 1
        )
      )
      WHERE tax_rate."workspace_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "integrations" integration
      SET "workspace_id" = COALESCE(
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = integration."connected_by_user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      )
      FROM "users" owner
      WHERE integration."connected_by_user_id" = owner."id"
        AND integration."workspace_id" IS NULL
    `);

    if (hasCategoryLearning) {
      await queryRunner.query(`
        UPDATE "category_learning" learning
        SET "workspace_id" = category."workspace_id"
        FROM "categories" category
        WHERE learning."category_id" = category."id"
          AND learning."workspace_id" IS NULL
      `);
    }

    await this.ensureNotNull(queryRunner, 'transactions');
    await this.ensureNotNull(queryRunner, 'statements');
    await this.ensureNotNull(queryRunner, 'categories');
    await this.ensureNotNull(queryRunner, 'audit_events');
    await this.ensureNotNull(queryRunner, 'notifications');
    await this.ensureNotNull(queryRunner, 'insights');
    await this.ensureNotNull(queryRunner, 'custom_tables');
    await this.ensureNotNull(queryRunner, 'folders');
    await this.ensureNotNull(queryRunner, 'tax_rates');
    await this.ensureNotNull(queryRunner, 'google_sheets_credentials');
    await this.ensureNotNull(queryRunner, 'google_sheets');
    await this.ensureNotNull(queryRunner, 'integrations');
    await this.ensureNotNull(queryRunner, 'categorization_rules');
    if (hasCategoryLearning) {
      await this.ensureNotNull(queryRunner, 'category_learning');
    }
    await this.ensureNotNull(queryRunner, 'idempotency_keys');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'transactions',
      'statements',
      'categories',
      'audit_events',
      'notifications',
      'insights',
      'custom_tables',
      'folders',
      'tax_rates',
      'google_sheets_credentials',
      'google_sheets',
      'integrations',
      'categorization_rules',
      'category_learning',
      'idempotency_keys',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "workspace_id" DROP NOT NULL`);
    }
  }
}
