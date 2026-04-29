import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImapReceiptSource1764800000000 implements MigrationInterface {
  name = 'AddImapReceiptSource1764800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "receipts_source_enum" ADD VALUE IF NOT EXISTS 'imap'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value removal is not supported safely.
  }
}
