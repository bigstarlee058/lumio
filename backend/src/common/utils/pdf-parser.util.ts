import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface PdfTextRow {
  page: number;
  y: number;
  text: string;
  items: PdfTextItem[];
}

export interface PdfTableRowCell {
  text: string;
  x: number;
}

export interface PdfTableRow {
  page: number;
  y: number;
  columns: string[];
  cells: PdfTableRowCell[];
}

interface PdfPlumberTable {
  page: number;
  data: string[][];
  structured: PdfTableRow[];
}

interface PdfPlumberResult {
  text: string;
  rows: PdfTextRow[];
  tables: PdfPlumberTable[];
}

type RawPdfTextItem = Partial<Record<'text' | 'x' | 'y' | 'width' | 'height' | 'page', unknown>>;
type RawPdfTextRow = Partial<Record<'page' | 'y' | 'text' | 'items', unknown>>;
type RawPdfStructuredCell = Partial<Record<'text' | 'x', unknown>>;
type RawPdfStructuredRow = Partial<Record<'page' | 'y' | 'columns' | 'cells', unknown>>;
type RawPdfTable = Partial<Record<'page' | 'data' | 'structured', unknown>>;

const parserCache = new Map<string, PdfPlumberResult>();
let pythonExecutable: string | null = null;

/**
 * Extract text from PDF file using pdfplumber (Python).
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const parsed = await runPdfPlumber(filePath);
  return parsed.text || '';
}

/**
 * Extract text with layout information (coordinates) using pdfplumber.
 */
export async function extractTextAndLayoutFromPdf(
  filePath: string,
): Promise<{ text: string; rows: PdfTextRow[] }> {
  const parsed = await runPdfPlumber(filePath);
  return { text: parsed.text || '', rows: parsed.rows || [] };
}

/**
 * Extract table-like rows from PDF using pdfplumber.
 * Returns both simple rows (array of cell values) and structured rows with coordinates.
 */
export async function extractTablesFromPdf(
  filePath: string,
): Promise<{ rows: string[][]; structured: PdfTableRow[] }> {
  const parsed = await runPdfPlumber(filePath);
  const rows = (parsed.tables || []).flatMap(table => table.data || []);
  const structured = (parsed.tables || []).flatMap(table => table.structured || []);
  return { rows, structured };
}

function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`);
  }
}

function resolveScriptPath(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'scripts', 'pdfplumber_parser.py'),
    path.resolve(process.cwd(), 'backend', 'scripts', 'pdfplumber_parser.py'),
    path.resolve(process.cwd(), 'scripts', 'pdfplumber_parser.py'),
  ];

  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      'Could not locate pdfplumber_parser.py. Ensure backend/scripts/pdfplumber_parser.py is available at runtime.',
    );
  }

  return found;
}

function getPythonCandidates(): string[] {
  const fromEnv = process.env.PDF_PARSER_PYTHON;
  const backendVenv = path.resolve(process.cwd(), 'backend', '.venv', 'bin', 'python');
  const rootVenv = path.resolve(process.cwd(), '.venv', 'bin', 'python');
  const localVenv = path.resolve(__dirname, '..', '..', '..', '.venv', 'bin', 'python');

  const candidates = [fromEnv, backendVenv, rootVenv, localVenv, 'python3', 'python'].filter(
    (entry): entry is string => Boolean(entry),
  );

  return Array.from(new Set(candidates));
}

function resolvePythonExecutable(): string {
  if (pythonExecutable) {
    return pythonExecutable;
  }

  for (const candidate of getPythonCandidates()) {
    const versionCheck = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (versionCheck.error || versionCheck.status !== 0) {
      continue;
    }
    const libraryCheck = spawnSync(candidate, ['-c', 'import pdfplumber'], { encoding: 'utf8' });
    if (!libraryCheck.error && libraryCheck.status === 0) {
      pythonExecutable = candidate;
      return candidate;
    }
  }

  throw new Error(
    'Python 3 with pdfplumber is required to parse PDF statements. Install it with "pip install pdfplumber" and ensure python3 is available in PATH.',
  );
}

async function runPdfPlumber(filePath: string): Promise<PdfPlumberResult> {
  ensureFileExists(filePath);

  const cached = parserCache.get(filePath);
  if (cached) {
    return cached;
  }

  const python = resolvePythonExecutable();
  const scriptPath = resolveScriptPath();

  return new Promise<PdfPlumberResult>((resolve, reject) => {
    const proc = spawn(python, [scriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', error => {
      reject(
        new Error(
          `[PDF Parser] Failed to start pdfplumber process: ${error.message}. Is python3 installed?`,
        ),
      );
    });

    proc.on('close', code => {
      if (code !== 0) {
        return reject(
          new Error(
            `[PDF Parser] pdfplumber exited with code ${code}: ${stderr.trim() || 'no stderr'}`,
          ),
        );
      }

      try {
        const parsed = JSON.parse(stdout) as Partial<PdfPlumberResult>;
        const normalized = normalizeResult(parsed);
        parserCache.set(filePath, normalized);
        resolve(normalized);
      } catch (error) {
        reject(
          new Error(
            `[PDF Parser] Could not parse pdfplumber output: ${
              (error as Error).message
            }. Output: ${stderr || stdout}`,
          ),
        );
      }
    });
  });
}

function normalizeResult(raw: Partial<PdfPlumberResult>): PdfPlumberResult {
  return {
    text: typeof raw?.text === 'string' ? raw.text : '',
    rows: Array.isArray(raw?.rows) ? raw.rows.map(normalizeRow).filter(Boolean) : [],
    tables: Array.isArray(raw?.tables)
      ? (raw.tables.map(normalizeTable).filter(Boolean) as PdfPlumberTable[])
      : [],
  };
}

function normalizeRow(row: RawPdfTextRow | null | undefined): PdfTextRow | null {
  if (!row) {
    return null;
  }

  const items = Array.isArray(row.items)
    ? (row.items.map(normalizeItem).filter(Boolean) as PdfTextItem[])
    : [];

  return {
    page: Number(row.page) || 1,
    y: Number(row.y) || 0,
    text: typeof row.text === 'string' ? row.text : '',
    items,
  };
}

function normalizeItem(item: RawPdfTextItem | null | undefined): PdfTextItem | null {
  if (!item || typeof item.text !== 'string' || !item.text.trim()) {
    return null;
  }

  return {
    text: item.text,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    page: Number(item.page) || 1,
  };
}

function normalizeTable(table: RawPdfTable | null | undefined): PdfPlumberTable | null {
  if (!table) {
    return null;
  }

  const data: string[][] = Array.isArray(table.data)
    ? table.data.map(row => (Array.isArray(row) ? row.map(cleanText) : []))
    : [];

  const structured: PdfTableRow[] = Array.isArray(table.structured)
    ? (table.structured.map(normalizeStructuredRow).filter(Boolean) as PdfTableRow[])
    : [];

  return {
    page: Number(table.page) || 1,
    data,
    structured,
  };
}

function normalizeStructuredRow(row: RawPdfStructuredRow | null | undefined): PdfTableRow | null {
  if (!row) {
    return null;
  }

  const cells: PdfTableRowCell[] = Array.isArray(row.cells)
    ? row.cells.map((cell: RawPdfStructuredCell) => ({
        text: cleanText(cell?.text),
        x: Number(cell?.x) || 0,
      }))
    : [];

  return {
    page: Number(row.page) || 1,
    y: Number(row.y) || 0,
    columns: Array.isArray(row.columns) ? row.columns.map(cleanText) : [],
    cells,
  };
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toString().replace(/\s+/g, ' ').trim();
}
