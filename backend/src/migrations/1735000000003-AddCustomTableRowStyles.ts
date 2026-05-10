import { type MigrationInterface, type QueryRunner, TableColumn } from 'typeorm';

export class AddCustomTableRowStyles1735000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_table_rows');
    if (!hasTable) {
      return;
    }

    const hasColumn = await queryRunner.hasColumn('custom_table_rows', 'styles');
    if (hasColumn) {
      return;
    }

    await queryRunner.addColumn(
      'custom_table_rows',
      new TableColumn({
        name: 'styles',
        type: 'jsonb',
        isNullable: true,
        default: `'{}'::jsonb`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_table_rows');
    if (!hasTable) {
      return;
    }

    const hasColumn = await queryRunner.hasColumn('custom_table_rows', 'styles');
    if (!hasColumn) {
      return;
    }

    await queryRunner.dropColumn('custom_table_rows', 'styles');
  }
}
