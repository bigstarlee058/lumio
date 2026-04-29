import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceServiceSettings1764800000002 implements MigrationInterface {
  name = 'AddWorkspaceServiceSettings1764800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_service_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "key" character varying(64) NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "encrypted_secrets" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workspace_service_settings_workspace_key" UNIQUE ("workspace_id", "key"),
        CONSTRAINT "PK_workspace_service_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_service_settings"
      ADD CONSTRAINT "FK_workspace_service_settings_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_service_settings"
      ADD CONSTRAINT "FK_workspace_service_settings_updated_by"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_service_settings" DROP CONSTRAINT IF EXISTS "FK_workspace_service_settings_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_service_settings" DROP CONSTRAINT IF EXISTS "FK_workspace_service_settings_workspace"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_service_settings"`);
  }
}
