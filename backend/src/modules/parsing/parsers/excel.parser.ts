import * as XLSX from 'xlsx';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseTabularParser } from './base-tabular.parser';

export class ExcelParser extends BaseTabularParser {
  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.XLSX || fileType === FileType.CSV;
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }

    // First row is header
    const headers = (data[0] as any[]).map(h => String(h).toLowerCase().trim());
    const rows = data.slice(1) as any[][];

    // Map columns
    const columnMapping = this.mapColumns(headers);

    // Extract metadata from first few rows or filename
    const metadata = this.extractMetadata(filePath, data as any[][]);

    // Extract transactions
    const transactions: ParsedTransaction[] = [];

    for (const row of rows) {
      if (!row || row.length === 0) {
        continue;
      }

      const transaction = this.parseRow(row, columnMapping, index => row[index], 'Excel');
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return {
      metadata,
      transactions,
    };
  }
  private extractMetadata(filePath: string, data: any[][]): ParsedStatement['metadata'] {
    // Try to extract from first rows or use defaults
    const accountNumber = this.extractAccountNumberFromData(data) || 'Unknown';
    const dateRange = this.extractDateRangeFromData(data);
    const headerInfo = this.extractHeaderFromRows(data as Array<string[] | undefined>);
    const localeInfo = this.detectLocale(
      [headerInfo.rawHeader, ...data.slice(0, 3).map(row => (row || []).join(' '))]
        .filter(Boolean)
        .join(' '),
    );

    return {
      accountNumber,
      dateFrom: dateRange.from || new Date(),
      dateTo: dateRange.to || new Date(),
      currency: 'KZT',
      rawHeader: headerInfo.rawHeader,
      normalizedHeader: headerInfo.normalizedHeader,
      locale: localeInfo.locale !== 'unknown' ? localeInfo.locale : undefined,
    };
  }

  private extractAccountNumberFromData(data: any[][]): string | null {
    // Look in first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row) {
        const text = row.join(' ');
        const account = this.extractAccountNumber(text);
        if (account) {
          return account;
        }
      }
    }
    return null;
  }

  private extractDateRangeFromData(data: any[][]): {
    from: Date | null;
    to: Date | null;
  } {
    // Look for date range in first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row) {
        const text = row.join(' ');
        const range = this.extractDateRange(text);
        if (range.from && range.to) {
          return range;
        }
      }
    }
    return { from: null, to: null };
  }
}
