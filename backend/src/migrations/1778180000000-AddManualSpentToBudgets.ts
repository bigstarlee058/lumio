import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualSpentToBudgets1778180000000 implements MigrationInterface {
  name = 'AddManualSpentToBudgets1778180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD "manual_spent_amount" decimal(15,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budgets"
      DROP COLUMN "manual_spent_amount"
    `);
  }
}
