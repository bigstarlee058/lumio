import { type MigrationInterface, type QueryRunner, TableColumn } from 'typeorm';

export class AddViewSettingsToCustomTables1734800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCustomTables = await queryRunner.hasTable('custom_tables');
    if (!hasCustomTables) {
      return;
    }

    const table = await queryRunner.getTable('custom_tables');
    const hasColumn = table?.findColumnByName('view_settings');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({
          name: 'view_settings',
          type: 'jsonb',
          isNullable: false,
          default: "'{}'::jsonb",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCustomTables = await queryRunner.hasTable('custom_tables');
    if (!hasCustomTables) {
      return;
    }
    const table = await queryRunner.getTable('custom_tables');
    const hasColumn = table?.findColumnByName('view_settings');
    if (hasColumn) {
      await queryRunner.dropColumn('custom_tables', 'view_settings');
    }
  }
}
