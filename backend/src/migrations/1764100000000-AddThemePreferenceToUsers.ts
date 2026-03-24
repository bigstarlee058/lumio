import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemePreferenceToUsers1764100000000 implements MigrationInterface {
  name = 'AddThemePreferenceToUsers1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "theme_preference" varchar(16) NOT NULL DEFAULT 'auto'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "theme_preference"`);
  }
}
