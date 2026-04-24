/**
 * Parsing regression tests — run on every push via CI.
 *
 * Tests the real parser logic by:
 * - PDF parsers: mocking only the pdfplumber extraction layer, providing
 *   realistic Cyrillic text and table data to the actual parser code.
 * - CSV/XLSX parsers: generating real files and parsing them end-to-end.
 *
 * This catches regressions in regex patterns, column mapping, number parsing,
 * date normalization, and bank detection — without requiring Python in CI.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BankName, FileType } from '@/entities/statement.entity';
import type { ParsedStatement } from '@/modules/parsing/interfaces/parsed-statement.interface';
import { type ExpectedFixture, buildGenericCsv, buildGenericXlsx } from '../../fixtures/parsing/build-fixtures';

// ── Mock pdfplumber extraction ───────────────────────────────────────────────

jest.mock('@/common/utils/pdf-parser.util', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockData = require('../../fixtures/parsing/pdf-mock-data');

  return {
    extractTextFromPdf: jest.fn(async (filePath: string) => {
      if (filePath.includes('kaspi')) return mockData.KASPI_MOCK_TEXT;
      if (filePath.includes('bereke')) return mockData.BEREKE_MOCK_TEXT;
      return '';
    }),
    extractTablesFromPdf: jest.fn(async (filePath: string) => {
      if (filePath.includes('kaspi')) {
        return { rows: mockData.KASPI_MOCK_TABLE_ROWS, structured: [] };
      }
      if (filePath.includes('bereke')) {
        return { rows: mockData.BEREKE_MOCK_TABLE_ROWS, structured: mockData.BEREKE_MOCK_STRUCTURED };
      }
      return { rows: [], structured: [] };
    }),
    extractTextAndLayoutFromPdf: jest.fn(async (filePath: string) => {
      if (filePath.includes('bereke')) {
        return { text: mockData.BEREKE_MOCK_TEXT, rows: mockData.BEREKE_MOCK_TEXT_ROWS };
      }
      return { text: '', rows: [] };
    }),
  };
});

// Must import after mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ParserFactoryService } = require('@/modules/parsing/services/parser-factory.service');

// ── Helpers ──────────────────────────────────────────────────────────────────

function sumField(transactions: ParsedStatement['transactions'], field: 'debit' | 'credit'): number {
  return transactions.reduce((acc, t) => acc + (Number(t[field]) || 0), 0);
}

// ── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;
let factory: InstanceType<typeof ParserFactoryService>;
let csvFixture: ExpectedFixture;
let xlsxFixture: ExpectedFixture;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parsing-regression-'));
  factory = new ParserFactoryService();
  process.env.AI_PARSING_ENABLED = '0';

  csvFixture = buildGenericCsv(tmpDir);
  xlsxFixture = buildGenericXlsx(tmpDir);
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Kaspi PDF parsing ────────────────────────────────────────────────────────

describe('Kaspi PDF parsing', () => {
  const filePath = '/tmp/fake-kaspi-statement.pdf';

  it('detects Kaspi bank', async () => {
    const detected = await factory.detectBankAndFormat(filePath, FileType.PDF);
    expect(detected.bankName).toBe(BankName.KASPI);
  });

  it('parses transactions with correct sums', async () => {
    const parser = await factory.getParser(BankName.KASPI, FileType.PDF, filePath);
    expect(parser).not.toBeNull();

    const result = await parser!.parse(filePath);

    expect(result.transactions.length).toBeGreaterThanOrEqual(3);
    expect(sumField(result.transactions, 'debit')).toBeCloseTo(195_000, 0);
    expect(sumField(result.transactions, 'credit')).toBeCloseTo(320_000, 0);
  });

  it('extracts metadata correctly', async () => {
    const parser = await factory.getParser(BankName.KASPI, FileType.PDF, filePath);
    const result = await parser!.parse(filePath);

    expect(result.metadata.accountNumber).toBe('KZ12722S000012345678');
    expect(result.metadata.currency).toBe('KZT');
    expect(result.metadata.balanceStart).toBeCloseTo(500_000, 0);
    expect(result.metadata.balanceEnd).toBeCloseTo(575_000, 0);
  });
});

// ── Bereke PDF parsing ───────────────────────────────────────────────────────

describe('Bereke PDF parsing', () => {
  const filePath = '/tmp/fake-bereke-statement.pdf';

  it('detects Bereke bank', async () => {
    const detected = await factory.detectBankAndFormat(filePath, FileType.PDF);
    expect([BankName.BEREKE_NEW, BankName.BEREKE_OLD]).toContain(detected.bankName);
  });

  it('parses transactions with expected amounts', async () => {
    const bankName = (await factory.detectBankAndFormat(filePath, FileType.PDF)).bankName;
    const parser = await factory.getParser(bankName, FileType.PDF, filePath);
    expect(parser).not.toBeNull();

    const result = await parser!.parse(filePath);

    expect(result.transactions.length).toBeGreaterThanOrEqual(2);

    // Verify expected amounts appear somewhere in parsed transactions
    const debits = result.transactions.map((t: ParsedStatement['transactions'][0]) => t.debit).filter(Boolean);
    const credits = result.transactions.map((t: ParsedStatement['transactions'][0]) => t.credit).filter(Boolean);

    expect(debits.some((d: number) => Math.abs(d - 200_000) < 100)).toBe(true);
    expect(credits.some((c: number) => Math.abs(c - 500_000) < 100)).toBe(true);
  });
});

// ── CSV parsing ──────────────────────────────────────────────────────────────

describe('CSV parsing', () => {
  it('parses transactions correctly', async () => {
    const parser = await factory.getParser(BankName.OTHER, FileType.CSV, csvFixture.filePath);
    expect(parser).not.toBeNull();

    const result = await parser!.parse(csvFixture.filePath);

    expect(result.transactions.length).toBe(csvFixture.expectedTransactionCount);
    expect(sumField(result.transactions, 'debit')).toBeCloseTo(csvFixture.expectedDebitSum, 2);
    expect(sumField(result.transactions, 'credit')).toBeCloseTo(csvFixture.expectedCreditSum, 2);
    expect(result.metadata.currency).toBe(csvFixture.expectedCurrency);
  });
});

// ── XLSX parsing ─────────────────────────────────────────────────────────────

describe('XLSX parsing', () => {
  it('parses transactions correctly', async () => {
    const parser = await factory.getParser(BankName.OTHER, FileType.XLSX, xlsxFixture.filePath);
    expect(parser).not.toBeNull();

    const result = await parser!.parse(xlsxFixture.filePath);

    expect(result.transactions.length).toBe(xlsxFixture.expectedTransactionCount);
    expect(sumField(result.transactions, 'debit')).toBeCloseTo(xlsxFixture.expectedDebitSum, 2);
    expect(sumField(result.transactions, 'credit')).toBeCloseTo(xlsxFixture.expectedCreditSum, 2);
    expect(result.metadata.currency).toBe(xlsxFixture.expectedCurrency);
  });
});
