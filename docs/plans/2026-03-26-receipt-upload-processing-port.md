# Receipt Upload Processing Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the manual store-receipt upload, scan, OCR, review, and approval flow from `.worktrees/receipt-scan-upload-ocr` into the main project without disturbing unrelated local changes.

**Architecture:** Add a standalone backend `receipts` module with upload/scan CRUD endpoints, OCR-based parsing, duplicate/category helpers, and receipt-to-transaction approval. Reuse the existing receipt entity and parsing stack, but make manual receipt processing run safely inside the request path so unfinished background-job wiring from the worktree does not break Gmail processing. Replace the current receipts page with the dedicated receipt inbox UI and wire it to the new backend API.

**Tech Stack:** NestJS, TypeORM, Multer, Tesseract.js, Next.js, React, Vitest, Jest.

---

### Task 1: Add failing tests for backend receipt upload and processing flow

**Files:**
- Create: `backend/@tests/unit/modules/receipts/receipts.service.spec.ts`
- Create: `backend/@tests/unit/modules/receipts/receipts.controller.spec.ts`
- Create: `backend/@tests/unit/modules/receipts/receipt-processor.service.spec.ts`
- Modify: `backend/@tests/unit/modules/parsing/services/ocr.service.spec.ts`
- Create: `backend/@tests/unit/modules/parsing/services/universal-amount-parser.service.spec.ts`

**Steps:**
1. Add tests covering receipt upload/scan creation, processing, approval, file download, OCR language handling, and locale-aware amount parsing.
2. Run targeted backend Jest commands and confirm they fail because the `receipts` module and OCR enhancements are missing.

### Task 2: Port backend receipt module and supporting parsing/entity changes

**Files:**
- Create: `backend/src/modules/receipts/receipts.module.ts`
- Create: `backend/src/modules/receipts/receipts.controller.ts`
- Create: `backend/src/modules/receipts/receipts.service.ts`
- Create: `backend/src/modules/receipts/dto/upload-receipt.dto.ts`
- Create: `backend/src/modules/receipts/dto/update-receipt.dto.ts`
- Create: `backend/src/modules/receipts/dto/receipt-query.dto.ts`
- Create: `backend/src/modules/receipts/dto/bulk-approve.dto.ts`
- Create: `backend/src/modules/receipts/services/receipt-processor.service.ts`
- Create: `backend/src/modules/receipts/services/receipt-duplicate.service.ts`
- Create: `backend/src/modules/receipts/services/receipt-category.service.ts`
- Modify: `backend/src/modules/parsing/services/ocr.service.ts`
- Modify: `backend/src/modules/parsing/services/universal-extractor.service.ts`
- Modify: `backend/src/modules/parsing/services/universal-amount-parser.service.ts`
- Modify: `backend/src/entities/receipt.entity.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/migrations/1764300000000-AddReceiptOcrMetadata.ts`

**Steps:**
1. Implement the new receipt module and DTOs.
2. Add OCR language support and safer multi-locale amount parsing.
3. Extend the receipt entity with OCR metadata while preserving existing local edits.
4. Register the module and add the migration.
5. Run the targeted backend tests until green.

### Task 3: Add failing tests for frontend receipt inbox flow

**Files:**
- Create: `frontend/app/(main)/receipts/page.test.tsx`
- Create: `frontend/app/components/receipts/ReceiptUploadModal.test.tsx`
- Create: `frontend/app/components/receipts/hooks/useReceiptUpload.test.tsx`
- Modify: `frontend/app/components/PDFPreviewModal.test.tsx`

**Steps:**
1. Add tests for the dedicated receipts page, upload modal, upload hook, and receipt PDF preview endpoint.
2. Run targeted frontend Vitest commands and confirm they fail before the UI/API port is applied.

### Task 4: Port frontend receipt inbox UI and API wiring

**Files:**
- Create: `frontend/app/components/receipts/ReceiptCard.tsx`
- Create: `frontend/app/components/receipts/ReceiptFilters.tsx`
- Create: `frontend/app/components/receipts/ReceiptsList.tsx`
- Create: `frontend/app/components/receipts/ReceiptUploadModal.tsx`
- Create: `frontend/app/components/receipts/ReceiptCameraCapture.tsx`
- Create: `frontend/app/components/receipts/ReceiptDetailPanel.tsx`
- Create: `frontend/app/components/receipts/ReceiptParsedDataForm.tsx`
- Create: `frontend/app/components/receipts/receipt-types.ts`
- Create: `frontend/app/components/receipts/hooks/useReceipts.ts`
- Create: `frontend/app/components/receipts/hooks/useReceiptUpload.ts`
- Create: `frontend/app/components/receipts/hooks/useCamera.ts`
- Modify: `frontend/app/(main)/receipts/page.tsx`
- Modify: `frontend/app/lib/api.ts`
- Modify: `frontend/app/components/PDFPreviewModal.tsx`

**Steps:**
1. Replace the current receipts page with the dedicated inbox UI from the worktree.
2. Add the manual receipt API client and preview support.
3. Run the targeted frontend tests until green.

### Task 5: Verify the integrated port

**Files:**
- No new files.

**Steps:**
1. Run the targeted backend Jest suite for receipts/OCR/amount parsing.
2. Run the targeted frontend Vitest suite for the new receipt UI.
3. Run backend and frontend type checks if they are not blocked by unrelated local changes.
4. Summarize what was ported and call out any remaining follow-up.
