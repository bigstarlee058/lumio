import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenProtocolSettings1764800000001 implements MigrationInterface {
  name = 'AddOpenProtocolSettings1764800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "open_protocol_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integration_id" uuid NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "encrypted_secrets" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "last_sync_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_open_protocol_settings_integration_id" UNIQUE ("integration_id"),
        CONSTRAINT "PK_open_protocol_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "open_protocol_settings"
      ADD CONSTRAINT "FK_open_protocol_settings_integration"
      FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "open_protocol_settings" DROP CONSTRAINT IF EXISTS "FK_open_protocol_settings_integration"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "open_protocol_settings"');
  }
}
