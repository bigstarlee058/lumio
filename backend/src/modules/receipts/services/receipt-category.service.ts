import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calculateStringSimilarity } from '../../../common/utils/string-similarity.util';
import { Category, Receipt, Transaction } from '../../../entities';

type CategoryQueryMode = 'direct' | 'via-statement';

@Injectable()
export class ReceiptCategoryService {
  private readonly logger = new Logger(ReceiptCategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async suggestCategory(
    receipt: Receipt,
    queryMode: CategoryQueryMode = 'direct',
  ): Promise<Category | null> {
    try {
      const vendor = receipt.parsedData?.vendor;
      if (!vendor) {
        return null;
      }

      const categories = await this.getCategories(receipt.workspaceId, queryMode);

      if (categories.length === 0) {
        return null;
      }

      const historicalMatch = await this.matchByHistoricalData(
        vendor,
        receipt.workspaceId,
        categories,
      );
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

  private getCategories(workspaceId: string, queryMode: CategoryQueryMode): Promise<Category[]> {
    if (queryMode === 'via-statement') {
      return this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.user', 'user')
        .where('user.workspace_id = :workspaceId', { workspaceId })
        .getMany();
    }

    return this.categoryRepository.find({
      where: { workspaceId, isEnabled: true },
    });
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

    const mostCommonCategoryId = Object.entries(categoryCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];

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
      const similarity = calculateStringSimilarity(vendorLower, categoryLower);

      if (similarity > bestSimilarity && similarity > 0.7) {
        bestSimilarity = similarity;
        bestMatch = category;
      }
    }

    return bestMatch;
  }
}
