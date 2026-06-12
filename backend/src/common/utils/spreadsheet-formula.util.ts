const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

export const neutralizeSpreadsheetFormulaCell = <T>(value: T): T | string => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  return FORMULA_PREFIXES.has(value[0]) ? `'${value}` : value;
};
