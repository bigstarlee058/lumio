export interface TaxExtractionResult {
  taxMentioned: boolean;
  taxRate?: number;
}

const TAX_RATE_PATTERN = /НДС\s*(\d{1,2})\s*%/i;
const TAX_INCLUDED_PATTERN = /в\s*т\.?\s*ч\.?\s*НДС/i;
const TAX_EXEMPT_PATTERNS = [
  /без\s*НДС/i,
  /НДС\s*не\s*облагается/i,
  /не\s*облагается\s*НДС/i,
  /освобожден.*НДС/i,
];

export function extractTaxFromPurpose(paymentPurpose: string): TaxExtractionResult {
  if (!paymentPurpose) {
    return { taxMentioned: false };
  }

  // Check for tax-exempt patterns first
  for (const pattern of TAX_EXEMPT_PATTERNS) {
    if (pattern.test(paymentPurpose)) {
      return { taxMentioned: false };
    }
  }

  // Check for explicit tax rate (e.g., "НДС 12%")
  const rateMatch = paymentPurpose.match(TAX_RATE_PATTERN);
  if (rateMatch) {
    return { taxMentioned: true, taxRate: Number(rateMatch[1]) };
  }

  // Check for tax mentioned without rate (e.g., "в т.ч. НДС")
  if (TAX_INCLUDED_PATTERN.test(paymentPurpose)) {
    return { taxMentioned: true };
  }

  return { taxMentioned: false };
}
