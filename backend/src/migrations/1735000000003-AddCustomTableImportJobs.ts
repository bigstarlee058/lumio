import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class AddCustomTableImportJobs1735000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_table_import_jobs');
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'custom_table_import_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'type', type: 'varchar', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false, default: `'pending'` },
          { name: 'progress', type: 'int', isNullable: false, default: 0 },
          { name: 'stage', type: 'varchar', isNullable: true },
          { name: 'payload', type: 'jsonb', isNullable: false, default: "'{}'::jsonb" },
          { name: 'result', type: 'jsonb', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'locked_at', type: 'timestamp', isNullable: true },
          { name: 'locked_by', type: 'varchar', isNullable: true },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'finished_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'custom_table_import_jobs',
      new TableIndex({ name: 'IDX_custom_table_import_jobs_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'custom_table_import_jobs',
      new TableIndex({ name: 'IDX_custom_table_import_jobs_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'custom_table_import_jobs',
      new TableIndex({
        name: 'IDX_custom_table_import_jobs_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_table_import_jobs');
    if (hasTable) {
      await queryRunner.dropTable('custom_table_import_jobs');
    }
  }
}
