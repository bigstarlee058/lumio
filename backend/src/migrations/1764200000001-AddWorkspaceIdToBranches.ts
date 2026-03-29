import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToBranches1764200000001 implements MigrationInterface {
  name = 'AddWorkspaceIdToBranches1764200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "workspace_id" uuid`);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_branch_workspace_usage" AS
      SELECT DISTINCT
        branch."id" AS "source_branch_id",
        COALESCE(
          transaction."workspace_id",
          owner."workspace_id",
          (
            SELECT wm."workspace_id"
            FROM "workspace_members" wm
            WHERE wm."user_id" = branch."user_id"
            ORDER BY wm."created_at" ASC
            LIMIT 1
          )
        ) AS "workspace_id",
        owner."workspace_id" AS "preferred_workspace_id"
      FROM "branches" branch
      LEFT JOIN "users" owner ON owner."id" = branch."user_id"
      LEFT JOIN "transactions" transaction ON transaction."branch_id" = branch."id"
      WHERE COALESCE(
        transaction."workspace_id",
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = branch."user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      ) IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_branch_workspace_ranked" AS
      SELECT
        usage."source_branch_id",
        usage."workspace_id",
        ROW_NUMBER() OVER (
          PARTITION BY usage."source_branch_id"
          ORDER BY
            CASE
              WHEN usage."workspace_id" = usage."preferred_workspace_id" THEN 0
              ELSE 1
            END,
            usage."workspace_id"
        ) AS "row_number"
      FROM "tmp_branch_workspace_usage" usage
    `);

    await queryRunner.query(`
      UPDATE "branches" branch
      SET "workspace_id" = ranked."workspace_id"
      FROM "tmp_branch_workspace_ranked" ranked
      WHERE branch."id" = ranked."source_branch_id"
        AND ranked."row_number" = 1
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_branch_duplicates" AS
      SELECT
        uuid_generate_v4() AS "new_branch_id",
        ranked."source_branch_id",
        ranked."workspace_id"
      FROM "tmp_branch_workspace_ranked" ranked
      WHERE ranked."row_number" > 1
    `);

    await queryRunner.query(`
      INSERT INTO "branches" (
        "id",
        "user_id",
        "workspace_id",
        "name",
        "code",
        "address",
        "is_active",
        "created_at",
        "updated_at"
      )
      SELECT
        duplicates."new_branch_id",
        branch."user_id",
        duplicates."workspace_id",
        branch."name",
        branch."code",
        branch."address",
        branch."is_active",
        branch."created_at",
        branch."updated_at"
      FROM "tmp_branch_duplicates" duplicates
      INNER JOIN "branches" branch ON branch."id" = duplicates."source_branch_id"
    `);

    await queryRunner.query(`
      UPDATE "transactions" transaction
      SET "branch_id" = duplicates."new_branch_id"
      FROM "tmp_branch_duplicates" duplicates
      WHERE transaction."branch_id" = duplicates."source_branch_id"
        AND transaction."workspace_id" = duplicates."workspace_id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "branches" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Branch workspace backfill failed for one or more rows';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "workspace_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "branches"
      ADD CONSTRAINT "FK_branches_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_branches_workspace_id" ON "branches" ("workspace_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_branches_workspace_id"`);
    await queryRunner.query(
      `ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "FK_branches_workspace"`,
    );
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN IF EXISTS "workspace_id"`);
  }
}
