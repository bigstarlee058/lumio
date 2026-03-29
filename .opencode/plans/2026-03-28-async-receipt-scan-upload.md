# Async Receipt Scan Upload Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make receipt scan uploads return immediately (like bank statement uploads) instead of blocking the HTTP request while OCR runs. The drawer should close immediately, the receipt should appear in the list with "Uploaded" status, and process in the background.

**Problem:** `createStatementFromReceiptFile` in `statements.service.ts:601-771` calls `receiptsService.createFromScan()` synchronously, which runs Tesseract OCR + Gemini AI (3-30 seconds). The HTTP response is blocked the entire time, causing the frontend drawer to show "Saving..." for up to 30 seconds.

**Solution:** Split `createStatementFromReceiptFile` into two phases:
1. **Phase 1 (sync):** Create statement with `UPLOADED` status, save file, return immediately
2. **Phase 2 (async, fire-and-forget):** Run OCR, parse receipt, create transaction, update statement to `COMPLETED` or `ERROR`

This mirrors the bank statement pattern in `statements.service.ts:773-894` where `create()` saves with `UPLOADED` status and fires off `statementProcessingService.processStatement()` via `Promise.resolve(...).catch(...)`.

**Frontend: No changes needed.** The existing polling mechanism (`hasProcessingStatements` checks `uploaded`/`processing` statuses, polls every 4 seconds) will automatically pick up receipt statements in `UPLOADED` status and poll until they transition to `COMPLETED` or `ERROR`.

---

### Task 1: Write failing tests for async receipt scan behavior (TDD)

**Files:**
- Modify: `backend/@tests/unit/modules/statements/statements.service.spec.ts`

**Context:** Replace the two existing `createFromReceiptScan` tests (lines 558-665) with new tests that verify async behavior.

**Step 1: Replace existing tests in the `createFromReceiptScan` describe block**

Replace the test `'creates completed statement and verified expense transaction from scanned receipt OCR data'` (line 558) and `'throws bad request when receipt scan parsing fails'` (line 642) with these new tests:

