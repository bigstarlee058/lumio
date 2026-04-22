import type { ParsingDroppedSample } from '../ParsingWarningsPanel';

export const normalizeCurrencyCode = (value: string): string => value.trim().toUpperCase();

export const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const toNumberString = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
};

export interface DroppedSampleDraft {
  transactionDate: string;
  counterpartyName: string;
  paymentPurpose: string;
  debit: string;
  credit: string;
  currency: string;
}

const EMPTY_DRAFT: DroppedSampleDraft = { transactionDate: '', counterpartyName: '', paymentPurpose: '', debit: '', credit: '', currency: '' };

function draftFromTx(tx: ParsingDroppedSample['transaction']): DroppedSampleDraft {
  if (!tx) return EMPTY_DRAFT;
  return {
    transactionDate: toStringValue(tx.transactionDate),
    counterpartyName: toStringValue(tx.counterpartyName),
    paymentPurpose: toStringValue(tx.paymentPurpose),
    debit: toNumberString(tx.debit),
    credit: toNumberString(tx.credit),
    currency: normalizeCurrencyCode(toStringValue(tx.currency)),
  };
}

export const toDraft = (sample: string | ParsingDroppedSample): DroppedSampleDraft => {
  if (typeof sample === 'string') return EMPTY_DRAFT;
  return draftFromTx(sample.transaction);
};

export const parsePositiveNumber = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const hasValidDate = (value: string): boolean => {
  if (!value.trim()) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export const canConvertDraft = (draft: DroppedSampleDraft): boolean => {
  const debit = parsePositiveNumber(draft.debit);
  const credit = parsePositiveNumber(draft.credit);
  return hasValidDate(draft.transactionDate) && Boolean(debit ?? credit);
};

export const extractTxKey = (value: string): string | null => {
  const match = value.match(/tx#\d+/i);
  return match ? match[0].toLowerCase() : null;
};

export const isRepairableWarning = (value: string): boolean =>
  /tx#\d+/i.test(value) && /\bskipped\b/i.test(value);

export const isBalanceMismatchWarning = (value: string): boolean =>
  /^Balance mismatch:/i.test(value);

export const toDroppedSample = (sample: string | ParsingDroppedSample): ParsingDroppedSample =>
  typeof sample === 'string' ? { reason: sample } : sample;

const extractTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const formatDroppedSampleText = (sample: string | ParsingDroppedSample): string => {
  if (typeof sample === 'string') return sample;
  const tx = sample.transaction;
  const counterpartyName = extractTrimmedString(tx?.counterpartyName);
  const paymentPurpose = extractTrimmedString(tx?.paymentPurpose);
  const context = [counterpartyName, paymentPurpose].filter(Boolean).join(' - ');
  return context ? `${sample.reason}: ${context}` : sample.reason;
};
