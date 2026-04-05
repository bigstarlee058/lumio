import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, MoreThanOrEqual, type Repository } from 'typeorm';
import { GoogleSheetRow } from '../../../entities/google-sheet-row.entity';

interface SummaryParams {
  userId: string;
  spreadsheetId?: string;
  sheetName?: string;
  days?: number;
}

interface TimeseriesPoint {
  date: string;
  income: number;
  expense: number;
}

export interface GoogleSheetsSummaryResponse {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: TimeseriesPoint[];
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    rowNumber: number;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
}

@Injectable()
export class GoogleSheetsAnalyticsService {
  constructor(
    @InjectRepository(GoogleSheetRow)
    private readonly sheetRowsRepository: Repository<GoogleSheetRow>,
  ) {}

  async getSummary(params: SummaryParams): Promise<GoogleSheetsSummaryResponse> {
    const days = params.days && params.days > 0 ? params.days : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: FindOptionsWhere<GoogleSheetRow> = {
      userId: params.userId,
      updatedAt: MoreThanOrEqual(since),
    };

    if (params.spreadsheetId) {
      where.spreadsheetId = params.spreadsheetId;
    }
    if (params.sheetName) {
      where.sheetName = params.sheetName;
    }

    // Limit rows to a reasonable window to avoid heavy payloads
    const rows = await this.sheetRowsRepository.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 2000,
    });

    const totals = { income: 0, expense: 0, net: 0, rows: rows.length };
    const timeseriesMap = new Map<string, { income: number; expense: number }>();
    const categoryMap = new Map<string, { amount: number; rows: number }>();
    const counterpartyMap = new Map<string, { amount: number; rows: number }>();

    const recent = rows
      .slice(0, 50)
      .map(row => {
        const amount = this.parseAmount(row.colC);
        return {
          id: row.id,
          rowNumber: row.rowNumber,
          amount,
          category: row.colF || null,
          counterparty: row.colB || null,
          updatedAt: (row.lastEditedAt || row.updatedAt).toISOString(),
        };
      })
      .slice(0, 20);

    rows.forEach(row => {
      const amount = this.parseAmount(row.colC);
      const dateKey = (row.lastEditedAt || row.updatedAt).toISOString().split('T')[0];
      const ts = timeseriesMap.get(dateKey) || { income: 0, expense: 0 };

      if (amount >= 0) {
        ts.income += amount;
        const counterparty = (row.colB || 'Без названия').trim() || 'Без названия';
        const existing = counterpartyMap.get(counterparty) || { amount: 0, rows: 0 };
        counterpartyMap.set(counterparty, {
          amount: existing.amount + amount,
          rows: existing.rows + 1,
        });
        totals.income += amount;
      } else {
        ts.expense += Math.abs(amount);
        const category = (row.colF || 'Без категории').trim() || 'Без категории';
        const existing = categoryMap.get(category) || { amount: 0, rows: 0 };
        categoryMap.set(category, {
          amount: existing.amount + Math.abs(amount),
          rows: existing.rows + 1,
        });
        totals.expense += Math.abs(amount);
      }

      timeseriesMap.set(dateKey, ts);
    });

    totals.net = totals.income - totals.expense;

    const timeseries: TimeseriesPoint[] = Array.from(timeseriesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const counterparties = Array.from(counterpartyMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { totals, timeseries, categories, counterparties, recent };
  }

  private parseAmount(value?: string | null): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    const cleaned = value.replace(/\s+/g, '').replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }
}
