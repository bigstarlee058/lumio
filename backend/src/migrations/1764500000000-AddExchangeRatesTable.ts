import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeRatesTable1764500000000 implements MigrationInterface {
  name = 'AddExchangeRatesTable1764500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id"              UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "base_currency"   VARCHAR(10)  NOT NULL,
        "target_currency" VARCHAR(10)  NOT NULL,
        "rate"            NUMERIC(18,8) NOT NULL,
        "rate_date"       DATE         NOT NULL,
        "source"          VARCHAR(50)  NOT NULL,
        "created_at"      TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_exchange_rates_pair_date"
        ON "exchange_rates" ("base_currency", "target_currency", "rate_date")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_exchange_rates_pair_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
  }
}
