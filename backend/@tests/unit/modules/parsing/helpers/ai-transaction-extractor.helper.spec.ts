import { BaseAiHelper } from '@/common/helpers/base-ai.helper';
import { AiTransactionExtractor } from '@/modules/parsing/helpers/ai-transaction-extractor.helper';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
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

describe('AiTransactionExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
  });

  it('maps AI transactions into parsed transactions', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            transactions: [
              {
                date: '2026-01-15',
                document_number: 'DOC-1',
                counterparty_name: 'Acme',
                amount_debit: '1200.50',
                purpose: 'Invoice payment',
              },
            ],
          }),
      },
    });

    const extractor = new AiTransactionExtractor('fake-api-key');
    const result = await extractor.extractTransactions('statement text');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      documentNumber: 'DOC-1',
      counterpartyName: 'Acme',
      debit: 1200.5,
      paymentPurpose: 'Invoice payment',
      currency: 'KZT',
    });
    expect(mockRecordAiSuccess).toHaveBeenCalled();
  });

  it('extends BaseAiHelper', () => {
    const extractor = new AiTransactionExtractor('fake-api-key');

    expect(extractor).toBeInstanceOf(BaseAiHelper);
  });

  it('returns empty array when circuit breaker is open', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);

    const extractor = new AiTransactionExtractor('fake-api-key');
    await expect(extractor.extractTransactions('statement text')).resolves.toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
