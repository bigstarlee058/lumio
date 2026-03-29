/* eslint-disable no-console */

const { existsSync } = require('fs');
const path = require('path');

const compiledDataSourcePath = existsSync(path.join(__dirname, '../dist/src/data-source.js'))
  ? '../dist/src/data-source'
  : '../dist/data-source';

const { AppDataSource } = require(compiledDataSourcePath);
const { MigrationExecutor } = require('typeorm');

const LOCK_KEY_1 = Number.parseInt(process.env.MIGRATIONS_LOCK_KEY_1 || '240517', 10);
const LOCK_KEY_2 = Number.parseInt(process.env.MIGRATIONS_LOCK_KEY_2 || '1', 10);

const RETRY_ATTEMPTS = Number.parseInt(process.env.MIGRATIONS_RETRY_ATTEMPTS || '10', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.MIGRATIONS_RETRY_DELAY_MS || '2000', 10);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isFiniteInt(value) {
  return Number.isFinite(value) && Number.isInteger(value);
}

async function runMigrationsOnce() {
  let queryRunner;

  try {
    if (process.env.NODE_ENV === 'production') {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl || databaseUrl.trim() === '') {
        throw new Error('Missing required environment variable: DATABASE_URL');
      }
    }

    if (!isFiniteInt(LOCK_KEY_1) || !isFiniteInt(LOCK_KEY_2)) {
      throw new Error(
        `Invalid MIGRATIONS_LOCK_KEY_1/2: ${process.env.MIGRATIONS_LOCK_KEY_1}/${process.env.MIGRATIONS_LOCK_KEY_2}`,
      );
    }

    console.log('Initializing data source...');
    await AppDataSource.initialize();

    queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    console.log(`Acquiring Postgres advisory lock (${LOCK_KEY_1}, ${LOCK_KEY_2})...`);
    await queryRunner.query('SELECT pg_advisory_lock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]);

    console.log('Running migrations...');
    const executor = new MigrationExecutor(AppDataSource, queryRunner);
    const migrations = await executor.executePendingMigrations();

    console.log(`Migrations completed successfully! Applied: ${migrations.length}`);
    return true;
  } finally {
    if (queryRunner) {
      try {
        console.log(`Releasing Postgres advisory lock (${LOCK_KEY_1}, ${LOCK_KEY_2})...`);
        await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]);
      } catch (error) {
        console.error('Failed to release advisory lock:', error);
      }

      try {
        await queryRunner.release();
      } catch (error) {
        console.error('Failed to release queryRunner:', error);
      }
    }

    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch (error) {
      console.error('Failed to destroy data source:', error);
    }
  }
}

async function runWithRetries() {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      await runMigrationsOnce();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Migration attempt ${attempt}/${RETRY_ATTEMPTS} failed:`, error);
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

runWithRetries()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
