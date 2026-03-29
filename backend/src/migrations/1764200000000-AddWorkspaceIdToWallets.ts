import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToWallets1764200000000 implements MigrationInterface {
  name = 'AddWorkspaceIdToWallets1764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" ADD COLUMN "workspace_id" uuid`);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_wallet_workspace_usage" AS
      SELECT DISTINCT
        w."id" AS "source_wallet_id",
        COALESCE(
          t."workspace_id",
          u."workspace_id",
          (
            SELECT wm."workspace_id"
            FROM "workspace_members" wm
            WHERE wm."user_id" = w."user_id"
            ORDER BY wm."created_at" ASC
            LIMIT 1
          )
        ) AS "workspace_id",
        u."workspace_id" AS "preferred_workspace_id"
      FROM "wallets" w
      LEFT JOIN "users" u ON u."id" = w."user_id"
      LEFT JOIN "transactions" t ON t."wallet_id" = w."id"
      WHERE COALESCE(
        t."workspace_id",
        u."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = w."user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      ) IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_wallet_workspace_ranked" AS
      SELECT
        usage."source_wallet_id",
        usage."workspace_id",
        ROW_NUMBER() OVER (
          PARTITION BY usage."source_wallet_id"
          ORDER BY
            CASE
              WHEN usage."workspace_id" = usage."preferred_workspace_id" THEN 0
              ELSE 1
            END,
            usage."workspace_id"
        ) AS "row_number"
      FROM "tmp_wallet_workspace_usage" usage
    `);

    await queryRunner.query(`
      UPDATE "wallets" w
      SET "workspace_id" = ranked."workspace_id"
      FROM "tmp_wallet_workspace_ranked" ranked
      WHERE w."id" = ranked."source_wallet_id"
        AND ranked."row_number" = 1
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_wallet_duplicates" AS
      SELECT
        uuid_generate_v4() AS "new_wallet_id",
        ranked."source_wallet_id",
        ranked."workspace_id"
      FROM "tmp_wallet_workspace_ranked" ranked
      WHERE ranked."row_number" > 1
    `);

    await queryRunner.query(`
      INSERT INTO "wallets" (
        "id",
        "user_id",
        "workspace_id",
        "name",
        "account_number",
        "bank_name",
        "currency",
        "initial_balance",
        "is_active",
        "created_at",
        "updated_at"
      )
      SELECT
        duplicates."new_wallet_id",
        wallet."user_id",
        duplicates."workspace_id",
        wallet."name",
        wallet."account_number",
        wallet."bank_name",
        wallet."currency",
        wallet."initial_balance",
        wallet."is_active",
        wallet."created_at",
        wallet."updated_at"
      FROM "tmp_wallet_duplicates" duplicates
      INNER JOIN "wallets" wallet ON wallet."id" = duplicates."source_wallet_id"
    `);

    await queryRunner.query(`
      UPDATE "transactions" transaction
      SET "wallet_id" = duplicates."new_wallet_id"
      FROM "tmp_wallet_duplicates" duplicates
      WHERE transaction."wallet_id" = duplicates."source_wallet_id"
        AND transaction."workspace_id" = duplicates."workspace_id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "wallets" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Wallet workspace backfill failed for one or more rows';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "workspace_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD CONSTRAINT "FK_wallets_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wallets_workspace_id" ON "wallets" ("workspace_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallets_workspace_id"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "FK_wallets_workspace"`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN IF EXISTS "workspace_id"`);
  }
}
