import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../../../entities';

@Injectable()
export class ReceiptDuplicateService {
  private readonly logger = new Logger(ReceiptDuplicateService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
  ) {}

  async findPotentialDuplicates(receipt: Receipt): Promise<Receipt[]> {
    try {
      if (!receipt.parsedData?.amount || !receipt.parsedData?.date) {
        return [];
      }

      const amount = receipt.parsedData.amount;
      const dateStr = receipt.parsedData.date;
      const vendor = receipt.parsedData.vendor;

      const receiptDate = new Date(dateStr);
      if (Number.isNaN(receiptDate.getTime())) {
        return [];
      }

      const dateFrom = new Date(receiptDate);
      dateFrom.setDate(dateFrom.getDate() - 2);
      const dateTo = new Date(receiptDate);
      dateTo.setDate(dateTo.getDate() + 2);

      const amountMin = amount * 0.99;
      const amountMax = amount * 1.01;

      const candidates = await this.receiptRepository
        .createQueryBuilder('receipt')
        .where('receipt.userId = :userId', { userId: receipt.userId })
        .andWhere('receipt.workspaceId = :workspaceId', { workspaceId: receipt.workspaceId })
        .andWhere('receipt.id != :id', { id: receipt.id })
        .andWhere('receipt.isDuplicate = :isDuplicate', { isDuplicate: false })
        .andWhere('receipt.receivedAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
        .getMany();

      const duplicates: Receipt[] = [];
      for (const candidate of candidates) {
        if (!candidate.parsedData?.amount) {
          continue;
        }

        const candidateAmount = candidate.parsedData.amount;
        if (candidateAmount < amountMin || candidateAmount > amountMax) {
          continue;
        }

        if (vendor && candidate.parsedData.vendor) {
          const similarity = this.calculateStringSimilarity(
            vendor.toLowerCase(),
            candidate.parsedData.vendor.toLowerCase(),
          );
          if (similarity > 0.8) {
            duplicates.push(candidate);
          }
        } else if (!vendor && !candidate.parsedData.vendor) {
          duplicates.push(candidate);
        }
      }

      return duplicates;
    } catch (error) {
      this.logger.error('Failed to find potential duplicates', error);
      return [];
    }
  }

  async markAsDuplicate(receiptId: string, originalId: string): Promise<void> {
    const receipt = await this.receiptRepository.findOne({ where: { id: receiptId } });
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    const original = await this.receiptRepository.findOne({ where: { id: originalId } });
    if (!original) {
      throw new Error('Original receipt not found');
    }

    receipt.duplicateOfId = originalId;
    receipt.isDuplicate = true;
    await this.receiptRepository.save(receipt);
  }

  async unmarkDuplicate(receiptId: string): Promise<void> {
    const receipt = await this.receiptRepository.findOne({ where: { id: receiptId } });
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    receipt.duplicateOfId = null;
    receipt.isDuplicate = false;
    await this.receiptRepository.save(receipt);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
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
