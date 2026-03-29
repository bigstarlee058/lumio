# Receipt Scan & Upload OCR Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to scan receipts via camera or upload images/PDFs, extract structured data via Tesseract OCR with multi-language support (15 languages + auto-detection), and create transactions from parsed receipt data — working for all countries.

**Architecture:** Create a standalone `receipts` module that extracts shared receipt logic from the Gmail module. The new module provides upload/scan endpoints, wires into the existing `UniversalExtractorService` (regex + OCR + AI Gemini pipeline), and reuses existing `Receipt` entity (which already supports `UPLOAD` and `SCAN` sources). Frontend gets a dedicated receipt management UI with camera capture, drag-and-drop upload, receipt review/edit, and approval-to-transaction flow.

**Tech Stack:** NestJS, TypeORM, Tesseract.js 5.x, Sharp, Multer, Google Gemini 2.5 Flash, Next.js, React 19, MediaDevices API, Mantine UI, TailwindCSS, Jest/Vitest.

**Existing Infrastructure (do NOT rebuild):**
- `Receipt` entity with `ReceiptSource.UPLOAD` / `ReceiptSource.SCAN` enums
- `ReceiptProcessingJob` entity for async job queue
- `OcrService` with Tesseract.js (currently eng+rus only)
- `UniversalExtractorService` (regex + OCR + AI multi-strategy pipeline)
- `AiDocumentExtractor` (Gemini 2.5 Flash with circuit breaker)
- `UniversalAmountParser` with 20+ currency support
- `DocumentClassifierService` (receipt/invoice/statement detection)
- `FileStorageService` + Multer config (disk storage, 10MB limit)
- Receipt CRUD API in Gmail controller (to be extracted)
- Category suggestion, duplicate detection, audit logging services

---

### Task 1: Extend OcrService for multi-language support (15 languages + auto-detection)

**Files:**
- Modify: `backend/src/modules/parsing/services/ocr.service.ts`
- Create: `backend/@tests/unit/modules/parsing/ocr.service.spec.ts`

**Context:** Currently `OcrService` hardcodes `['eng', 'rus']`. We need to support 15 languages and add auto-detection logic based on initial OCR pass with `osd` (Tesseract orientation/script detection).

**Step 1: Write the failing test**

```typescript
// backend/@tests/unit/modules/parsing/ocr.service.spec.ts
import { OcrService } from '../../../../src/modules/parsing/services/ocr.service';

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(() => {
    service = new OcrService();
  });

  describe('getSupportedLanguages', () => {
    it('should return at least 15 supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages.length).toBeGreaterThanOrEqual(15);
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'eng', name: 'English' }),
      );
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'rus', name: 'Russian' }),
      );
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'deu', name: 'German' }),
      );
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'ara', name: 'Arabic' }),
      );
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'jpn', name: 'Japanese' }),
      );
    });
  });

  describe('resolveLanguages', () => {
    it('should return default languages when none specified', () => {
      const result = service.resolveLanguages(undefined);
      expect(result).toEqual(['eng']);
    });

    it('should validate and return requested languages', () => {
      const result = service.resolveLanguages(['deu', 'fra']);
      expect(result).toEqual(['deu', 'fra']);
    });

    it('should filter out unsupported language codes', () => {
      const result = service.resolveLanguages(['eng', 'xxx_invalid']);
      expect(result).toEqual(['eng']);
    });

    it('should fallback to eng if all requested languages are invalid', () => {
      const result = service.resolveLanguages(['xxx', 'yyy']);
      expect(result).toEqual(['eng']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="ocr.service.spec" --verbose`
Expected: FAIL — `getSupportedLanguages` and `resolveLanguages` methods do not exist.

**Step 3: Write minimal implementation**

Add to `OcrService`:

```typescript
// Add to ocr.service.ts

interface SupportedLanguage {
  code: string;   // Tesseract language code
  name: string;   // Human-readable name
  script: string; // Script family (Latin, Cyrillic, CJK, Arabic, Devanagari)
}

private static readonly SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'eng', name: 'English', script: 'Latin' },
  { code: 'rus', name: 'Russian', script: 'Cyrillic' },
  { code: 'deu', name: 'German', script: 'Latin' },
  { code: 'fra', name: 'French', script: 'Latin' },
  { code: 'spa', name: 'Spanish', script: 'Latin' },
  { code: 'ita', name: 'Italian', script: 'Latin' },
  { code: 'por', name: 'Portuguese', script: 'Latin' },
  { code: 'zho', name: 'Chinese', script: 'CJK' },
  { code: 'jpn', name: 'Japanese', script: 'CJK' },
  { code: 'kor', name: 'Korean', script: 'CJK' },
  { code: 'ara', name: 'Arabic', script: 'Arabic' },
  { code: 'hin', name: 'Hindi', script: 'Devanagari' },
  { code: 'tur', name: 'Turkish', script: 'Latin' },
  { code: 'pol', name: 'Polish', script: 'Latin' },
  { code: 'ces', name: 'Czech', script: 'Latin' },
];

private static readonly SUPPORTED_CODES = new Set(
  OcrService.SUPPORTED_LANGUAGES.map((l) => l.code),
);

getSupportedLanguages(): SupportedLanguage[] {
  return [...OcrService.SUPPORTED_LANGUAGES];
}

resolveLanguages(requested?: string[]): string[] {
  if (!requested || requested.length === 0) {
    return ['eng'];
  }
  const valid = requested.filter((code) =>
    OcrService.SUPPORTED_CODES.has(code),
  );
  return valid.length > 0 ? valid : ['eng'];
}
```

