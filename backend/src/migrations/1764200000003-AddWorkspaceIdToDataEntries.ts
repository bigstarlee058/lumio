import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToDataEntries1764200000003 implements MigrationInterface {
  name = 'AddWorkspaceIdToDataEntries1764200000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "data_entries" ADD COLUMN "workspace_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "data_entry_custom_fields" ADD COLUMN "workspace_id" uuid`,
    );

    await queryRunner.query(`
      UPDATE "data_entry_custom_fields" field
      SET "workspace_id" = COALESCE(
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = field."user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      )
      FROM "users" owner
      WHERE field."user_id" = owner."id"
    `);

    await queryRunner.query(`
      UPDATE "data_entries" entry
      SET "workspace_id" = COALESCE(
        (
          SELECT field."workspace_id"
          FROM "data_entry_custom_fields" field
          WHERE field."id" = entry."custom_tab_id"
          LIMIT 1
        ),
        owner."workspace_id",
        (
          SELECT wm."workspace_id"
          FROM "workspace_members" wm
          WHERE wm."user_id" = entry."user_id"
          ORDER BY wm."created_at" ASC
          LIMIT 1
        )
      )
      FROM "users" owner
      WHERE entry."user_id" = owner."id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "data_entry_custom_fields" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Data entry custom field workspace backfill failed';
        END IF;
        IF EXISTS (SELECT 1 FROM "data_entries" WHERE "workspace_id" IS NULL) THEN
          RAISE EXCEPTION 'Data entry workspace backfill failed';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      ALTER TABLE "data_entry_custom_fields"
      ADD CONSTRAINT "FK_data_entry_custom_fields_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "data_entries"
      ADD CONSTRAINT "FK_data_entries_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_data_entries_user_type_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_data_entries_user_custom_tab_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_data_entry_custom_fields_user_name_unique"`);

    await queryRunner.query(`ALTER TABLE "data_entries" ALTER COLUMN "workspace_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "data_entry_custom_fields" ALTER COLUMN "workspace_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_data_entries_workspace_type_date" ON "data_entries" ("workspace_id", "type", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_entries_workspace_custom_tab_date" ON "data_entries" ("workspace_id", "custom_tab_id", "date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_data_entry_custom_fields_workspace_name_unique" ON "data_entry_custom_fields" ("workspace_id", "name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_data_entries_workspace_type_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_data_entries_workspace_custom_tab_date"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_data_entry_custom_fields_workspace_name_unique"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_entries_user_type_date" ON "data_entries" ("user_id", "type", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_entries_user_custom_tab_date" ON "data_entries" ("user_id", "custom_tab_id", "date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_data_entry_custom_fields_user_name_unique" ON "data_entry_custom_fields" ("user_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_entries" DROP CONSTRAINT IF EXISTS "FK_data_entries_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_entry_custom_fields" DROP CONSTRAINT IF EXISTS "FK_data_entry_custom_fields_workspace"`,
    );
    await queryRunner.query(`ALTER TABLE "data_entries" DROP COLUMN IF EXISTS "workspace_id"`);
    await queryRunner.query(
      `ALTER TABLE "data_entry_custom_fields" DROP COLUMN IF EXISTS "workspace_id"`,
    );
  }
}
