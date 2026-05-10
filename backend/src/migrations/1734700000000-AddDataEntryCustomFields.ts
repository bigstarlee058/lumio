import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class AddDataEntryCustomFields1734700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('data_entry_custom_fields');
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'data_entry_custom_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'icon', type: 'varchar', length: '120', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'data_entry_custom_fields',
      new TableIndex({
        name: 'IDX_data_entry_custom_fields_user_name_unique',
        columnNames: ['user_id', 'name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('data_entry_custom_fields');
    if (exists) {
      await queryRunner.dropTable('data_entry_custom_fields');
    }
  }
}