Update `extractTextFromImage` to use `resolveLanguages`:
```typescript
// Replace hardcoded ['eng', 'rus'] with:
const languages = this.resolveLanguages(options?.languages);
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern="ocr.service.spec" --verbose`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/ocr.service.ts backend/@tests/unit/modules/parsing/ocr.service.spec.ts
git commit -m "feat(ocr): extend language support to 15 languages with validation"
```

---

### Task 2: Add language auto-detection to OcrService

**Files:**
- Modify: `backend/src/modules/parsing/services/ocr.service.ts`
- Modify: `backend/@tests/unit/modules/parsing/ocr.service.spec.ts`

**Context:** When no language is specified, we do a quick initial OCR pass with English, then analyze the extracted text to detect the likely script/language and re-run OCR with the correct language pack if needed. This uses Unicode script ranges rather than a separate Tesseract OSD pass (which is unreliable on receipt images).

**Step 1: Write the failing test**

```typescript
describe('detectScriptFromText', () => {
  it('should detect Cyrillic script from Russian text', () => {
    const result = service.detectScriptFromText('Магазин Пятёрочка Итого: 1500.00');
    expect(result).toBe('Cyrillic');
  });

  it('should detect CJK script from Chinese text', () => {
    const result = service.detectScriptFromText('超市购物 总计：¥150.00');
    expect(result).toBe('CJK');
  });

  it('should detect Arabic script', () => {
    const result = service.detectScriptFromText('المجموع الكلي ١٥٠٫٠٠ ريال');
    expect(result).toBe('Arabic');
  });

  it('should detect Latin as default', () => {
    const result = service.detectScriptFromText('Total: $15.00 Thank you');
    expect(result).toBe('Latin');
  });

  it('should handle mixed scripts by choosing dominant one', () => {
    const result = service.detectScriptFromText('Store ABC Магазин 15.00');
    expect(['Latin', 'Cyrillic']).toContain(result);
  });
});

describe('getLanguagesForScript', () => {
  it('should return Cyrillic language for Cyrillic script', () => {
    const result = service.getLanguagesForScript('Cyrillic');
    expect(result).toContain('rus');
  });

  it('should return all CJK languages for CJK script', () => {
    const result = service.getLanguagesForScript('CJK');
    expect(result).toEqual(expect.arrayContaining(['zho', 'jpn', 'kor']));
  });

  it('should return eng for Latin script', () => {
    const result = service.getLanguagesForScript('Latin');
    expect(result).toContain('eng');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="ocr.service.spec" --verbose`
Expected: FAIL — methods don't exist.

**Step 3: Write minimal implementation**

```typescript
// Add to OcrService

detectScriptFromText(text: string): string {
  const scripts: Record<string, number> = {
    Latin: 0,
    Cyrillic: 0,
    CJK: 0,
    Arabic: 0,
    Devanagari: 0,
  };

  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) continue;

    if (
      (code >= 0x0041 && code <= 0x024f) ||
      (code >= 0x1e00 && code <= 0x1eff)
    ) {
      scripts.Latin++;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      scripts.Cyrillic++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      scripts.CJK++;
    } else if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f)
    ) {
      scripts.Arabic++;
    } else if (code >= 0x0900 && code <= 0x097f) {
      scripts.Devanagari++;
    }
  }

  let maxScript = 'Latin';
  let maxCount = 0;
  for (const [script, count] of Object.entries(scripts)) {
    if (count > maxCount) {
      maxCount = count;
      maxScript = script;
    }
  }
  return maxScript;
}

