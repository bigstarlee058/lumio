import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkScanReceiptsToStatements1764400000000 implements MigrationInterface {
  name = 'LinkScanReceiptsToStatements1764400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receipts" ADD "statement_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_receipts_statement_id" FOREIGN KEY ("statement_id") REFERENCES "statements"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipts_statement_id" ON "receipts" ("statement_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_receipts_statement_id"`);
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_statement_id"`,
    );
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN "statement_id"`);
  }
}