```typescript
it('returns statement with UPLOADED status immediately without waiting for OCR', async () => {
  const file = {
    path: '/tmp/receipt.jpg',
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  jest.spyOn(statementRepository, 'create').mockImplementation((input: any) => input);
  jest
    .spyOn(statementRepository, 'save')
    .mockImplementation(async (input: any) => ({ id: 'stmt-ocr-1', ...input }));
  jest.spyOn(statementRepository, 'update').mockResolvedValue({ affected: 1 } as any);

  // Mock OCR — even though it would eventually succeed, createFromReceiptScan should NOT await it
  jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
    id: 'receipt-1',
    status: ReceiptStatus.DRAFT,
    subject: 'receipt.jpg',
    parsedData: {
      amount: 4590, currency: 'KZT', vendor: 'Magnum',
      date: '2026-03-27', categoryId: 'cat-1',
      transactionType: 'expense', confidence: 0.91, validationIssues: [],
    },
    extractionMethod: 'ocr_hybrid',
  } as any);

  const result = await (service as any).createFromReceiptScan({
    user: mockUser, workspaceId: 'ws-1', files: [file], language: 'ru',
  });

  // Statement should be created with UPLOADED status, not COMPLETED
  expect(statementRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      bankName: BankName.OTHER,
      status: StatementStatus.UPLOADED,
      parsingDetails: expect.objectContaining({ detectedBy: 'receipt-scan' }),
    }),
  );

  // Should NOT have created transactions synchronously
  expect(transactionRepository.create).not.toHaveBeenCalled();

  // Should return the statement immediately
  expect(result).toEqual([expect.objectContaining({ id: 'stmt-ocr-1', status: StatementStatus.UPLOADED })]);
});

it('fires receipt OCR processing asynchronously (fire-and-forget)', async () => {
  const file = {
    path: '/tmp/receipt.jpg',
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  // Use a deferred promise so we can verify OCR was NOT awaited
  let resolveOcr: (value: any) => void;
  const ocrPromise = new Promise(resolve => { resolveOcr = resolve; });
  jest.spyOn(receiptsService, 'createFromScan').mockReturnValue(ocrPromise as any);

  jest.spyOn(statementRepository, 'create').mockImplementation((input: any) => input);
  jest
    .spyOn(statementRepository, 'save')
    .mockImplementation(async (input: any) => ({ id: 'stmt-ocr-1', ...input }));
  jest.spyOn(statementRepository, 'update').mockResolvedValue({ affected: 1 } as any);
  jest.spyOn(transactionRepository, 'create').mockImplementation((input: any) => input);
  jest.spyOn(transactionRepository, 'save').mockImplementation(async (input: any) => ({ id: 'tx-1', ...input }));
  jest.spyOn(statementRepository, 'findOne').mockResolvedValue({ id: 'stmt-ocr-1' } as any);

  // createFromReceiptScan should return BEFORE OCR resolves
  const result = await (service as any).createFromReceiptScan({
    user: mockUser, workspaceId: 'ws-1', files: [file], language: 'ru',
  });

  // Verify it returned without waiting for OCR
  expect(result).toEqual([expect.objectContaining({ id: 'stmt-ocr-1' })]);

  // Now resolve OCR to clean up
  resolveOcr!({
    id: 'receipt-1', status: ReceiptStatus.DRAFT,
    parsedData: { amount: 4590, currency: 'KZT', vendor: 'Magnum', date: '2026-03-27', transactionType: 'expense' },
  });

  // Wait a tick for the fire-and-forget to process
  await new Promise(resolve => setImmediate(resolve));
});

it('does not throw when receipt OCR fails — sets ERROR status in background instead', async () => {
  const file = {
    path: '/tmp/receipt.jpg',
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  jest.spyOn(statementRepository, 'create').mockImplementation((input: any) => input);
  jest
    .spyOn(statementRepository, 'save')
    .mockImplementation(async (input: any) => ({ id: 'stmt-ocr-1', ...input }));
  jest.spyOn(statementRepository, 'update').mockResolvedValue({ affected: 1 } as any);

  // OCR will fail, but createFromReceiptScan should NOT throw
  jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
    id: 'receipt-failed', status: ReceiptStatus.FAILED,
    subject: 'receipt.jpg', parsedData: {},
  } as any);
  jest.spyOn(statementRepository, 'findOne').mockResolvedValue({ id: 'stmt-ocr-1' } as any);

  // Should NOT throw — error is handled in background
  const result = await (service as any).createFromReceiptScan({
    user: mockUser, workspaceId: 'ws-1', files: [file], language: 'ru',
  });

  expect(result).toEqual([expect.objectContaining({ id: 'stmt-ocr-1' })]);

  // Wait for background processing to run
  await new Promise(resolve => setImmediate(resolve));

  // Background should have updated statement to ERROR status
  expect(statementRepository.update).toHaveBeenCalledWith(
    'stmt-ocr-1',
    expect.objectContaining({
      status: StatementStatus.ERROR,
      errorMessage: expect.any(String),
    }),
  );
});

it('background processing updates statement to COMPLETED with transaction on success', async () => {
  const file = {
    path: '/tmp/receipt.jpg',
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  jest.spyOn(statementRepository, 'create').mockImplementation((input: any) => input);
  jest
    .spyOn(statementRepository, 'save')
    .mockImplementation(async (input: any) => ({ id: 'stmt-ocr-1', ...input }));
  jest.spyOn(statementRepository, 'update').mockResolvedValue({ affected: 1 } as any);
  jest.spyOn(transactionRepository, 'create').mockImplementation((input: any) => input);
  jest
    .spyOn(transactionRepository, 'save')
    .mockImplementation(async (input: any) => ({ id: 'tx-ocr-1', ...input }));
  jest.spyOn(statementRepository, 'findOne').mockResolvedValue({ id: 'stmt-ocr-1' } as any);

  jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
    id: 'receipt-1', status: ReceiptStatus.DRAFT, subject: 'receipt.jpg',
    parsedData: {
      amount: 4590, currency: 'KZT', vendor: 'Magnum',
      date: '2026-03-27', categoryId: 'cat-1', tax: 490, taxRate: 12,
      subtotal: 4100, transactionType: 'expense', confidence: 0.91,
      validationIssues: [],
    },
    extractionMethod: 'ocr_hybrid',
  } as any);

  await (service as any).createFromReceiptScan({
    user: mockUser, workspaceId: 'ws-1', files: [file], language: 'ru',
  });

  // Wait for background processing to run
  await new Promise(resolve => setImmediate(resolve));

  // Background should have created a transaction
  expect(transactionRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      statementId: 'stmt-ocr-1',
      debit: 4590, amount: 4590, currency: 'KZT',
      counterpartyName: 'Magnum', categoryId: 'cat-1', taxRateId: 'tax-1',
      transactionType: 'expense', isVerified: true,
    }),
  );

  // Background should have updated statement to COMPLETED
  expect(statementRepository.update).toHaveBeenCalledWith(
    'stmt-ocr-1',
    expect.objectContaining({ status: StatementStatus.COMPLETED }),
  );
});
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest --testPathPattern="statements.service.spec" --verbose 2>&1 | head -100`
Expected: FAIL — current code creates with `COMPLETED` status, creates transactions synchronously, and throws on OCR failure.

**Step 3: Do NOT implement yet — proceed to Task 2 for implementation.**

---

### Task 2: Refactor `createStatementFromReceiptFile` — Phase 1 (sync, return immediately)

