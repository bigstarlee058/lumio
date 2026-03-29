import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Receipt, Transaction } from '../../../entities';

@Injectable()
export class ReceiptCategoryService {
  private readonly logger = new Logger(ReceiptCategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async suggestCategory(receipt: Receipt): Promise<Category | null> {
    try {
      const vendor = receipt.parsedData?.vendor;
      if (!vendor) {
        return null;
      }

      const categories = await this.categoryRepository.find({
        where: { workspaceId: receipt.workspaceId, isEnabled: true },
      });

      if (categories.length === 0) {
        return null;
      }

      const historicalMatch = await this.matchByHistoricalData(vendor, receipt.workspaceId, categories);
      if (historicalMatch) {
        return historicalMatch;
      }

      const keywordMatch = this.matchByKeywords(vendor, categories);
      if (keywordMatch) {
        return keywordMatch;
      }

      return this.matchBySimilarity(vendor, categories);
    } catch (error) {
      this.logger.error('Failed to suggest category', error);
      return null;
    }
  }

  private async matchByHistoricalData(
    vendor: string,
    workspaceId: string,
    categories: Category[],
  ): Promise<Category | null> {
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.categoryId IS NOT NULL')
      .andWhere(
        '(LOWER(transaction.counterpartyName) LIKE :vendor OR LOWER(transaction.paymentPurpose) LIKE :vendor)',
        {
          vendor: `%${vendor.toLowerCase()}%`,
        },
      )
      .limit(10)
      .getMany();

    if (transactions.length === 0) {
      return null;
    }

    const categoryCounts: Record<string, number> = {};
    for (const transaction of transactions) {
      if (transaction.categoryId) {
        categoryCounts[transaction.categoryId] = (categoryCounts[transaction.categoryId] || 0) + 1;
      }
    }

    const mostCommonCategoryId = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

    if (mostCommonCategoryId) {
      return categories.find(category => category.id === mostCommonCategoryId) || null;
    }

    return null;
  }

  matchByKeywords(vendor: string, categories: Category[]): Category | null {
    const vendorLower = vendor.toLowerCase();

    const keywordMap: Record<string, string[]> = {
      food: [
        'restaurant',
        'cafe',
        'coffee',
        'pizza',
        'burger',
        'grocery',
        'supermarket',
        'food',
        'кафе',
        'ресторан',
        'магазин',
      ],
      transport: [
        'taxi',
        'uber',
        'yandex',
        'газпром',
        'заправка',
        'gas',
        'fuel',
        'transport',
        'транспорт',
      ],
      entertainment: ['cinema', 'theater', 'concert', 'movie', 'кино', 'театр', 'развлечение'],
      shopping: ['shop', 'store', 'mall', 'market', 'магазин', 'торговый'],
      utilities: ['utility', 'electric', 'water', 'коммунальные', 'электро', 'вода'],
      health: ['pharmacy', 'hospital', 'clinic', 'doctor', 'аптека', 'клиника'],
    };

    for (const [categoryType, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (vendorLower.includes(keyword)) {
          const category = categories.find(item => item.name.toLowerCase().includes(categoryType));
          if (category) {
            return category;
          }
        }
      }
    }

    return null;
  }

  private matchBySimilarity(vendor: string, categories: Category[]): Category | null {
    const vendorLower = vendor.toLowerCase();
    let bestMatch: Category | null = null;
    let bestSimilarity = 0;

    for (const category of categories) {
      const categoryLower = category.name.toLowerCase();
      const similarity = this.calculateStringSimilarity(vendorLower, categoryLower);

      if (similarity > bestSimilarity && similarity > 0.7) {
        bestSimilarity = similarity;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) {
      return len2 === 0 ? 1 : 0;
    }
    if (len2 === 0) {
      return 0;
    }

    const matrix: number[][] = [];

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len2][len1];
    return 1 - distance / maxLen;
  }
}
