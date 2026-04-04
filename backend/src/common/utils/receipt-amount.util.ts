export interface ReceiptAmountParserLike {
  parseAmount(amountString: string): Promise<{ amount: number; currency?: string } | null>;
  isValidAmount(amount: number): boolean;
  getSupportedCurrencies(): string[];
  detectCurrencyFromContext(text: string): string | null;
}

type AmountCandidate = {
  amount: number;
  currency?: string;
  score: number;
};

function scoreAmountCandidate(
  amount: number,
  hasTotalKeyword: boolean,
  explicitCurrency: boolean,
  lineIndex: number,
  totalLines: number,
): number {
  let score = 0;

  if (hasTotalKeyword) {
    score += 100;
  }

  if (explicitCurrency) {
    score += 30;
  }

  const lineWeight = totalLines > 1 ? lineIndex / (totalLines - 1) : 1;
  score += lineWeight * 20;
  score += Math.min(Math.log10(amount + 1) * 5, 20);

  return score;
}

export function extractCurrency(
  text: string,
  amountParser: ReceiptAmountParserLike,
  symbolToCurrency: Record<string, string>,
): string | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = text.replace(/\u00a0/g, ' ');
  const supportedCurrencies = new Set(amountParser.getSupportedCurrencies());

  const codeMatches = normalized.toUpperCase().match(/\b[A-Z]{3}\b/g) || [];
  for (const code of codeMatches) {
    if (supportedCurrencies.has(code)) {
      return code;
    }
  }

  for (const [symbol, code] of Object.entries(symbolToCurrency)) {
    if (normalized.includes(symbol)) {
      return code;
    }
  }

  const contextualCurrency = amountParser.detectCurrencyFromContext(normalized);
  if (contextualCurrency) {
    return contextualCurrency;
  }

  const lowerText = normalized.toLowerCase();
  if (/\b(тенге|тг)\b/.test(lowerText)) {
    return 'KZT';
  }
  if (/\b(dollars?|доллар)\b/.test(lowerText)) {
    return 'USD';
  }
  if (/\b(euros?|евро)\b/.test(lowerText)) {
    return 'EUR';
  }
  if (/\b(rubles?|руб(ль|лей|ля|.)?)\b/.test(lowerText)) {
    return 'RUB';
  }

  return undefined;
}

export function extractAmountFragments(
  line: string,
  includeNumbersWithoutCurrency: boolean,
  numberPattern: string,
  currencyTokenPattern: string,
): string[] {
  const withCurrencyPattern = new RegExp(
    `${currencyTokenPattern}\\s*(?:${numberPattern})|(?:${numberPattern})\\s*${currencyTokenPattern}`,
    'gi',
  );
  const fragments = new Set<string>();

  for (const match of line.matchAll(withCurrencyPattern)) {
    const value = match[0]?.trim();
    if (value) {
      fragments.add(value);
    }
  }

  if (includeNumbersWithoutCurrency) {
    const numberRegex = new RegExp(numberPattern, 'g');
    for (const match of line.matchAll(numberRegex)) {
      const value = match[0]?.trim();
      if (value && /\d/.test(value)) {
        fragments.add(value);
      }
    }
  }

  return Array.from(fragments);
}

export function extractBestNumberPart(text: string, numberPattern: string): string | undefined {
  const numberRegex = new RegExp(numberPattern, 'g');
  const matches = text.match(numberRegex);
  if (!matches || matches.length === 0) {
    return undefined;
  }

  return matches.sort((left, right) => right.length - left.length)[0];
}

export async function parseAmountFragment(
  fragment: string,
  options: {
    amountParser: ReceiptAmountParserLike;
    extractCurrency: (text: string) => string | undefined;
    numberPattern: string;
  },
): Promise<{ amount: number; currency?: string } | null> {
  const normalized = fragment.replace(/\u00a0/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const currency = options.extractCurrency(normalized);
  const numberPart = extractBestNumberPart(normalized, options.numberPattern);
  if (!numberPart) {
    return null;
  }

  const parsedNumber = await options.amountParser.parseAmount(numberPart);
  if (parsedNumber && options.amountParser.isValidAmount(parsedNumber.amount)) {
    return {
      amount: Math.abs(parsedNumber.amount),
      currency,
    };
  }

  const direct = await options.amountParser.parseAmount(normalized);
  if (direct && options.amountParser.isValidAmount(direct.amount)) {
    return {
      amount: Math.abs(direct.amount),
      currency: direct.currency || currency,
    };
  }

  return null;
}

export async function extractAmountWithCurrency(
  lines: string[],
  fullText: string,
  options: {
    amountParser: ReceiptAmountParserLike;
    numberPattern: string;
    extractCurrency: (text: string) => string | undefined;
    extractAmountFragments: (
      line: string,
      includeNumbersWithoutCurrency: boolean,
      currencyTokenPattern: string,
    ) => string[];
    parseAmountFragment: (fragment: string) => Promise<{ amount: number; currency?: string } | null>;
    getCurrencyTokenPattern: () => string;
    hasTotalKeyword: (line: string) => boolean;
  },
): Promise<{ amount: number; currency?: string } | undefined> {
  const documentCurrency = options.extractCurrency(fullText);
  const candidates: AmountCandidate[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const hasTotalKeyword = options.hasTotalKeyword(line);
    const fragments = options.extractAmountFragments(
      line,
      hasTotalKeyword,
      options.getCurrencyTokenPattern(),
    );

    for (const fragment of fragments) {
      const parsed = await options.parseAmountFragment(fragment);
      if (!parsed || parsed.amount <= 0) {
        continue;
      }

      const currency = parsed.currency || options.extractCurrency(line) || documentCurrency;
      const explicitCurrency = Boolean(parsed.currency || options.extractCurrency(fragment));
      const score = scoreAmountCandidate(
        parsed.amount,
        hasTotalKeyword,
        explicitCurrency,
        index,
        lines.length,
      );

      candidates.push({
        amount: parsed.amount,
        currency,
        score,
      });
    }
  }

  if (!candidates.length) {
    return undefined;
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.amount - left.amount;
  });

  return {
    amount: candidates[0].amount,
    currency: candidates[0].currency,
  };
}
