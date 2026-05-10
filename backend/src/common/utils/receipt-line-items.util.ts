export async function extractLineItems(
  lines: string[],
  options: {
    numberPattern: string;
    currencyTokenPattern: string;
    shouldSkipLine: (description: string, amount: number, hasExplicitCurrency: boolean) => boolean;
    parseAmountFragment: (
      fragment: string,
    ) => Promise<{ amount: number; currency?: string } | null>;
    hasExplicitCurrency: (value: string) => boolean;
  },
): Promise<Array<{ description: string; amount: number }>> {
  const lineItems: Array<{ description: string; amount: number }> = [];
  const itemPattern = new RegExp(
    `^(.+?)\\s+((?:${options.currencyTokenPattern}\\s*)?(?:${options.numberPattern})(?:\\s*(?:${options.currencyTokenPattern}))?)$`,
    'i',
  );

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const match = trimmedLine.match(itemPattern);
    if (!match) {
      continue;
    }

    const description = match[1].trim();
    const parsedAmount = await options.parseAmountFragment(match[2]);
    const amount = parsedAmount?.amount;
    const hasExplicitCurrency = options.hasExplicitCurrency(match[2]);

    if (
      amount !== undefined &&
      Number.isFinite(amount) &&
      amount > 0 &&
      description.length > 0 &&
      description.length < 200
    ) {
      if (options.shouldSkipLine(description, amount, hasExplicitCurrency)) {
        continue;
      }

      lineItems.push({ description, amount });
    }
  }

  return lineItems;
}
