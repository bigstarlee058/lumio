import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  extractBestNumberPart as selectBestNumberPart,
  extractCurrency as detectCurrency,
  parseAmountFragment as parseSharedAmountFragment,
} from '../../../common/utils/receipt-amount.util';
import {
  extractAmountFragments as extractSharedAmountFragments,
  isAddressLike as isSharedAddressLike,
  isDateRangeLike as isSharedDateRangeLike,
  isLikelySentence as isSharedLikelySentence,
  isYearLikeAmount as isSharedYearLikeAmount,
  scoreAmountCandidate as scoreSharedAmountCandidate,
} from '../../../common/utils/receipt-extraction.util';
import {
  AiDocumentExtractor,
  type AiExtractionResult,
} from '../helpers/ai-document-extractor.helper';
import type {
  DocumentType,
  LineItem,
  ParsedDocument,
} from '../interfaces/parsed-document.interface';
import { DocumentClassifierService } from './document-classifier.service';
import { OcrService } from './ocr.service';
import { TransactionTypeDetectorService } from './transaction-type-detector.service';
import { UniversalAmountParser } from './universal-amount-parser.service';

export interface ExtractorContext {
  sender?: string;
  subject?: string;
  fileNameHint?: string;
  emailBody?: string;
  ocrLanguages?: string[];
}

type AmountCandidate = {
  amount: number;
  currency?: string;
  score: number;
};

const TOTAL_KEYWORD_REGEX =
  /\b(grand\s*total|total\s*amount|amount\s*(due|charged|paid|to\s*pay)|total|итого|сумма|всего|к\s*оплате|оплата|celkem)\b/i;

const NUMBER_PATTERN = '-?\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{1,2})?|-?\\d+(?:[.,]\\d{1,2})?';

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₽': 'RUB',
  '₸': 'KZT',
  '₴': 'UAH',
  '₺': 'TRY',
  '₹': 'INR',
  '₩': 'KRW',
  Kč: 'CZK',
  Ft: 'HUF',
  zł: 'PLN',
  lei: 'RON',
  kn: 'HRK',
  Br: 'BYN',
  kr: 'SEK',
  лв: 'BGN',
};

const DATE_PATTERNS = [/\d{2}[-/.]\d{2}[-/.]\d{4}/, /\d{4}[-/.]\d{2}[-/.]\d{2}/];

const TAX_PATTERNS = [
  /tax[:\s]+(\d+[\s,.]?\d*)/i,
  /vat[:\s]+(\d+[\s,.]?\d*)/i,
  /НДС[:\s]+(\d+[\s,.]?\d*)/i,
  /налог[:\s]+(\d+[\s,.]?\d*)/i,
];

const SUBTOTAL_PATTERNS = [
  /subtotal[:\s]+(\d+[\s,.]?\d*)/i,
  /sub\s*-?\s*total[:\s]+(\d+[\s,.]?\d*)/i,
  /подитог[:\s]+(\d+[\s,.]?\d*)/i,
  /промежуточный\s*итог[:\s]+(\d+[\s,.]?\d*)/i,
];

@Injectable()
export class UniversalExtractorService {
  private readonly logger = new Logger(UniversalExtractorService.name);

  constructor(
    private readonly amountParser: UniversalAmountParser,
    private readonly typeDetector: TransactionTypeDetectorService,
    private readonly classifier: DocumentClassifierService,
    private readonly ocrService: OcrService,
    @Optional()
    @Inject('AI_DOCUMENT_EXTRACTOR')
    private readonly aiExtractor?: AiDocumentExtractor,
  ) {}

