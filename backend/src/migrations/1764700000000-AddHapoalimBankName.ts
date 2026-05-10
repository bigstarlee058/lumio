import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHapoalimBankName1764700000000 implements MigrationInterface {
  name = 'AddHapoalimBankName1764700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TYPE "bank_name_enum" ADD VALUE IF NOT EXISTS \'hapoalim\'');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from enums.
    // The 'hapoalim' value will remain but is harmless if unused.
  }
}
