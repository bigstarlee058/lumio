import { type MigrationInterface, type QueryRunner, TableUnique } from 'typeorm';

export class AllowDuplicateStatementFileHash1735200000001 implements MigrationInterface {
  name = 'AllowDuplicateStatementFileHash1735200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('statements');
    if (!table) {
      return;
    }

    const unique = table.uniques.find(
      u => u.columnNames.length === 1 && u.columnNames[0] === 'file_hash',
    );
    if (unique) {
      await queryRunner.dropUniqueConstraint(table, unique);
      return;
    }

    const uniqueIndex = table.indices.find(
      i => i.isUnique && i.columnNames.length === 1 && i.columnNames[0] === 'file_hash',
    );
    if (uniqueIndex) {
      await queryRunner.dropIndex(table, uniqueIndex);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('statements');
    if (!table) {
      return;
    }

    const hasUnique = table.uniques.some(
      u => u.columnNames.length === 1 && u.columnNames[0] === 'file_hash',
    );
    if (hasUnique) {
      return;
    }

    await queryRunner.createUniqueConstraint(
      table,
      new TableUnique({
        columnNames: ['file_hash'],
      }),
    );
  }
}
