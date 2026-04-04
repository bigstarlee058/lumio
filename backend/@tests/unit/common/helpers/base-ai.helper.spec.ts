const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const mockIsAiEnabled = jest.fn().mockReturnValue(true);
const mockIsAiCircuitOpen = jest.fn().mockReturnValue(false);
const mockRecordAiSuccess = jest.fn();
const mockRecordAiFailure = jest.fn();
const mockWithAiConcurrency = jest.fn().mockImplementation(fn => fn());

jest.mock('@/modules/parsing/helpers/ai-runtime.util', () => ({
  isAiEnabled: (...args: unknown[]) => mockIsAiEnabled(...args),
  isAiCircuitOpen: (...args: unknown[]) => mockIsAiCircuitOpen(...args),
  recordAiSuccess: (...args: unknown[]) => mockRecordAiSuccess(...args),
  recordAiFailure: (...args: unknown[]) => mockRecordAiFailure(...args),
  withAiConcurrency: (...args: unknown[]) => mockWithAiConcurrency(...args),
}));

import { BaseAiHelper } from '@/common/helpers/base-ai.helper';

class TestAiHelper extends BaseAiHelper {
  async call(payload: string) {
    return this.generateJsonContent([{ role: 'user', parts: [{ text: payload }] }], {
      timeoutMs: 123,
      timeoutMessage: 'timed out',
      retries: 1,
      baseDelayMs: 10,
      maxDelayMs: 20,
    });
  }
}

describe('BaseAiHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
  });

  it('reports availability when model exists and AI is enabled', () => {
    const helper = new TestAiHelper('test-key');

    expect(helper.isAvailable()).toBe(true);
  });

  it('returns null when circuit breaker is open', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);
    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBeNull();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('records success and returns text content for successful request', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '{"ok":true}',
      },
    });

    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBe('{"ok":true}');
    expect(mockRecordAiSuccess).toHaveBeenCalled();
  });

  it('records failure when response text is empty', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '',
      },
    });

    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBeNull();
    expect(mockRecordAiFailure).toHaveBeenCalled();
  });
});
