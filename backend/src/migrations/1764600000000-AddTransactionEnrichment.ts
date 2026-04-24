import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionEnrichment1764600000000 implements MigrationInterface {
  name = 'AddTransactionEnrichment1764600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "vendor_normalized" VARCHAR NULL,
        ADD COLUMN "category_hint" VARCHAR NULL,
        ADD COLUMN "transaction_nature" VARCHAR NULL,
        ADD COLUMN "tax_detected" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "enrichment_confidence" NUMERIC(3,2) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN IF EXISTS "enrichment_confidence",
        DROP COLUMN IF EXISTS "tax_detected",
        DROP COLUMN IF EXISTS "transaction_nature",
        DROP COLUMN IF EXISTS "category_hint",
        DROP COLUMN IF EXISTS "vendor_normalized"
    `);
  }
}
