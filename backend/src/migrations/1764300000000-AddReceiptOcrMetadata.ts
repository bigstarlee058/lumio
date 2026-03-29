import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptOcrMetadata1764300000000 implements MigrationInterface {
  name = 'AddReceiptOcrMetadata1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "language" character varying(32)',
    );
    await queryRunner.query(
      'ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "extraction_method" character varying(32)',
    );
    await queryRunner.query(
      'ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "confidence" numeric(3,2)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "receipts" DROP COLUMN IF EXISTS "confidence"');
    await queryRunner.query(
      'ALTER TABLE "receipts" DROP COLUMN IF EXISTS "extraction_method"',
    );
    await queryRunner.query('ALTER TABLE "receipts" DROP COLUMN IF EXISTS "language"');
  }
}
