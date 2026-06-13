import { neutralizeSpreadsheetFormulaCell } from '@/common/utils/spreadsheet-formula.util';

describe('neutralizeSpreadsheetFormulaCell', () => {
  it.each(['=cmd()', '+SUM(A1:A2)', '-10+20', '@HYPERLINK("https://example.com")', '\t=cmd()', '\r=cmd()'])(
    'neutralizes formula-like value %j',
    value => {
      expect(neutralizeSpreadsheetFormulaCell(value)).toBe(`'${value}`);
    },
  );

  it.each(['normal text', '2026-06-12', '123.45', '', null, undefined])(
    'preserves non-formula value %j',
    value => {
      expect(neutralizeSpreadsheetFormulaCell(value as never)).toBe(value);
    },
  );
});
