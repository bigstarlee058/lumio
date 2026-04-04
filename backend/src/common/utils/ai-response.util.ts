import type { ParsedTransaction } from '@/modules/parsing/interfaces/parsed-statement.interface';

export function unwrapAiJson(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

export function stripHtmlForAi(value: string): string {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapParsedTransaction(
  raw: any,
  normalizers: {
    normalizeDate: (value: string) => Date | null;
    normalizeNumber: (value: string | number | null | undefined) => number | null;
  },
): ParsedTransaction | null {
  const transactionDate =
    normalizers.normalizeDate(raw?.date || raw?.transactionDate || raw?.date_iso || '') || null;

  if (!transactionDate) {
    return null;
  }

  const debit = normalizers.normalizeNumber(raw?.debit ?? raw?.amount_debit ?? raw?.amount) || undefined;
  const credit =
    normalizers.normalizeNumber(raw?.credit ?? raw?.amount_credit ?? raw?.incoming) || undefined;

  const counterpartyName =
    raw?.counterparty_name ||
    raw?.counterparty ||
    raw?.beneficiary ||
    raw?.receiver ||
    raw?.payer ||
    raw?.partner ||
    raw?.beneficiary_name ||
    'Неизвестный контрагент';

  const counterpartyBank =
    raw?.counterparty_bank ||
    raw?.bank ||
    raw?.bank_name ||
    raw?.beneficiary_bank ||
    raw?.receiver_bank ||
    raw?.bank_bic ||
    raw?.bic;

  const counterpartyBin = raw?.counterparty_bin || raw?.bin || raw?.iin || raw?.tax_id;

  return {
    transactionDate,
    documentNumber: raw?.document_number || raw?.document || raw?.doc || raw?.doc_number,
    counterpartyName,
    counterpartyBin,
    counterpartyAccount: raw?.counterparty_account || raw?.account,
    counterpartyBank,
    debit,
    credit,
    paymentPurpose:
      (raw?.purpose || raw?.payment_purpose || raw?.description || raw?.comment || '')
        .toString()
        .trim() || 'Не указано',
    currency: raw?.currency || 'KZT',
  };
}
