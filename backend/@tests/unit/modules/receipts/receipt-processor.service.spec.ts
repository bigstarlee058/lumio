import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Receipt,
  ReceiptJobStatus,
  ReceiptProcessingJob,
  ReceiptSource,
  ReceiptStatus,
} from '../../../../src/entities';
import { UniversalExtractorService } from '../../../../src/modules/parsing/services/universal-extractor.service';
import { ReceiptProcessorService } from '../../../../src/modules/receipts/services/receipt-processor.service';
import { ReceiptCategoryService } from '../../../../src/modules/receipts/services/receipt-category.service';
import { ReceiptDuplicateService } from '../../../../src/modules/receipts/services/receipt-duplicate.service';

const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('receipt-binary'));

jest.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

describe('ReceiptProcessorService', () => {
  let service: ReceiptProcessorService;
  let receiptRepository: { findOne: jest.Mock; save: jest.Mock };
  let jobRepository: { save: jest.Mock };
  let extractor: { extractFromImage: jest.Mock; extractFromPdf: jest.Mock };

  beforeEach(async () => {
    receiptRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async payload => payload),
    };
    jobRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    extractor = {
      extractFromImage: jest.fn(),
      extractFromPdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptProcessorService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepository },
        { provide: getRepositoryToken(ReceiptProcessingJob), useValue: jobRepository },
        { provide: UniversalExtractorService, useValue: extractor },
        {
          provide: ReceiptDuplicateService,
          useValue: { findPotentialDuplicates: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: ReceiptCategoryService,
          useValue: { suggestCategory: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get(ReceiptProcessorService);
  });

  it('processes image receipt and stores parsed data', async () => {
    const receipt = {
      id: 'receipt-1',
      source: ReceiptSource.UPLOAD,
      status: ReceiptStatus.NEW,
      subject: 'receipt.jpg',
      language: 'eng',
      attachmentPaths: ['/tmp/receipt.jpg'],
      metadata: { attachments: [{ mimeType: 'image/jpeg' }] },
      parsedData: null,
    } as unknown as Receipt;
    const job = {
      id: 'job-1',
      userId: 'user-1',
      receiptId: 'receipt-1',
      status: ReceiptJobStatus.PENDING,
      progress: 0,
      payload: { integrationId: 'manual-upload', gmailMessageId: 'receipt-1', historyId: 'eng' },
    } as ReceiptProcessingJob;

    receiptRepository.findOne.mockResolvedValue(receipt);
    extractor.extractFromImage.mockResolvedValue({
      totalAmount: 42.5,
      currency: 'EUR',
      vendor: 'Lidl',
      date: new Date('2026-03-20'),
      tax: 3.5,
      lineItems: [{ description: 'Milk', amount: 2.5 }],
      confidence: 0.86,
      extractionMethod: 'ocr_hybrid',
      validationIssues: [],
      transactionType: 'expense',
      fieldConfidence: {},
      documentType: 'receipt',
      rawText: 'raw',
    });

    await service.processReceipt(job);

    expect(extractor.extractFromImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/jpeg',
      expect.objectContaining({ fileNameHint: 'receipt.jpg', ocrLanguages: ['eng'] }),
    );
    expect(receiptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReceiptStatus.DRAFT,
        parsedData: expect.objectContaining({
          amount: 42.5,
          currency: 'EUR',
          vendor: 'Lidl',
        }),
        extractionMethod: 'ocr_hybrid',
        confidence: 0.86,
      }),
    );
    expect(job.status).toBe(ReceiptJobStatus.COMPLETED);
  });

  it('marks receipt as needs_review when amount is missing', async () => {
    const receipt = {
      id: 'receipt-2',
      source: ReceiptSource.SCAN,
      status: ReceiptStatus.NEW,
      subject: 'scan.jpg',
      language: 'auto',
      attachmentPaths: ['/tmp/scan.jpg'],
      metadata: { attachments: [{ mimeType: 'image/jpeg' }] },
      parsedData: null,
    } as unknown as Receipt;
    const job = {
      id: 'job-2',
      userId: 'user-1',
      receiptId: 'receipt-2',
      status: ReceiptJobStatus.PENDING,
      progress: 0,
      payload: { integrationId: 'manual-scan', gmailMessageId: 'receipt-2', historyId: 'auto' },
    } as ReceiptProcessingJob;

    receiptRepository.findOne.mockResolvedValue(receipt);
    extractor.extractFromImage.mockResolvedValue({
      totalAmount: undefined,
      currency: 'USD',
      vendor: 'Unknown',
      confidence: 0.3,
      extractionMethod: 'ocr_regex',
      validationIssues: ['missing_amount'],
      transactionType: 'expense',
      fieldConfidence: {},
      documentType: 'receipt',
      rawText: 'raw',
      lineItems: [],
    });

    await service.processReceipt(job);

    expect(receiptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReceiptStatus.NEEDS_REVIEW,
      }),
    );
  });
});
