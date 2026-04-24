export interface TransactionEnrichment {
  vendorNormalized?: string;
  categoryHint?: string;
  taxMentioned?: boolean;
  taxRate?: number;
  transactionNature?: string;
  confidence: number;
}
