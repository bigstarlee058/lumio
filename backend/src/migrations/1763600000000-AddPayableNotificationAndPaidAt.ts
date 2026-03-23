import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayableNotificationAndPaidAt1763600000000 implements MigrationInterface {
  name = 'AddPayableNotificationAndPaidAt1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payables" ADD COLUMN "paid_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query(
      'ALTER TABLE "payables" ADD COLUMN "due_soon_notified_at" TIMESTAMP WITH TIME ZONE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payables" DROP COLUMN "due_soon_notified_at"');
    await queryRunner.query('ALTER TABLE "payables" DROP COLUMN "paid_at"');
  }
}