getLanguagesForScript(script: string): string[] {
  const scriptToLangs: Record<string, string[]> = {
    Latin: ['eng', 'deu', 'fra', 'spa', 'ita', 'por', 'tur', 'pol', 'ces'],
    Cyrillic: ['rus'],
    CJK: ['zho', 'jpn', 'kor'],
    Arabic: ['ara'],
    Devanagari: ['hin'],
  };
  return scriptToLangs[script] || ['eng'];
}
```

Update `extractTextFromImage` to use auto-detection when `options.languages` is `['auto']` or not provided:
```typescript
async extractTextFromImage(imageBuffer: Buffer, options?: OcrOptions): Promise<OcrResult> {
  const preprocess = options?.preprocess !== false;
  const processedBuffer = preprocess ? await this.preprocessImage(imageBuffer) : imageBuffer;

  let languages = this.resolveLanguages(options?.languages);
  const autoDetect = !options?.languages || options.languages.length === 0 || options.languages.includes('auto');

  if (autoDetect) {
    // Quick pass with eng to get initial text for script detection
    const quickResult = await this.runOcr(processedBuffer, ['eng']);
    if (quickResult.text.length > 20) {
      const detectedScript = this.detectScriptFromText(quickResult.text);
      if (detectedScript !== 'Latin') {
        const scriptLangs = this.getLanguagesForScript(detectedScript);
        const result = await this.runOcr(processedBuffer, scriptLangs);
        return {
          ...result,
          language: scriptLangs.join('+'),
          preprocessed: preprocess,
        };
      }
    }
    return { ...quickResult, preprocessed: preprocess };
  }

  const result = await this.runOcr(processedBuffer, languages);
  return { ...result, language: languages.join('+'), preprocessed: preprocess };
}
```

Extract existing Tesseract logic into a private `runOcr(buffer, languages)` method.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern="ocr.service.spec" --verbose`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/ocr.service.ts backend/@tests/unit/modules/parsing/ocr.service.spec.ts
git commit -m "feat(ocr): add script-based language auto-detection for multi-country support"
```

---

### Task 3: Create the standalone Receipts module (controller + service + DTOs)

**Files:**
- Create: `backend/src/modules/receipts/receipts.module.ts`
- Create: `backend/src/modules/receipts/receipts.controller.ts`
- Create: `backend/src/modules/receipts/receipts.service.ts`
- Create: `backend/src/modules/receipts/dto/upload-receipt.dto.ts`
- Create: `backend/src/modules/receipts/dto/update-receipt.dto.ts`
- Create: `backend/src/modules/receipts/dto/receipt-query.dto.ts`
- Modify: `backend/src/app.module.ts` (register new module)
- Create: `backend/@tests/unit/modules/receipts/receipts.service.spec.ts`

**Context:** This module provides a source-agnostic receipt API. It reuses existing `Receipt` entity, `UniversalExtractorService`, `OcrService`, and category/duplicate services from Gmail module. The Gmail module will later import from this shared module.

**Step 1: Write the failing test**

```typescript
// backend/@tests/unit/modules/receipts/receipts.service.spec.ts
describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let receiptRepo: MockType<Repository<Receipt>>;
  let jobRepo: MockType<Repository<ReceiptProcessingJob>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: getRepositoryToken(Receipt), useFactory: repositoryMockFactory },
        { provide: getRepositoryToken(ReceiptProcessingJob), useFactory: repositoryMockFactory },
        { provide: UniversalExtractorService, useValue: { extractFromImage: jest.fn(), extractFromPdf: jest.fn() } },
        { provide: FileStorageService, useValue: { saveFile: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(ReceiptsService);
    receiptRepo = module.get(getRepositoryToken(Receipt));
  });

  describe('createFromUpload', () => {
    it('should create a receipt with UPLOAD source', async () => {
      receiptRepo.save.mockResolvedValue({ id: 'test-id' });
      const result = await service.createFromUpload({
        userId: 'user-1',
        workspaceId: 'ws-1',
        files: [{ originalname: 'receipt.jpg', buffer: Buffer.from('img'), mimetype: 'image/jpeg' }],
      });
      expect(result).toBeDefined();
      expect(receiptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'upload', userId: 'user-1' }),
      );
    });
  });

  describe('createFromScan', () => {
    it('should create a receipt with SCAN source', async () => {
      receiptRepo.save.mockResolvedValue({ id: 'test-id' });
      const result = await service.createFromScan({
        userId: 'user-1',
        workspaceId: 'ws-1',
        imageBuffer: Buffer.from('camera-data'),
        mimeType: 'image/jpeg',
      });
      expect(result).toBeDefined();
      expect(receiptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'scan' }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated receipts for workspace', async () => {
      receiptRepo.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);
      const result = await service.findAll('ws-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by source', async () => {
      receiptRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('ws-1', { page: 1, limit: 20, source: 'scan' });
      expect(receiptRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: 'scan' }),
        }),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="receipts.service.spec" --verbose`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

**DTOs:**

```typescript
// dto/upload-receipt.dto.ts
export class UploadReceiptDto {
  @IsOptional()
  @IsString()
  language?: string; // Tesseract language code, e.g. 'deu', or 'auto'
}

// dto/receipt-query.dto.ts
export class ReceiptQueryDto {
  @IsOptional() @IsEnum(ReceiptStatus) status?: ReceiptStatus;
  @IsOptional() @IsEnum(ReceiptSource) source?: ReceiptSource;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number = 20;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

// dto/update-receipt.dto.ts
export class UpdateReceiptDto {
  @IsOptional() @IsEnum(ReceiptStatus) status?: ReceiptStatus;
  @IsOptional() parsedData?: Partial<Receipt['parsedData']>;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsNumber() taxAmount?: number;
}
```

**Service (`receipts.service.ts`):**

Core methods:
- `createFromUpload(userId, workspaceId, files, language?)` — saves files via `FileStorageService`, creates `Receipt` with `source: UPLOAD`, enqueues processing job
- `createFromScan(userId, workspaceId, imageBuffer, mimeType, language?)` — saves camera image, creates `Receipt` with `source: SCAN`, enqueues processing job
- `findAll(workspaceId, query)` — paginated list with filters (status, source, date range, categoryId)
- `findOne(id, workspaceId)` — get receipt with relations
- `update(id, workspaceId, dto)` — update status/parsedData
- `approve(id, workspaceId, userId)` — create Transaction from receipt parsedData, link receipt to transaction, set status APPROVED
- `bulkApprove(ids, workspaceId, userId)` — approve multiple receipts
- `delete(id, workspaceId)` — soft delete

**Controller (`receipts.controller.ts`):**

```
POST   /receipts/upload       — file upload (multer, max 5 files, 10MB each)
POST   /receipts/scan         — camera capture (single image in body)
GET    /receipts              — list with filters
GET    /receipts/:id          — get single receipt
PATCH  /receipts/:id          — update receipt
POST   /receipts/:id/approve  — approve and create transaction
POST   /receipts/bulk-approve — bulk approve
DELETE /receipts/:id          — delete receipt
GET    /receipts/:id/file     — serve attachment file
GET    /receipts/:id/thumbnail — PDF/image thumbnail
```

Guards: `JwtAuthGuard`, `WorkspaceContextGuard`, `PermissionsGuard`
Decorators: `@CurrentUser()`, `@WorkspaceId()`, `@Audit()`

**Module (`receipts.module.ts`):**

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptProcessingJob, Transaction, Category]),
    ParsingModule,  // provides OcrService, UniversalExtractorService
    StorageModule,  // provides FileStorageService
    AuditModule,
  ],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptProcessorService,      // background job processor
    ReceiptCategoryService,       // extract from Gmail module
    ReceiptDuplicateService,      // extract from Gmail module
  ],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
```

Register in `app.module.ts`:
```typescript
imports: [..., ReceiptsModule]
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern="receipts.service.spec" --verbose`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/receipts/ backend/src/app.module.ts backend/@tests/unit/modules/receipts/
git commit -m "feat(receipts): create standalone receipts module with upload/scan endpoints"
```

---

### Task 4: Implement receipt processing pipeline (background job processor)

**Files:**
- Create: `backend/src/modules/receipts/services/receipt-processor.service.ts`
- Create: `backend/@tests/unit/modules/receipts/receipt-processor.service.spec.ts`

**Context:** This is the background job processor for uploaded/scanned receipts. It polls `ReceiptProcessingJob` table (like the Gmail processor does) but handles image/PDF files instead of Gmail messages. Pipeline: save file → preprocess image → OCR → AI extraction → duplicate check → category suggestion → update receipt.

**Step 1: Write the failing test**

```typescript
describe('ReceiptProcessorService', () => {
  describe('processUploadedReceipt', () => {
    it('should extract data from image receipt and update parsed data', async () => {
      const mockExtractor = {
        extractFromImage: jest.fn().mockResolvedValue({
          totalAmount: 42.50,
          currency: 'EUR',
          vendor: 'Lidl',
          date: new Date('2026-03-20'),
          lineItems: [{ description: 'Milk', amount: 2.50 }],
          transactionType: 'expense',
          confidence: 0.85,
          extractionMethod: 'ocr_ai',
        }),
      };

      // ... setup with mocks

      await service.processReceipt(jobId);

      expect(receiptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReceiptStatus.PARSED,
          parsedData: expect.objectContaining({
            amount: 42.50,
            currency: 'EUR',
            vendor: 'Lidl',
            confidence: 0.85,
          }),
        }),
      );
    });

    it('should set NEEDS_REVIEW when confidence is below threshold', async () => {
      const mockExtractor = {
        extractFromImage: jest.fn().mockResolvedValue({
          totalAmount: undefined,
          confidence: 0.3,
          validationIssues: ['missing_amount'],
        }),
      };

      await service.processReceipt(jobId);

      expect(receiptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReceiptStatus.NEEDS_REVIEW }),
      );
    });

    it('should handle PDF receipts via extractFromPdf', async () => {
      // Test with PDF file, verify extractFromPdf is called
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="receipt-processor.service.spec" --verbose`
Expected: FAIL.

**Step 3: Write minimal implementation**

The `ReceiptProcessorService` should:
1. Use `@Interval(5000)` to poll for pending jobs (same pattern as `GmailReceiptProcessor`)
2. Acquire job with optimistic lock
3. Read the file from disk (path stored in `receipt.attachmentPaths`)
4. Determine file type (image vs PDF) using MIME type
5. For images: call `universalExtractor.extractFromImage(buffer, mimeType, { languages })`
6. For PDFs: call `universalExtractor.extractFromPdf(buffer, { languages })`
7. Map `ParsedDocument` result to `receipt.parsedData` format
8. Set status: `PARSED` if amount found + confidence >= 0.5, else `NEEDS_REVIEW`
9. Run duplicate detection
10. Run category suggestion
11. Create audit log entry
12. Mark job as `COMPLETED`

Key: reuse `UniversalExtractorService` which already handles the full OCR → regex → AI pipeline.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern="receipt-processor.service.spec" --verbose`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/receipts/services/receipt-processor.service.ts backend/@tests/unit/modules/receipts/receipt-processor.service.spec.ts
git commit -m "feat(receipts): implement background receipt processing pipeline"
```

---

### Task 5: Extract shared receipt services from Gmail module

**Files:**
- Create: `backend/src/modules/receipts/services/receipt-category.service.ts` (extract from `GmailReceiptCategoryService`)
- Create: `backend/src/modules/receipts/services/receipt-duplicate.service.ts` (extract from `GmailReceiptDuplicateService`)
- Modify: `backend/src/modules/gmail/gmail.module.ts` (import from receipts module instead of local)
- Modify: `backend/src/modules/gmail/gmail-receipt-processor.ts` (use extracted services)
- Create: `backend/@tests/unit/modules/receipts/receipt-category.service.spec.ts`
- Create: `backend/@tests/unit/modules/receipts/receipt-duplicate.service.spec.ts`

**Context:** The category suggestion and duplicate detection services in the Gmail module are receipt-generic — they don't depend on Gmail. Extract them to the receipts module so both Gmail and upload/scan flows can use them. This is a pure refactor with no behavior change.

**Step 1: Write failing tests for extracted services**

Copy existing Gmail tests (if any) and adapt imports to new paths. Write tests covering:
- Category suggestion: historical match, keyword match, similarity match
- Duplicate detection: amount/date/vendor matching, mark/unmark

**Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest --testPathPattern="receipt-(category|duplicate).service.spec" --verbose`

**Step 3: Extract services**

- Copy `GmailReceiptCategoryService` → `ReceiptCategoryService`, remove Gmail-specific dependencies
- Copy `GmailReceiptDuplicateService` → `ReceiptDuplicateService`, remove Gmail-specific dependencies
- In Gmail module: replace local service with import from ReceiptsModule
- Update `ReceiptsModule` to export these services
- Update `GmailModule` to import `ReceiptsModule`

**Step 4: Run all tests to verify nothing is broken**

Run: `cd backend && npx jest --verbose`
Expected: All pass. Gmail receipt processing unchanged.

**Step 5: Commit**

```bash
git add backend/src/modules/receipts/services/ backend/src/modules/gmail/ backend/@tests/
git commit -m "refactor(receipts): extract category and duplicate services from gmail module"
```

---

### Task 6: Add receipt-to-transaction conversion in ReceiptsService

**Files:**
- Modify: `backend/src/modules/receipts/receipts.service.ts`
- Create: `backend/@tests/unit/modules/receipts/receipts-approve.service.spec.ts`

**Context:** When a user approves a receipt, we create a `Transaction` record from `receipt.parsedData`. This maps receipt fields to transaction fields and links the receipt to the transaction.

**Step 1: Write the failing test**

```typescript
describe('approve', () => {
  it('should create a transaction from receipt parsedData', async () => {
    receiptRepo.findOne.mockResolvedValue({
      id: 'r-1',
      workspaceId: 'ws-1',
      status: ReceiptStatus.DRAFT,
      parsedData: {
        amount: 42.50,
        currency: 'EUR',
        vendor: 'Lidl',
        date: '2026-03-20',
        transactionType: 'expense',
        categoryId: 'cat-1',
        tax: 8.10,
      },
    });
    transactionRepo.save.mockResolvedValue({ id: 'tx-1' });

    const result = await service.approve('r-1', 'ws-1', 'user-1');

    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        amount: 42.50,
        currency: 'EUR',
        counterpartyName: 'Lidl',
        transactionDate: expect.any(Date),
        transactionType: 'expense',
        categoryId: 'cat-1',
      }),
    );
    expect(receiptRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReceiptStatus.APPROVED,
        transactionId: 'tx-1',
      }),
    );
  });

  it('should reject approval of already approved receipt', async () => {
    receiptRepo.findOne.mockResolvedValue({
      id: 'r-1',
      status: ReceiptStatus.APPROVED,
    });
    await expect(service.approve('r-1', 'ws-1', 'u-1'))
      .rejects.toThrow('Receipt is already approved');
  });
});
```

**Step 2–5:** Standard TDD cycle: fail → implement → pass → commit.

```bash
git commit -m "feat(receipts): implement receipt approval with transaction creation"
```

---

### Task 7: Add multi-country currency/format support to amount parser

**Files:**
- Modify: `backend/src/modules/parsing/helpers/universal-amount-parser.helper.ts` (or wherever the amount parser lives)
- Create: `backend/@tests/unit/modules/parsing/amount-parser-intl.spec.ts`

**Context:** Different countries use different number formats (1.234,56 vs 1,234.56 vs 1 234,56) and currency symbols. The existing parser handles 20+ currencies but may not handle all number formats. We need to ensure robust parsing for European (comma decimal), Asian (no separator), and Middle Eastern formats.

**Step 1: Write tests for international amount formats**

```typescript
describe('International amount parsing', () => {
  // European format: dot as thousands separator, comma as decimal
  it('should parse 1.234,56 EUR', () => {
    expect(parseAmount('1.234,56 €')).toEqual({ amount: 1234.56, currency: 'EUR' });
  });

  // Swiss format: apostrophe as thousands separator
  it("should parse 1'234.56 CHF", () => {
    expect(parseAmount("CHF 1'234.56")).toEqual({ amount: 1234.56, currency: 'CHF' });
  });

  // Indian format: lakh separator
  it('should parse ₹1,23,456.78', () => {
    expect(parseAmount('₹1,23,456.78')).toEqual({ amount: 123456.78, currency: 'INR' });
  });

  // Japanese format: no decimal, yen
  it('should parse ¥12,345', () => {
    expect(parseAmount('¥12,345')).toEqual({ amount: 12345, currency: 'JPY' });
  });

  // Arabic numerals
  it('should parse Arabic-Indic numerals ١٢٣٤٫٥٦', () => {
    expect(parseAmount('١٢٣٤٫٥٦ ر.س')).toEqual({ amount: 1234.56, currency: 'SAR' });
  });

  // Space as thousands separator (French, Russian)
  it('should parse 1 234,56 ₽', () => {
    expect(parseAmount('1 234,56 ₽')).toEqual({ amount: 1234.56, currency: 'RUB' });
  });
});
```

**Step 2–5:** Standard TDD cycle. Extend the amount parser to handle:
- Comma-as-decimal detection heuristic (if last separator is comma and has 1-2 digits after)
- Arabic-Indic numeral conversion (٠-٩ → 0-9)
- Apostrophe/space/thin-space as thousands separator
- Indian lakh format (XX,XX,XXX)
- Additional currency symbols: CHF, SAR (ر.س), BRL (R$), MXN, ZAR (R), AED (د.إ), etc.

```bash
git commit -m "feat(parsing): extend amount parser for international number formats and currencies"
```

---

### Task 8: Frontend — Receipt upload component

**Files:**
- Create: `frontend/app/components/receipts/ReceiptUploadModal.tsx`
- Create: `frontend/app/components/receipts/ReceiptUploadDropzone.tsx`
- Create: `frontend/app/components/receipts/hooks/useReceiptUpload.ts`

**Context:** A modal with drag-and-drop zone for uploading receipt images/PDFs. Accepts: JPEG, PNG, WEBP, BMP, TIFF, PDF. Max 5 files, 10MB each. Shows upload progress and processing status. Uses existing UI components (Modal from Mantine, Spinner, etc).

**Step 1: Create the upload hook**

```typescript
// hooks/useReceiptUpload.ts
export function useReceiptUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipts = async (files: File[], language?: string) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (language) formData.append('language', language);

    try {
      const response = await apiClient.post('/receipts/upload', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadReceipts, uploading, progress, error };
}
```

**Step 2: Create the dropzone component**

Drag-and-drop zone with:
- File type validation (image/*, application/pdf)
- Size validation (10MB per file)
- Preview thumbnails for selected files
- Remove individual files before upload
- Language selector dropdown (optional, default "Auto-detect")

**Step 3: Create the modal wrapper**

Modal shell wrapping the dropzone with:
- Title "Upload Receipts" / "Загрузить чеки"
- Upload button with loading state
- Success/error feedback

**Step 4: Write component tests**

```typescript
// ReceiptUploadModal.test.tsx
describe('ReceiptUploadModal', () => {
  it('should render upload dropzone', () => { ... });
  it('should validate file types', () => { ... });
  it('should reject files over 10MB', () => { ... });
  it('should show upload progress', () => { ... });
});
```

**Step 5: Commit**

```bash
git commit -m "feat(receipts): add receipt upload modal with drag-and-drop"
```

---

### Task 9: Frontend — Camera capture component

**Files:**
- Create: `frontend/app/components/receipts/ReceiptCameraCapture.tsx`
- Create: `frontend/app/components/receipts/hooks/useCamera.ts`

**Context:** Uses browser `navigator.mediaDevices.getUserMedia()` API to access the back camera. Provides a live viewfinder with a capture button. After capture, shows preview with retake/confirm options. On mobile, additionally supports `<input type="file" accept="image/*" capture="environment">` as fallback.

**Step 1: Create the camera hook**

```typescript
// hooks/useCamera.ts
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsCameraAvailable(true);
    } catch (err) {
      setError('Camera access denied or unavailable');
      setIsCameraAvailable(false);
    }
  };

  const capturePhoto = (): Promise<Blob | null> => {
    if (!videoRef.current) return Promise.resolve(null);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92),
    );
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  return { videoRef, startCamera, capturePhoto, stopCamera, error, isCameraAvailable };
}
```

**Step 2: Create the camera component**

```typescript
// ReceiptCameraCapture.tsx
// - Live video viewfinder (full-width, 4:3 aspect ratio)
// - Capture button (large, centered bottom)
// - Flash toggle (if supported)
// - After capture: preview image with Retake / Use Photo buttons
// - On mobile fallback: <input type="file" capture="environment" accept="image/*">
// - Sends confirmed photo to POST /receipts/scan endpoint
```

**Step 3: Write tests**

Test camera permission handling, capture flow, and mobile fallback rendering.

**Step 4: Commit**

```bash
git commit -m "feat(receipts): add camera capture component for receipt scanning"
```

---

### Task 10: Frontend — Receipt list page (replace current statements page at /receipts)

**Files:**
- Rewrite: `frontend/app/(main)/receipts/page.tsx`
- Create: `frontend/app/components/receipts/ReceiptsList.tsx`
- Create: `frontend/app/components/receipts/ReceiptCard.tsx`
- Create: `frontend/app/components/receipts/ReceiptFilters.tsx`
- Create: `frontend/app/components/receipts/hooks/useReceipts.ts`

**Context:** The current `/receipts` page incorrectly displays bank statements. Replace it with a proper receipt management page. Layout: filter bar at top, grid/list of receipt cards, each card shows: thumbnail, vendor name, date, amount, status badge, source icon (upload/scan/gmail). Actions: view details, approve, reject, delete.

**Step 1: Create the data hook**

```typescript
// hooks/useReceipts.ts
export function useReceipts(filters: ReceiptFilters) {
  // Use existing data fetching pattern from the project (axios/SWR/react-query)
  return useQuery({
    queryKey: ['receipts', filters],
    queryFn: () => apiClient.get('/receipts', { params: filters }).then((r) => r.data),
  });
}
```

**Step 2: Create ReceiptCard component**

Card showing:
- Image thumbnail (or PDF icon)
- Vendor name (or "Unknown" if not extracted)
- Date
- Amount + currency with locale-aware formatting
- Status badge (color-coded: green=approved, yellow=needs_review, blue=draft, red=failed)
- Source icon (camera/upload/gmail/telegram)

**Step 3: Create ReceiptFilters component**

- Status filter (dropdown: All, Needs Review, Draft, Approved, Rejected)
- Source filter (dropdown: All, Upload, Scan, Gmail)
- Date range picker
- Search by vendor name

**Step 4: Create ReceiptsList component**

- Responsive grid of ReceiptCards
- Empty state with illustration/CTA
- Loading skeleton
- Pagination

**Step 5: Rewrite the page**

```typescript
// frontend/app/(main)/receipts/page.tsx
export default function ReceiptsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  return (
    <div>
      <PageHeader title="Receipts" actions={
        <>
          <Button onClick={() => setShowCamera(true)} icon={<CameraIcon />}>Scan</Button>
          <Button onClick={() => setShowUploadModal(true)} icon={<UploadIcon />}>Upload</Button>
        </>
      } />
      <ReceiptFilters />
      <ReceiptsList />
      <ReceiptUploadModal open={showUploadModal} onClose={() => setShowUploadModal(false)} />
      <ReceiptCameraCapture open={showCamera} onClose={() => setShowCamera(false)} />
    </div>
  );
}
```

**Step 6: Write component tests and commit**

```bash
git commit -m "feat(receipts): build receipt list page with filters, upload, and camera actions"
```

---

### Task 11: Frontend — Receipt detail/review view

**Files:**
- Create: `frontend/app/components/receipts/ReceiptDetailPanel.tsx`
- Create: `frontend/app/components/receipts/ReceiptParsedDataForm.tsx`
- Create: `frontend/app/components/receipts/ReceiptLineItems.tsx`

**Context:** Uses the existing side panel system (`SidePanel`). When user clicks a receipt card, the detail panel opens showing: original image/PDF on left, parsed data form on right. User can edit extracted fields before approving.

**Step 1: Create the detail panel**

Layout (side panel):
- Left side: Image viewer / PDF viewer (reuse existing `TransactionDocumentViewer` or `PDFPreviewModal` patterns)
- Right side: Editable form with extracted data

**Step 2: Create the parsed data form**

Editable fields:
- Vendor name (text input)
- Date (date picker)
- Total amount (number input)
- Currency (dropdown with common currencies)
- Tax/VAT amount (number input)
- Category (category selector — reuse existing category component)
- Transaction type (income/expense toggle)
- Payment method (dropdown: cash/card/bank transfer)
- Line items table (editable rows: description + amount)

Each field shows confidence indicator (green/yellow/red based on `fieldConfidence`).

**Step 3: Create action buttons**

- Approve (creates transaction, shows success toast)
- Save Draft (saves edits without approving)
- Reject (marks as rejected with optional reason)
- Delete

**Step 4: Write tests and commit**

```bash
git commit -m "feat(receipts): add receipt detail panel with editable parsed data form"
```

---

### Task 12: Database migration for receipts module changes

**Files:**
- Create: `backend/src/migrations/{timestamp}-AddReceiptLanguageAndProcessingMetadata.ts`
- Modify: `backend/src/entities/receipt.entity.ts`

**Context:** The existing `Receipt` entity needs minor additions:
- `language` column (varchar, nullable) — the OCR language used/detected
- `extractionMethod` column (varchar, nullable) — how data was extracted (regex/ai/hybrid/ocr_regex/ocr_ai/ocr_hybrid)
- `confidence` column (decimal 3,2, nullable) — overall extraction confidence (currently only in parsedData JSONB)

**Step 1: Generate migration**

```bash
cd backend && npm run typeorm migration:generate -- -n AddReceiptOcrMetadata
```

**Step 2: Review and adjust generated SQL**

```sql
ALTER TABLE "receipts" ADD COLUMN "language" varchar(10);
ALTER TABLE "receipts" ADD COLUMN "extraction_method" varchar(20);
ALTER TABLE "receipts" ADD COLUMN "confidence" decimal(3,2);
```

**Step 3: Update entity file**

Add the new columns to `receipt.entity.ts` with appropriate decorators.

**Step 4: Run migration**

```bash
cd backend && npm run migration:run:dev
```

**Step 5: Commit**

```bash
git commit -m "feat(receipts): add language, extraction method, and confidence columns"
```

---

### Task 13: Integration test — full receipt upload-to-transaction flow

**Files:**
- Create: `backend/@tests/e2e/receipts/receipt-upload-flow.e2e-spec.ts`

**Context:** End-to-end test verifying the complete flow: upload image → background processing → OCR extraction → receipt in PARSED/DRAFT status → approve → transaction created.

**Step 1: Write the e2e test**

```typescript
describe('Receipt Upload Flow (e2e)', () => {
  it('should process uploaded receipt image and create transaction on approval', async () => {
    // 1. Upload a test receipt image
    const response = await request(app.getHttpServer())
      .post('/receipts/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-workspace-id', workspaceId)
      .attach('files', './test-fixtures/receipt-lidl.jpg');

    expect(response.status).toBe(201);
    const receiptId = response.body.receipts[0].id;

    // 2. Wait for background processing (poll status)
    let receipt;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await request(app.getHttpServer())
        .get(`/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);
      receipt = res.body;
      if (receipt.status !== 'new') break;
    }

    expect(['parsed', 'draft', 'needs_review']).toContain(receipt.status);
    expect(receipt.parsedData).toBeDefined();

    // 3. Approve receipt
    const approveRes = await request(app.getHttpServer())
      .post(`/receipts/${receiptId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-workspace-id', workspaceId);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.transactionId).toBeDefined();

    // 4. Verify transaction was created
    const txRes = await request(app.getHttpServer())
      .get(`/transactions/${approveRes.body.transactionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-workspace-id', workspaceId);

    expect(txRes.status).toBe(200);
    expect(txRes.body.counterpartyName).toBeDefined();
  });
});
```

**Step 2–5:** Standard cycle: write → run → fix → commit.

```bash
git commit -m "test(receipts): add e2e test for full receipt upload-to-transaction flow"
```

---

### Task 14: Add test receipt fixtures for multiple languages

**Files:**
- Create: `backend/@tests/fixtures/receipts/receipt-en-us.jpg` (English receipt)
- Create: `backend/@tests/fixtures/receipts/receipt-de-de.jpg` (German receipt)
- Create: `backend/@tests/fixtures/receipts/receipt-ru-ru.jpg` (Russian receipt)
- Create: `backend/@tests/fixtures/receipts/receipt-ja-jp.jpg` (Japanese receipt)
- Create: `backend/@tests/fixtures/receipts/receipt-ar-sa.jpg` (Arabic receipt)
- Create: `backend/@tests/unit/modules/parsing/ocr-multilang.spec.ts`

**Context:** Create test receipt images for multi-language OCR verification. Generate programmatically using `sharp` with SVG text overlay.

**Step 1: Generate test receipt images**

Use `sharp` to create simple test receipts with known text in multiple languages:

```typescript
import sharp from 'sharp';

async function createTestReceipt(text: string, filename: string) {
  const svg = `<svg width="400" height="600">
    <rect width="400" height="600" fill="white"/>
    <text x="20" y="40" font-size="16" font-family="sans-serif">${text}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg().toFile(filename);
}
```

**Step 2: Write multi-language OCR integration tests**

```typescript
describe('OCR Multi-language', () => {
  it('should extract text from English receipt', async () => {
    const buffer = await readFile('fixtures/receipts/receipt-en-us.jpg');
    const result = await ocrService.extractTextFromImage(buffer, { languages: ['eng'] });
    expect(result.text).toContain('Total');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should auto-detect Russian and extract text', async () => {
    const buffer = await readFile('fixtures/receipts/receipt-ru-ru.jpg');
    const result = await ocrService.extractTextFromImage(buffer); // auto-detect
    expect(result.text).toContain('Итого');
  });

  // Similar tests for German, Japanese, Arabic
});
```

**Step 3: Commit**

```bash
git commit -m "test(ocr): add multi-language receipt fixtures and integration tests"
```

---

## Summary of All Tasks

| # | Task | Category | Estimated Effort |
|---|------|----------|-----------------|
| 1 | Extend OcrService for 15 languages | Backend | 30 min |
| 2 | Add language auto-detection to OcrService | Backend | 45 min |
| 3 | Create standalone Receipts module (controller + service + DTOs) | Backend | 1.5 hr |
| 4 | Implement receipt processing pipeline (background jobs) | Backend | 1 hr |
| 5 | Extract shared receipt services from Gmail module | Backend/Refactor | 1 hr |
| 6 | Receipt-to-transaction conversion (approve flow) | Backend | 45 min |
| 7 | Multi-country currency/format support in amount parser | Backend | 1 hr |
| 8 | Frontend — Receipt upload modal | Frontend | 1 hr |
| 9 | Frontend — Camera capture component | Frontend | 1 hr |
| 10 | Frontend — Receipt list page | Frontend | 1.5 hr |
| 11 | Frontend — Receipt detail/review panel | Frontend | 1.5 hr |
| 12 | Database migration | Backend | 20 min |
| 13 | E2E integration test | Testing | 1 hr |
| 14 | Multi-language test fixtures | Testing | 45 min |

**Total estimated effort: ~13 hours**

## Dependency Graph

```
Task 1 (languages) → Task 2 (auto-detect) → Task 4 (processor)
Task 3 (module) → Task 4 (processor) → Task 6 (approve)
Task 5 (extract services) → Task 4 (processor)
Task 7 (amounts) — independent, can run in parallel
Task 8 (upload UI) → Task 10 (list page)
Task 9 (camera UI) → Task 10 (list page)
Task 10 (list page) → Task 11 (detail panel)
Task 12 (migration) — should run before Task 3
Task 13 (e2e) — after Tasks 1-6
Task 14 (fixtures) — after Task 2
```

**Recommended execution order:**
1. Task 12 (migration) — schema first
2. Tasks 1 → 2 (OCR languages + auto-detect)
3. Task 7 (amount parser — independent)
4. Task 5 (extract services)
5. Task 3 (receipts module)
6. Task 4 (processor)
7. Task 6 (approve flow)
8. Tasks 8 + 9 in parallel (upload + camera UI)
9. Task 10 (list page)
10. Task 11 (detail panel)
11. Tasks 13 + 14 (tests)
