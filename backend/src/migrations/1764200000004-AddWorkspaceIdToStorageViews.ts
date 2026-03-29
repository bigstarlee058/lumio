import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToStorageViews1764200000004 implements MigrationInterface {
  name = 'AddWorkspaceIdToStorageViews1764200000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage_views" ADD COLUMN "workspace_id" uuid`);

    await queryRunner.query(`
      UPDATE "storage_views" view
      SET "workspace_id" = COALESCE(
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = view."user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      )
      FROM "users" owner
      WHERE view."user_id" = owner."id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "storage_views" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Storage view workspace backfill failed';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      ALTER TABLE "storage_views"
      ADD CONSTRAINT "FK_storage_views_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_storage_views_user"`);
    await queryRunner.query(`ALTER TABLE "storage_views" ALTER COLUMN "workspace_id" SET NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_storage_views_workspace" ON "storage_views" ("workspace_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_storage_views_workspace"`);
    await queryRunner.query(`CREATE INDEX "IDX_storage_views_user" ON "storage_views" ("user_id")`);
    await queryRunner.query(
      `ALTER TABLE "storage_views" DROP CONSTRAINT IF EXISTS "FK_storage_views_workspace"`,
    );
    await queryRunner.query(`ALTER TABLE "storage_views" DROP COLUMN IF EXISTS "workspace_id"`);
  }
}
