import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { Repository } from 'typeorm';
import { Receipt, ReceiptJobStatus, ReceiptProcessingJob, ReceiptStatus } from '../../../entities';
import { UniversalExtractorService } from '../../parsing/services/universal-extractor.service';
import { ReceiptCategoryService } from './receipt-category.service';
import { ReceiptDuplicateService } from './receipt-duplicate.service';

const MANUAL_RECEIPT_WORKER_ID = 'manual-receipt-sync';

@Injectable()
export class ReceiptProcessorService {
  private readonly logger = new Logger(ReceiptProcessorService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptProcessingJob)
    private readonly jobRepository: Repository<ReceiptProcessingJob>,
    private readonly extractor: UniversalExtractorService,
    private readonly duplicateService: ReceiptDuplicateService,
    private readonly categoryService: ReceiptCategoryService,
  ) {}

  async processReceipt(job: ReceiptProcessingJob): Promise<Receipt | null> {
    let receipt: Receipt | null = null;

    try {
      if (!job.receiptId) {
        job.status = ReceiptJobStatus.FAILED;
        job.error = 'Receipt not found';
        await this.jobRepository.save(job);
        return null;
      }

      job.status = ReceiptJobStatus.PROCESSING;
      job.lockedAt = job.lockedAt ?? new Date();
      job.lockedBy = job.lockedBy ?? MANUAL_RECEIPT_WORKER_ID;
      job.progress = Math.max(job.progress ?? 0, 10);
      await this.jobRepository.save(job);

      receipt = await this.receiptRepository.findOne({ where: { id: job.receiptId } });
      if (!receipt) {
        job.status = ReceiptJobStatus.FAILED;
        job.error = 'Receipt not found';
        await this.jobRepository.save(job);
        return null;
      }

      const filePath = receipt.attachmentPaths?.[0];
      if (!filePath) {
        receipt.status = ReceiptStatus.FAILED;
        job.status = ReceiptJobStatus.FAILED;
        job.error = 'Receipt file not found';
        await this.receiptRepository.save(receipt);
        await this.jobRepository.save(job);
        return receipt;
      }

      const fileBuffer = await fs.readFile(filePath);
      const mimeType = receipt.metadata?.attachments?.[0]?.mimeType || 'application/octet-stream';
      const isPdf = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');
      const ocrLanguages = this.resolveOcrLanguages(receipt.language, job.payload.historyId);

      job.progress = 35;
      await this.jobRepository.save(job);

      const parsed = isPdf
        ? await this.extractor.extractFromPdf(fileBuffer, {
            fileNameHint: receipt.subject,
            ocrLanguages,
          })
        : await this.extractor.extractFromImage(fileBuffer, mimeType, {
            fileNameHint: receipt.subject,
            ocrLanguages,
          });

      job.progress = 70;
      await this.jobRepository.save(job);

      receipt.parsedData = {
        amount: parsed.totalAmount,
        currency: parsed.currency,
        vendor: parsed.vendor,
        date: parsed.date instanceof Date ? parsed.date.toISOString().slice(0, 10) : undefined,
        tax: parsed.tax,
        taxRate: parsed.taxRate,
        subtotal: parsed.subtotal,
        lineItems: parsed.lineItems,
        transactionType: parsed.transactionType,
        confidence: parsed.confidence,
        validationIssues: parsed.validationIssues,
      };
      receipt.taxAmount = parsed.tax ?? null;
      receipt.language = this.normalizeStoredLanguage(receipt.language ?? job.payload.historyId);
      receipt.extractionMethod = parsed.extractionMethod;
      receipt.confidence = parsed.confidence;

      if (typeof parsed.totalAmount === 'number' && Number.isFinite(parsed.totalAmount)) {
        const potentialDuplicates = await this.duplicateService.findPotentialDuplicates(receipt);
        if (potentialDuplicates.length > 0) {
          receipt.metadata = {
            ...receipt.metadata,
            potentialDuplicates: potentialDuplicates.map(item => item.id),
          };
          receipt.status = ReceiptStatus.NEEDS_REVIEW;
        } else {
          receipt.status = ReceiptStatus.DRAFT;
        }
      } else {
        receipt.status = ReceiptStatus.NEEDS_REVIEW;
      }

      const suggestedCategory = await this.categoryService.suggestCategory(receipt);
      if (suggestedCategory) {
        receipt.parsedData = {
          ...receipt.parsedData,
          category: suggestedCategory.name,
          categoryId: suggestedCategory.id,
        };
      }

      const savedReceipt = await this.receiptRepository.save(receipt);

      job.status = ReceiptJobStatus.COMPLETED;
      job.progress = 100;
      job.result = { receiptId: savedReceipt.id };
      job.error = null;
      await this.jobRepository.save(job);

      this.logger.log(`Processed receipt ${savedReceipt.id}`);
      return savedReceipt;
    } catch (error) {
      this.logger.error(`Failed to process receipt job ${job.id}`, error as Error);

      if (receipt) {
        receipt.status = ReceiptStatus.FAILED;
        await this.receiptRepository.save(receipt);
      }

      job.status = ReceiptJobStatus.FAILED;
      job.error = error instanceof Error ? error.message : String(error);
      await this.jobRepository.save(job);
      return receipt;
    }
  }

  private resolveOcrLanguages(language?: string | null, fallback?: string): string[] | undefined {
    const raw = language ?? fallback;
    if (!raw || raw === 'auto') {
      return undefined;
    }

    return raw
      .split('+')
      .map(value => value.trim())
      .filter(Boolean);
  }

  private normalizeStoredLanguage(language?: string | null): string | null {
    if (!language || language === 'auto') {
      return null;
    }

    return language;
  }
}