**Files:**
- Modify: `backend/src/modules/statements/statements.service.ts`

**Context:** The current `createStatementFromReceiptFile` method (lines 601-771) does everything synchronously. We need to split it into Phase 1 (create placeholder statement) and Phase 2 (process in background).

**Step 1: Modify `createStatementFromReceiptFile` to only create the placeholder statement**

Replace the current method body with Phase 1 logic only:

```typescript
private async createStatementFromReceiptFile(params: {
  user: User;
  workspaceId: string;
  file: Express.Multer.File;
  language?: string;
}): Promise<Statement> {
  const { user, workspaceId, file, language } = params;
  const fileName = normalizeFilename(file.originalname);
  const fileType = getFileTypeFromMime(file.mimetype) as FileType;
  const fileHash = await calculateFileHash(file.path);
  const fileData = await fs.promises.readFile(file.path);

  // Phase 1: Create placeholder statement with UPLOADED status
  const statement = this.statementRepository.create({
    userId: user.id,
    workspaceId,
    fileName,
    filePath: file.path,
    fileType,
    fileSize: file.size,
    fileHash,
    bankName: BankName.OTHER,
    status: StatementStatus.UPLOADED,
    currency: 'KZT',
    parsingDetails: {
      detectedBy: 'receipt-scan',
      parserUsed: 'receipt-scan',
      parserVersion: '1',
    },
  });

  const savedStatement = (await this.statementRepository.save(statement)) as Statement;

  // Store file data in DB (non-critical)
  try {
    await this.statementRepository.update(savedStatement.id, { fileData });
  } catch (error) {
    console.warn(
      `[Statements] Failed to persist receipt scan file in DB: ${(error as Error)?.message}`,
    );
  }

  // Emit upload event (for notifications, same as bank statement flow)
  this.eventEmitter?.emit('statement.uploaded', {
    workspaceId,
    actorId: user.id,
    actorName: user.name || user.email || 'User',
    statementId: savedStatement.id,
    statementName: savedStatement.fileName,
    bankName: savedStatement.bankName,
  });

  // Phase 2: Fire-and-forget background processing
  Promise.resolve(
    this.processReceiptScanInBackground({
      statementId: savedStatement.id,
      user,
      workspaceId,
      file,
      language,
    }),
  ).catch(error => {
    console.error(
      `[Statements] Background receipt scan processing failed for statement ${savedStatement.id}:`,
      error,
    );
  });

  return savedStatement;
}
```

---

### Task 3: Create `processReceiptScanInBackground` method (Phase 2)

**Files:**
- Modify: `backend/src/modules/statements/statements.service.ts`

**Context:** This is the background method that does what `createStatementFromReceiptFile` used to do synchronously: call OCR, parse receipt, create transaction, update statement status.

**Step 1: Add the new private method after `createStatementFromReceiptFile`**

