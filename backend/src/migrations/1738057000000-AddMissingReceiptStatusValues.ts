import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingReceiptStatusValues1738057000000 implements MigrationInterface {
  name = 'AddMissingReceiptStatusValues1738057000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure enum contains reviewed/approved/rejected values for receipts_status_enum
    await queryRunner.query(`ALTER TYPE "receipts_status_enum" ADD VALUE IF NOT EXISTS 'reviewed'`);
    await queryRunner.query(`ALTER TYPE "receipts_status_enum" ADD VALUE IF NOT EXISTS 'approved'`);
    await queryRunner.query(`ALTER TYPE "receipts_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; no-op
  }
}
