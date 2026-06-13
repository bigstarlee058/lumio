import type { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptText } from '../common/utils/encryption.util';

type TokenRow = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  encrypted_access_token?: string | null;
  encrypted_refresh_token?: string | null;
};

const encryptIfNeeded = (value: string | null): string | null => {
  if (!value || value.startsWith('enc:')) {
    return value;
  }
  return encryptText(value);
};

export class EncryptIntegrationTokens1778190000000 implements MigrationInterface {
  name = 'EncryptIntegrationTokens1778190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const credentials = (await queryRunner.query(`
      SELECT id, access_token, refresh_token
      FROM "google_sheets_credentials"
    `)) as TokenRow[];

    for (const row of credentials) {
      await queryRunner.query(
        `
          UPDATE "google_sheets_credentials"
          SET access_token = $1, refresh_token = $2
          WHERE id = $3
        `,
        [encryptIfNeeded(row.access_token), encryptIfNeeded(row.refresh_token), row.id],
      );
    }

    const sheets = (await queryRunner.query(`
      SELECT id, access_token, refresh_token
      FROM "google_sheets"
    `)) as TokenRow[];

    for (const row of sheets) {
      await queryRunner.query(
        `
          UPDATE "google_sheets"
          SET access_token = $1, refresh_token = $2
          WHERE id = $3
        `,
        [encryptIfNeeded(row.access_token), encryptIfNeeded(row.refresh_token), row.id],
      );
    }

    const integrationTokens = (await queryRunner.query(`
      SELECT id, access_token, refresh_token, encrypted_access_token, encrypted_refresh_token
      FROM "integration_tokens"
    `)) as TokenRow[];

    for (const row of integrationTokens) {
      await queryRunner.query(
        `
          UPDATE "integration_tokens"
          SET encrypted_access_token = $1,
              encrypted_refresh_token = $2,
              access_token = NULL,
              refresh_token = NULL
          WHERE id = $3
        `,
        [
          row.encrypted_access_token || encryptIfNeeded(row.access_token),
          row.encrypted_refresh_token || encryptIfNeeded(row.refresh_token),
          row.id,
        ],
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally no-op: restoring plaintext OAuth tokens would weaken the security posture.
  }
}
