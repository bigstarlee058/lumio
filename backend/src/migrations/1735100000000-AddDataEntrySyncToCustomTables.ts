import { type MigrationInterface, type QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddDataEntrySyncToCustomTables1735100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_tables');
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable('custom_tables');
    const hasColumn = (name: string) => Boolean(table?.columns.find(col => col.name === name));

    if (!hasColumn('data_entry_scope')) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({
          name: 'data_entry_scope',
          type: 'varchar',
          length: '16',
          isNullable: true,
        }),
      );
    }

    if (!hasColumn('data_entry_type')) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({
          name: 'data_entry_type',
          type: 'varchar',
          length: '16',
          isNullable: true,
        }),
      );
    }

    if (!hasColumn('data_entry_custom_tab_id')) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({ name: 'data_entry_custom_tab_id', type: 'uuid', isNullable: true }),
      );
    }

    if (!hasColumn('data_entry_synced_at')) {
      await queryRunner.addColumn(
        'custom_tables',
        new TableColumn({ name: 'data_entry_synced_at', type: 'timestamp', isNullable: true }),
      );
    }

    const refreshed = await queryRunner.getTable('custom_tables');
    const hasIndex = (name: string) => Boolean(refreshed?.indices.find(idx => idx.name === name));

    if (!hasIndex('IDX_custom_tables_data_entry_scope_type')) {
      await queryRunner.createIndex(
        'custom_tables',
        new TableIndex({
          name: 'IDX_custom_tables_data_entry_scope_type',
          columnNames: ['data_entry_scope', 'data_entry_type'],
        }),
      );
    }

    if (!hasIndex('IDX_custom_tables_data_entry_custom_tab_id')) {
      await queryRunner.createIndex(
        'custom_tables',
        new TableIndex({
          name: 'IDX_custom_tables_data_entry_custom_tab_id',
          columnNames: ['data_entry_custom_tab_id'],
        }),
      );
    }

    const hasAuditLogs = await queryRunner.hasTable('audit_logs');
    if (!hasAuditLogs) {
      return;
    }

    await queryRunner.query(`
      UPDATE custom_tables t
      SET data_entry_scope = COALESCE(t.data_entry_scope, l.metadata->>'scope'),
          data_entry_type = COALESCE(t.data_entry_type, l.metadata->>'type'),
          data_entry_synced_at = COALESCE(t.data_entry_synced_at, t.created_at)
      FROM audit_logs l
      WHERE l.action::text = 'custom_table.create'
        AND l.metadata->>'source' = 'data_entry_export'
        AND l.metadata->>'tableId' = t.id::text
    `);

    await queryRunner.query(`
      UPDATE custom_tables t
      SET data_entry_custom_tab_id = COALESCE(t.data_entry_custom_tab_id, (l.metadata->>'customTabId')::uuid),
          data_entry_synced_at = COALESCE(t.data_entry_synced_at, t.created_at)
      FROM audit_logs l
      WHERE l.action::text = 'custom_table.create'
        AND l.metadata->>'source' = 'data_entry_custom_tab_export'
        AND l.metadata->>'tableId' = t.id::text
        AND l.metadata->>'customTabId' IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('custom_tables');
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable('custom_tables');
    const hasIndex = (name: string) => Boolean(table?.indices.find(idx => idx.name === name));
    const hasColumn = (name: string) => Boolean(table?.columns.find(col => col.name === name));

    if (hasIndex('IDX_custom_tables_data_entry_scope_type')) {
      await queryRunner.dropIndex('custom_tables', 'IDX_custom_tables_data_entry_scope_type');
    }

    if (hasIndex('IDX_custom_tables_data_entry_custom_tab_id')) {
      await queryRunner.dropIndex('custom_tables', 'IDX_custom_tables_data_entry_custom_tab_id');
    }

    if (hasColumn('data_entry_synced_at')) {
      await queryRunner.dropColumn('custom_tables', 'data_entry_synced_at');
    }

    if (hasColumn('data_entry_custom_tab_id')) {
      await queryRunner.dropColumn('custom_tables', 'data_entry_custom_tab_id');
    }

    if (hasColumn('data_entry_type')) {
      await queryRunner.dropColumn('custom_tables', 'data_entry_type');
    }

    if (hasColumn('data_entry_scope')) {
      await queryRunner.dropColumn('custom_tables', 'data_entry_scope');
    }
  }
}
