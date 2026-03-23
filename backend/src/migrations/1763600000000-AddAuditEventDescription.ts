import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditEventDescription1763600000000 implements MigrationInterface {
  name = 'AddAuditEventDescription1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "audit_events" ADD COLUMN "description" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "audit_events" DROP COLUMN "description"');
  }
}