```typescript
private async processReceiptScanInBackground(params: {
  statementId: string;
  user: User;
  workspaceId: string;
  file: Express.Multer.File;
  language?: string;
}): Promise<void> {
  const { statementId, user, workspaceId, file, language } = params;

  try {
    // Run OCR (this is the expensive part: 3-30 seconds)
    const receipt = await this.receiptsService.createFromScan({
      userId: user.id,
      workspaceId,
      file,
      language,
    });

    if (receipt.status === ReceiptStatus.FAILED) {
      await this.statementRepository.update(statementId, {
        status: StatementStatus.ERROR,
        errorMessage: 'Receipt scan could not be processed',
      });
      return;
    }

    const parsed = receipt.parsedData ?? {};
    const amountValue = this.normalizePositiveAmount(parsed.amount);

    if (!amountValue) {
      await this.statementRepository.update(statementId, {
        status: StatementStatus.ERROR,
        errorMessage: 'Receipt amount could not be determined',
      });
      return;
    }

    const merchant =
      String(parsed.vendor || receipt.subject || '').trim() || 'Unknown merchant';
    const currency = String(parsed.currency || 'KZT').trim().toUpperCase();
    const parsedDate = parsed.date ? new Date(parsed.date) : new Date();
    const transactionDate = new Date(parsedDate.toISOString().slice(0, 10));

    const category = parsed.categoryId
      ? await this.categoryRepository.findOne({
          where: { workspaceId, id: parsed.categoryId },
        })
      : null;

    const fallbackCategory =
      category ??
      (await this.categoryRepository.findOne({
        where: { workspaceId, type: CategoryType.EXPENSE, isEnabled: true },
      }));

    if (!fallbackCategory) {
      await this.statementRepository.update(statementId, {
        status: StatementStatus.ERROR,
        errorMessage: 'No enabled expense category available for receipt scan',
      });
      return;
    }

    const taxRate = await this.taxRateRepository.findOne({
      where: { workspaceId, isDefault: true, isEnabled: true },
    });

    // Create transaction
    const transactionType =
      parsed.transactionType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const isExpense = transactionType === TransactionType.EXPENSE;

    const transaction = this.transactionRepository.create({
      workspaceId,
      statementId,
      transactionDate,
      counterpartyName: merchant,
      paymentPurpose: merchant,
      debit: isExpense ? amountValue : null,
      credit: isExpense ? null : amountValue,
      amount: amountValue,
      currency,
      transactionType,
      categoryId: fallbackCategory.id,
      taxRateId: taxRate?.id || null,
      isVerified: true,
    });

    await this.transactionRepository.save(transaction);

    // Update statement to COMPLETED with full parsing details
    await this.statementRepository.update(statementId, {
      status: StatementStatus.COMPLETED,
      processedAt: new Date(),
      statementDateFrom: transactionDate,
      statementDateTo: transactionDate,
      totalTransactions: 1,
      totalDebit: isExpense ? amountValue : 0,
      totalCredit: isExpense ? 0 : amountValue,
      currency,
      categoryId: fallbackCategory.id,
      parsingDetails: {
        detectedBy: 'receipt-scan',
        parserUsed: 'receipt-scan',
        parserVersion: '1',
        transactionsFound: 1,
        transactionsCreated: 1,
        metadataExtracted: {
          dateFrom: transactionDate.toISOString().slice(0, 10),
          dateTo: transactionDate.toISOString().slice(0, 10),
          currency,
        },
        validation: {
          passed: (parsed.validationIssues ?? []).length === 0,
          warnings: parsed.validationIssues ?? [],
        },
        importPreview: {
          source: 'receipt-scan',
          merchant,
          description: merchant,
          attachments: 1,
          categoryId: fallbackCategory.id,
          taxRateId: taxRate?.id || null,
          taxRateLabel: taxRate
            ? `${taxRate.name} (${Number(taxRate.rate || 0).toFixed(0)}%)`
            : null,
          confidence: parsed.confidence ?? receipt.confidence,
          extractionMethod: receipt.extractionMethod,
        },
      },
    });

    // Audit event
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      actorLabel: user.email || user.name || 'User',
      entityType: EntityType.STATEMENT,
      entityId: statementId,
      action: AuditAction.IMPORT,
      diff: { before: null, after: { id: statementId } },
      meta: {
        source: 'receipt-scan',
        amount: amountValue,
        currency,
        merchant,
        categoryId: fallbackCategory.id,
        taxRateId: taxRate?.id || null,
      },
      severity: Severity.INFO,
      isUndoable: false,
    });
  } catch (error) {
    console.error(
      `[Statements] Receipt scan processing error for statement ${statementId}:`,
      error,
    );
    try {
      await this.statementRepository.update(statementId, {
        status: StatementStatus.ERROR,
        errorMessage:
          error instanceof Error ? error.message : 'Receipt scan processing failed',
      });
    } catch (updateError) {
      console.error(
        `[Statements] Failed to update error status for statement ${statementId}:`,
        updateError,
      );
    }
  }
}
```

---

### Task 4: Run tests and verify they pass

**Step 1: Run the statements service tests**

Run: `cd backend && npx jest --testPathPattern="statements.service.spec" --verbose`
Expected: All tests pass, including the 4 new async receipt scan tests.

**Step 2: Run the full backend test suite**

Run: `cd backend && npx jest --verbose`
Expected: All tests pass. No regressions.

---

### Task 5: Verify the controller tests still pass

**Files:**
- `backend/@tests/unit/modules/statements/statements.controller.spec.ts`

The controller doesn't need changes — it just calls `statementsService.createFromReceiptScan()` and returns the result. But verify the existing tests still pass since the returned data shape may differ (status is now `UPLOADED` instead of `COMPLETED`).

Run: `cd backend && npx jest --testPathPattern="statements.controller.spec" --verbose`
Expected: All 5 tests pass.

---

## Summary of Changes

| File | Change |
|------|--------|
| `backend/src/modules/statements/statements.service.ts` | Refactor `createStatementFromReceiptFile` into Phase 1 (sync placeholder) + `processReceiptScanInBackground` (async OCR + transaction) |
| `backend/@tests/unit/modules/statements/statements.service.spec.ts` | Replace 2 sync receipt tests with 4 async behavior tests |

**No frontend changes needed.** The existing polling (`hasProcessingStatements` checks `uploaded`/`processing`) + `refreshStatementsAfterCreate()` + drawer close on success already provide the right UX.

## Dependency Graph

```
Task 1 (tests) → Task 2 (Phase 1 refactor) → Task 3 (Phase 2 background) → Task 4 (verify) → Task 5 (controller check)
```

All tasks are sequential — each depends on the previous.
