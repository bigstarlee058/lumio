import { createHash } from 'crypto';

interface FingerprintInput {
  workspaceId: string;
  accountNumber: string;
  date: Date | string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  merchant: string;
}

/**
 * Generates a deterministic SHA-256 fingerprint for a transaction.
 * Used for duplicate detection across import sessions.
 *
 * @param input Transaction fingerprint input data
 * @returns First 32 characters of SHA-256 hash (hex string)
 */
export function generateTransactionFingerprint(input: FingerprintInput): string {
  // Normalize date to YYYY-MM-DD format
  const dateStr =
    typeof input.date === 'string'
      ? input.date.split('T')[0]
      : input.date.toISOString().split('T')[0];

  // Normalize amount to fixed 2 decimal places
  const amountStr = Number(input.amount).toFixed(2);

  // Normalize merchant: lowercase, trim whitespace, take first 50 chars
  const merchantStr = input.merchant.toLowerCase().trim().substring(0, 50);

  // Normalize currency: uppercase
  const currencyStr = input.currency.toUpperCase();

  // Create deterministic string for hashing
  const fingerprintData = [
    input.workspaceId,
    input.accountNumber,
    dateStr,
    amountStr,
    currencyStr,
    input.direction,
    merchantStr,
  ].join('|');

  // Generate SHA-256 hash and return first 32 characters
  const hash = createHash('sha256').update(fingerprintData).digest('hex');
  return hash.substring(0, 32);
}

/**
 * Normalizes a string for fingerprint generation.
 * Removes extra whitespace, converts to lowercase.
 *
 * @param str String to normalize
 * @returns Normalized string
 */
export function normalizeForFingerprint(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}
