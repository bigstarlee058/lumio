import { BaseAiHelper } from '@/common/helpers/base-ai.helper';
import { AiParseValidator } from '@/modules/parsing/helpers/ai-parse-validator.helper';
import type { ParsedStatement } from '@/modules/parsing/interfaces/parsed-statement.interface';

const mockGenerateContent = jest.fn();
const mockExtractTextFromPdf = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

jest.mock('@/common/utils/pdf-parser.util', () => ({
  extractTextFromPdf: (...args: unknown[]) => mockExtractTextFromPdf(...args),
}));

const mockIsAiEnabled = jest.fn().mockReturnValue(true);
const mockIsAiCircuitOpen = jest.fn().mockReturnValue(false);
const mockRecordAiSuccess = jest.fn();
const mockRecordAiFailure = jest.fn();
const mockWithAiConcurrency = jest.fn().mockImplementation(fn => fn());
const mockRedactSensitive = jest.fn().mockImplementation(value => value);

jest.mock('@/modules/parsing/helpers/ai-runtime.util', () => ({
  isAiEnabled: (...args: unknown[]) => mockIsAiEnabled(...args),
  isAiCircuitOpen: (...args: unknown[]) => mockIsAiCircuitOpen(...args),
  recordAiSuccess: (...args: unknown[]) => mockRecordAiSuccess(...args),
  recordAiFailure: (...args: unknown[]) => mockRecordAiFailure(...args),
  withAiConcurrency: (...args: unknown[]) => mockWithAiConcurrency(...args),
  redactSensitive: (...args: unknown[]) => mockRedactSensitive(...args),
}));

describe('AiParseValidator', () => {
  const parsedStatement: ParsedStatement = {
    metadata: {
      accountNumber: 'KZ123',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T00:00:00.000Z'),
      currency: 'KZT',
    },
    transactions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
    mockExtractTextFromPdf.mockResolvedValue('pdf text');
  });

  it('returns notes when AI responds with empty content', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '',
      },
    });

    const validator = new AiParseValidator('fake-api-key');
    const result = await validator.reconcileFromPdf('/tmp/file.pdf', parsedStatement);

    expect(result).toEqual({
      corrected: parsedStatement,
      notes: ['AI returned empty content'],
    });
    expect(mockRecordAiFailure).toHaveBeenCalled();
  });

  it('extends BaseAiHelper', () => {
    const validator = new AiParseValidator('fake-api-key');

    expect(validator).toBeInstanceOf(BaseAiHelper);
  });

  it('returns circuit-breaker note when AI is unavailable', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);

    const validator = new AiParseValidator('fake-api-key');
    const result = await validator.reconcileFromPdf('/tmp/file.pdf', parsedStatement);

    expect(result).toEqual({
      corrected: parsedStatement,
      notes: ['AI temporarily disabled (circuit breaker)'],
    });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
