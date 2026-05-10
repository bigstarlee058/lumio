import { type MigrationInterface, type QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddCategoryToCustomTables1734500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCustomTables = await queryRunner.hasTable('custom_tables');
    if (!hasCustomTables) {
      return;
    }

    const table = await queryRunner.getTable('custom_tables');
    const hasCategoryId = table?.columns?.some(c => c.name === 'category_id');
    if (!hasCategoryId) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({
          name: 'category_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      await queryRunner.query(`
        ALTER TABLE "custom_tables"
        ADD CONSTRAINT "FK_custom_tables_category_id"
        FOREIGN KEY ("category_id") REFERENCES "categories"("id")
        ON DELETE SET NULL
      `);
    }

    const hasIndex = (table?.indices || []).some(i => i.name === 'IDX_custom_tables_user_category');
    if (!hasIndex) {
      await queryRunner.createIndex(
        'custom_tables',
        new TableIndex({
          name: 'IDX_custom_tables_user_category',
          columnNames: ['user_id', 'category_id'],
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
    const hasCategoryId = table?.columns?.some(c => c.name === 'category_id');
    if (!hasCategoryId) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "custom_tables" DROP CONSTRAINT IF EXISTS "FK_custom_tables_category_id"`,
    );
    await queryRunner.dropIndex('custom_tables', 'IDX_custom_tables_user_category');
    await queryRunner.dropColumn('custom_tables', 'category_id');
  }
}
