import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToTags1764200000002 implements MigrationInterface {
  name = 'AddWorkspaceIdToTags1764200000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" ADD COLUMN "workspace_id" uuid`);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_tag_workspace_usage" AS
      SELECT DISTINCT
        usage."source_tag_id",
        usage."workspace_id",
        usage."preferred_workspace_id"
      FROM (
        SELECT
          tag."id" AS "source_tag_id",
          statement."workspace_id" AS "workspace_id",
          owner."workspace_id" AS "preferred_workspace_id"
        FROM "tags" tag
        INNER JOIN "statement_tags" statement_tag ON statement_tag."tag_id" = tag."id"
        INNER JOIN "statements" statement ON statement."id" = statement_tag."statement_id"
        LEFT JOIN "users" owner ON owner."id" = tag."user_id"
        WHERE statement."workspace_id" IS NOT NULL

        UNION ALL

        SELECT
          tag."id" AS "source_tag_id",
          folder."workspace_id" AS "workspace_id",
          owner."workspace_id" AS "preferred_workspace_id"
        FROM "tags" tag
        INNER JOIN "folders" folder ON folder."tag_id" = tag."id"
        LEFT JOIN "users" owner ON owner."id" = tag."user_id"
        WHERE folder."workspace_id" IS NOT NULL

        UNION ALL

        SELECT
          tag."id" AS "source_tag_id",
          COALESCE(
            owner."workspace_id",
            (
              SELECT wm."workspace_id"
              FROM "workspace_members" wm
              WHERE wm."user_id" = tag."user_id"
              ORDER BY wm."created_at" ASC
              LIMIT 1
            )
          ) AS "workspace_id",
          owner."workspace_id" AS "preferred_workspace_id"
        FROM "tags" tag
        LEFT JOIN "users" owner ON owner."id" = tag."user_id"
        WHERE COALESCE(
          owner."workspace_id",
          (
            SELECT wm."workspace_id"
            FROM "workspace_members" wm
            WHERE wm."user_id" = tag."user_id"
            ORDER BY wm."created_at" ASC
            LIMIT 1
          )
        ) IS NOT NULL
      ) usage
      WHERE usage."workspace_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_tag_workspace_ranked" AS
      SELECT
        usage."source_tag_id",
        usage."workspace_id",
        ROW_NUMBER() OVER (
          PARTITION BY usage."source_tag_id"
          ORDER BY
            CASE
              WHEN usage."workspace_id" = usage."preferred_workspace_id" THEN 0
              ELSE 1
            END,
            usage."workspace_id"
        ) AS "row_number"
      FROM "tmp_tag_workspace_usage" usage
    `);

    await queryRunner.query(`
      UPDATE "tags" tag
      SET "workspace_id" = ranked."workspace_id"
      FROM "tmp_tag_workspace_ranked" ranked
      WHERE tag."id" = ranked."source_tag_id"
        AND ranked."row_number" = 1
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_tag_duplicates" AS
      SELECT
        uuid_generate_v4() AS "new_tag_id",
        ranked."source_tag_id",
        ranked."workspace_id"
      FROM "tmp_tag_workspace_ranked" ranked
      WHERE ranked."row_number" > 1
    `);

    await queryRunner.query(`
      INSERT INTO "tags" (
        "id",
        "name",
        "color",
        "user_id",
        "workspace_id",
        "created_at",
        "updated_at"
      )
      SELECT
        duplicates."new_tag_id",
        tag."name",
        tag."color",
        tag."user_id",
        duplicates."workspace_id",
        tag."created_at",
        tag."updated_at"
      FROM "tmp_tag_duplicates" duplicates
      INNER JOIN "tags" tag ON tag."id" = duplicates."source_tag_id"
    `);

    await queryRunner.query(`
      UPDATE "statement_tags" statement_tag
      SET "tag_id" = duplicates."new_tag_id"
      FROM "tmp_tag_duplicates" duplicates, "statements" statement
      WHERE statement_tag."tag_id" = duplicates."source_tag_id"
        AND statement."id" = statement_tag."statement_id"
        AND statement."workspace_id" = duplicates."workspace_id"
    `);

    await queryRunner.query(`
      UPDATE "folders" folder
      SET "tag_id" = duplicates."new_tag_id"
      FROM "tmp_tag_duplicates" duplicates
      WHERE folder."tag_id" = duplicates."source_tag_id"
        AND folder."workspace_id" = duplicates."workspace_id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "tags" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Tag workspace backfill failed for one or more rows';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "workspace_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "tags"
      ADD CONSTRAINT "FK_tags_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "IDX_tags_workspace_id" ON "tags" ("workspace_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tags_workspace_id"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "FK_tags_workspace"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP COLUMN IF EXISTS "workspace_id"`);
  }
}
