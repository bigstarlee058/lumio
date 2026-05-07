import { createHash } from 'crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportSessionAndFingerprint1738300000000 implements MigrationInterface {
  name = 'AddImportSessionAndFingerprint1738300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create import_sessions table
    await queryRunner.query(`
      CREATE TABLE "import_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid,
        "statement_id" uuid,
        "status" character varying NOT NULL DEFAULT 'pending',
        "mode" character varying NOT NULL,
        "file_hash" character varying NOT NULL,
        "file_name" character varying NOT NULL,
        "file_size" integer NOT NULL,
        "session_metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_import_sessions" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys for import_sessions
    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_statement"
      FOREIGN KEY ("statement_id") REFERENCES "statements"("id") ON DELETE CASCADE
    `);

    // Create indexes for import_sessions
    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_workspace" ON "import_sessions" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_user" ON "import_sessions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_statement" ON "import_sessions" ("statement_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_status" ON "import_sessions" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_file_hash" ON "import_sessions" ("file_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_created_at" ON "import_sessions" ("created_at")
    `);

    // Add fingerprint column to transactions
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD "fingerprint" character varying(64)
    `);

    // Add import_session_id column to transactions
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD "import_session_id" uuid
    `);

    // Add foreign key for import_session_id
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_import_session"
      FOREIGN KEY ("import_session_id") REFERENCES "import_sessions"("id") ON DELETE SET NULL
    `);

    // Create composite index on (workspace_id, fingerprint)
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_workspace_fingerprint" ON "transactions" ("workspace_id", "fingerprint")
    `);

    // Create partial unique index on (workspace_id, fingerprint) WHERE is_duplicate = false
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_transactions_unique_fingerprint" ON "transactions" ("workspace_id", "fingerprint") WHERE "is_duplicate" = false AND "fingerprint" IS NOT NULL
    `);

    // Backfill fingerprints for existing transactions
    console.log('Starting fingerprint backfill for existing transactions...');

    // Get all transactions with their statement account numbers
    const transactions = await queryRunner.query(`
      SELECT
        t.id,
        t.workspace_id,
        t.transaction_date,
        t.debit,
        t.credit,
        t.currency,
        t.counterparty_name,
        s.account_number
      FROM transactions t
      LEFT JOIN statements s ON t.statement_id = s.id
      WHERE t.fingerprint IS NULL
      ORDER BY t.created_at ASC
    `);

    console.log(`Found ${transactions.length} transactions to process`);

    let processedCount = 0;
    let skippedCount = 0;
    const batchSize = 1000;

    // Process in batches to avoid memory issues
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      for (const tx of batch) {
        // Skip if missing required data
        if (!(tx.workspace_id && tx.transaction_date)) {
          skippedCount++;
          continue;
        }

        // Determine amount and direction
        const debit = tx.debit ? Number.parseFloat(tx.debit) : 0;
        const credit = tx.credit ? Number.parseFloat(tx.credit) : 0;
        const amount = debit > 0 ? debit : credit;
        const direction = debit > 0 ? 'debit' : 'credit';

        // Skip if no amount
        if (amount === 0) {
          skippedCount++;
          continue;
        }

        // Use account number from statement, or use 'UNKNOWN' as fallback
        const accountNumber = tx.account_number || 'UNKNOWN';

        // Normalize date to YYYY-MM-DD
        const date = new Date(tx.transaction_date);
        const dateStr = date.toISOString().split('T')[0];

        // Normalize merchant name
        const merchant = (tx.counterparty_name || 'UNKNOWN').toLowerCase().trim().substring(0, 50);

        // Normalize currency
        const currency = (tx.currency || 'KZT').toUpperCase();

        // Generate fingerprint
        const fingerprintData = [
          tx.workspace_id,
          accountNumber,
          dateStr,
          amount.toFixed(2),
          currency,
          direction,
          merchant,
        ].join('|');

        const hash = createHash('sha256').update(fingerprintData).digest('hex');
        const fingerprint = hash.substring(0, 32);

        // Update transaction with fingerprint
        await queryRunner.query('UPDATE transactions SET fingerprint = $1 WHERE id = $2', [
          fingerprint,
          tx.id,
        ]);

        processedCount++;
      }

      console.log(
        `Processed ${Math.min(i + batchSize, transactions.length)}/${transactions.length} transactions`,
      );
    }

    console.log(
      `Fingerprint backfill complete: ${processedCount} processed, ${skippedCount} skipped`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_transactions_unique_fingerprint"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_workspace_fingerprint"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_file_hash"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_statement"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_user"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_workspace"`);

    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_import_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_statement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_workspace"`,
    );

    // Drop columns from transactions
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "import_session_id"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "fingerprint"`);

    // Drop import_sessions table
    await queryRunner.query(`DROP TABLE "import_sessions"`);
  }
}