  async extractFromText(text: string, context: ExtractorContext = {}): Promise<ParsedDocument> {
    if (!text || !text.trim()) {
      return this.emptyResult();
    }

    const classification = this.classifier.classify(text, {
      fileNameHint: context.fileNameHint,
    });

    const regexResult = await this.extractWithRegex(text, classification.documentType, context);

    const aiResult =
      this.aiExtractor?.isAvailable() && regexResult.confidence < 0.6
        ? await this.aiExtractor.extractFromText(text)
        : null;

    const merged = this.mergeResults(regexResult, aiResult);
    return this.validate(merged);
  }

  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    context: ExtractorContext = {},
  ): Promise<ParsedDocument> {
    const ocrResult = await this.ocrService.extractTextFromImage(imageBuffer, {
      languages: context.ocrLanguages,
      preprocess: true,
    });

    const fromText = await this.extractFromText(ocrResult.text, context);
    fromText.extractionMethod = 'ocr_regex';
    fromText.confidence = Math.round(fromText.confidence * ocrResult.confidence * 100) / 100;
    fromText.language = ocrResult.language;

    if (!this.aiExtractor?.isAvailable()) {
      return fromText;
    }

    const aiFromImage = await this.aiExtractor.extractFromImage(imageBuffer, mimeType);
    const merged = this.mergeResults(fromText, aiFromImage);
    merged.extractionMethod = 'ocr_hybrid';
    merged.language = ocrResult.language;
    return this.validate(merged);
  }

  async extractFromPdf(pdfBuffer: Buffer, context: ExtractorContext = {}): Promise<ParsedDocument> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer);
      const text = (data.text || '').trim();

      if (text.length > 50) {
        return this.extractFromText(text, context);
      }
    } catch (error) {
      this.logger.warn('Failed to extract text from PDF via pdf-parse', error);
    }

    const ocrResult = await this.ocrService.extractTextFromScannedPdf(pdfBuffer, {
      languages: context.ocrLanguages,
      preprocess: true,
    });

    if (ocrResult.text.trim().length) {
      const parsed = await this.extractFromText(ocrResult.text, context);
      parsed.extractionMethod = 'ocr_regex';
      parsed.confidence = Math.round(parsed.confidence * ocrResult.confidence * 100) / 100;
      parsed.language = ocrResult.language;
      return parsed;
    }

    return this.emptyResult();
  }

  private async extractWithRegex(
    text: string,
    documentType: DocumentType,
    context: ExtractorContext,
  ): Promise<ParsedDocument> {
    const lines = text
      .split('\n')
      .map(line => line.replace(/\u00a0/g, ' ').trim())
      .filter(Boolean);

    const amount = await this.extractAmountWithCurrency(lines, text);
    const currency = amount?.currency || this.extractCurrency(text) || 'KZT';
    const date = this.extractDate(text);
    const vendor = this.extractVendor(lines, context.sender);
    const tax = this.extractNumberByPatterns(text, TAX_PATTERNS);
    const subtotal = this.extractNumberByPatterns(text, SUBTOTAL_PATTERNS);
    const lineItems = await this.extractLineItems(lines);

    const transactionType = this.typeDetector.detect({
      text,
      documentType,
      amount: amount?.amount,
      sender: context.sender,
      subject: context.subject,
    });

    let taxRate: number | undefined;
    if (subtotal && tax && subtotal > 0) {
      taxRate = Math.round((tax / subtotal) * 10000) / 100;
    }

    const fieldConfidence = {
      totalAmount: amount ? 0.85 : 0,
      transactionType: transactionType.confidence,
      date: date ? 0.8 : 0,
      vendor: vendor ? 0.75 : 0,
      currency: currency ? 0.85 : 0,
      tax: tax ? 0.75 : 0,
      lineItems: lineItems.length ? 0.7 : 0,
    };

    return {
      documentType,
      transactionType: transactionType.direction,
      totalAmount: amount?.amount,
      currency,
      date,
      vendor,
      tax,
      taxRate,
      subtotal,
      lineItems,
      confidence: this.calculateOverallConfidence(fieldConfidence),
      extractionMethod: 'regex',
      rawText: text,
      fieldConfidence,
      validationIssues: [],
      language: undefined,
    };
  }

  private async extractAmountWithCurrency(
    lines: string[],
    fullText: string,
  ): Promise<{ amount: number; currency?: string } | undefined> {
    const documentCurrency = this.extractCurrency(fullText);
    const candidates: AmountCandidate[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const hasTotalKeyword = TOTAL_KEYWORD_REGEX.test(line);
      const fragments = this.extractAmountFragments(line, hasTotalKeyword);

      for (const fragment of fragments) {
        const parsed = await this.parseAmountFragment(fragment);
        if (!parsed || parsed.amount <= 0) {
          continue;
        }

        const fragmentCurrency = this.extractCurrency(fragment);
        const lineCurrency = this.extractCurrency(line);
        const currency = parsed.currency || fragmentCurrency || lineCurrency || documentCurrency;
        const explicitCurrency = Boolean(parsed.currency || fragmentCurrency);
        const score = this.scoreAmountCandidate(
          parsed.amount,
          hasTotalKeyword,
          explicitCurrency,
          index,
          lines.length,
        );

        candidates.push({
          amount: parsed.amount,
          currency,
          score,
        });
      }
    }

    if (!candidates.length) {
      return undefined;
    }

    candidates.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.amount - left.amount;
    });

    return {
      amount: candidates[0].amount,
      currency: candidates[0].currency,
    };
  }

  private extractAmountFragments(line: string, includeNumbersWithoutCurrency: boolean): string[] {
    return extractSharedAmountFragments(
      line,
      includeNumbersWithoutCurrency,
      this.getCurrencyTokenPattern(),
    );
  }

  private async parseAmountFragment(
    fragment: string,
  ): Promise<{ amount: number; currency?: string } | null> {
    return parseSharedAmountFragment(fragment, {
      amountParser: this.amountParser,
      extractCurrency: text => this.extractCurrency(text),
      numberPattern: NUMBER_PATTERN,
    });
  }

  private extractBestNumberPart(value: string): string | undefined {
    return selectBestNumberPart(value, NUMBER_PATTERN);
  }

  private extractCurrency(text: string): string | undefined {
    return detectCurrency(text, this.amountParser, SYMBOL_TO_CURRENCY);
  }

  private extractDate(text: string): Date | undefined {
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (!match?.[0]) {
        continue;
      }

      const candidate = match[0];
      if (/^\d{4}/.test(candidate)) {
        const date = new Date(candidate.replace(/[/.]/g, '-'));
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }

      const [left, middle, right] = candidate.split(/[./-]/).map(part => Number(part));
      if (left > 0 && middle > 0 && right > 0) {
        const date = new Date(right, middle - 1, left);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  private extractVendor(lines: string[], sender?: string): string | undefined {
    for (const line of lines.slice(0, 8)) {
      if (line.length <= 2 || line.length > 50) {
        continue;
      }

      if (/^(page\s+\d+|receipt|invoice|чек|квитанция)$/i.test(line)) {
        continue;
      }

      if (/\b(total|итого|tax|vat|ндс|date|дата|amount)\b/i.test(line)) {
        continue;
      }

      if (/^\d+$/.test(line)) {
        continue;
      }

      if (/^[\d.,\s]+$/.test(line)) {
        continue;
      }

      return line.slice(0, 100);
    }

    if (!sender) {
      return undefined;
    }

    const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
    if (displayName && !displayName.includes('@')) {
      return displayName.slice(0, 100);
    }

    return undefined;
  }

  private extractNumberByPatterns(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const cleaned = match[1].replace(/[\s,]/g, '');
      const parsed = Number.parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private async extractLineItems(lines: string[]): Promise<LineItem[]> {
    const lineItems: LineItem[] = [];
    const itemPattern = new RegExp(
      `^(.+?)\\s+((?:${this.getCurrencyTokenPattern()}\\s*)?(?:${NUMBER_PATTERN})(?:\\s*(?:${this.getCurrencyTokenPattern()}))?)$`,
      'i',
    );

    for (const line of lines) {
      if (TOTAL_KEYWORD_REGEX.test(line) || TAX_PATTERNS.some(pattern => pattern.test(line))) {
        continue;
      }

      const match = line.match(itemPattern);
      if (!match) {
        continue;
      }

      const description = match[1].trim();
      const amount = await this.parseAmountFragment(match[2]);
      const hasExplicitCurrency = Boolean(this.extractCurrency(match[2]));
      if (
        amount?.amount !== undefined &&
        Number.isFinite(amount.amount) &&
        amount.amount > 0 &&
        description.length > 0 &&
        description.length < 200
      ) {
        if (this.isLikelySentence(description)) {
          continue;
        }

        if (this.isDateRangeLike(description)) {
          continue;
        }

        if (this.isAddressLike(description)) {
          continue;
        }

        if (this.isYearLikeAmount(amount.amount, hasExplicitCurrency)) {
          continue;
        }

        lineItems.push({
          description,
          amount: amount.amount,
        });
      }
    }

    return lineItems;
  }

  private mergeResults(
    primary: ParsedDocument,
    aiResult: AiExtractionResult | null,
  ): ParsedDocument {
    if (!aiResult) {
      return primary;
    }

    const merged: ParsedDocument = {
      ...primary,
      totalAmount: primary.totalAmount ?? aiResult.totalAmount,
      transactionType:
        primary.transactionType !== 'unknown'
          ? primary.transactionType
          : aiResult.transactionType || 'unknown',
      currency: primary.currency || aiResult.currency,
      date: primary.date || (aiResult.date ? new Date(aiResult.date) : undefined),
      vendor: primary.vendor || aiResult.vendor,
      tax: primary.tax ?? aiResult.tax,
      taxRate: primary.taxRate ?? aiResult.taxRate,
      subtotal: primary.subtotal ?? aiResult.subtotal,
      lineItems: primary.lineItems.length ? primary.lineItems : aiResult.lineItems || [],
      categoryHint: primary.categoryHint || aiResult.categoryHint,
      paymentMethod: primary.paymentMethod || aiResult.paymentMethod,
      documentNumber: primary.documentNumber || aiResult.documentNumber,
      extractionMethod: 'hybrid',
      fieldConfidence: {
        ...primary.fieldConfidence,
        totalAmount: primary.fieldConfidence.totalAmount || (aiResult.totalAmount ? 0.75 : 0),
        transactionType:
          primary.fieldConfidence.transactionType || (aiResult.transactionType ? 0.7 : 0),
        date: primary.fieldConfidence.date || (aiResult.date ? 0.7 : 0),
        vendor: primary.fieldConfidence.vendor || (aiResult.vendor ? 0.7 : 0),
        currency: primary.fieldConfidence.currency || (aiResult.currency ? 0.7 : 0),
        tax: primary.fieldConfidence.tax || (aiResult.tax ? 0.65 : 0),
        lineItems: primary.fieldConfidence.lineItems || (aiResult.lineItems?.length ? 0.65 : 0),
      },
    };

    merged.confidence = this.calculateOverallConfidence(merged.fieldConfidence);
    return merged;
  }

  private validate(doc: ParsedDocument): ParsedDocument {
    const validationIssues: string[] = [...doc.validationIssues];

    if (doc.subtotal && doc.tax && doc.totalAmount) {
      const expectedTotal = doc.subtotal + doc.tax;
      if (Math.abs(expectedTotal - doc.totalAmount) > 0.01) {
        validationIssues.push(
          `Subtotal (${doc.subtotal}) + tax (${doc.tax}) does not match total (${doc.totalAmount})`,
        );
      }
    }

    if (doc.lineItems.length > 0 && doc.totalAmount) {
      const lineItemsSum = doc.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const compareTo = doc.subtotal || doc.totalAmount;
      if (Math.abs(lineItemsSum - compareTo) > compareTo * 0.05) {
        validationIssues.push(
          `Line items sum (${lineItemsSum.toFixed(2)}) does not match total (${compareTo.toFixed(2)})`,
        );
      }
    }

    return {
      ...doc,
      validationIssues,
      language: doc.language,
    };
  }

  private calculateOverallConfidence(fieldConfidence: ParsedDocument['fieldConfidence']): number {
    const weights = {
      totalAmount: 0.35,
      transactionType: 0.2,
      date: 0.15,
      vendor: 0.15,
      currency: 0.05,
      tax: 0.05,
      lineItems: 0.05,
    } as const;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [field, weight] of Object.entries(weights) as Array<
      [keyof typeof weights, number]
    >) {
      const confidence = fieldConfidence[field];
      if (confidence === undefined || confidence <= 0) {
        continue;
      }

      weightedSum += confidence * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  private scoreAmountCandidate(
    amount: number,
    hasTotalKeyword: boolean,
    explicitCurrency: boolean,
    lineIndex: number,
    totalLines: number,
  ): number {
    return scoreSharedAmountCandidate(
      amount,
      hasTotalKeyword,
      explicitCurrency,
      lineIndex,
      totalLines,
    );
  }

  private getCurrencyTokenPattern(): string {
    const symbols = Object.keys(SYMBOL_TO_CURRENCY)
      .sort((left, right) => right.length - left.length)
      .map(symbol => this.escapeRegex(symbol));

    const currencyCodes = this.amountParser
      .getSupportedCurrencies()
      .sort((left, right) => right.length - left.length)
      .map(code => this.escapeRegex(code));

    return `(?:${symbols.join('|')}|${currencyCodes.join('|')})`;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private emptyResult(): ParsedDocument {
    return {
      documentType: 'unknown',
      transactionType: 'unknown',
      lineItems: [],
      confidence: 0,
      extractionMethod: 'regex',
      fieldConfidence: {},
      validationIssues: [],
      language: undefined,
    };
  }

  private isLikelySentence(value: string): boolean {
    return isSharedLikelySentence(value);
  }

  private isDateRangeLike(value: string): boolean {
    return isSharedDateRangeLike(value);
  }

  private isAddressLike(value: string): boolean {
    return isSharedAddressLike(value);
  }

  private isYearLikeAmount(amount: number, hasExplicitCurrency: boolean): boolean {
    return isSharedYearLikeAmount(amount, hasExplicitCurrency);
  }
}
