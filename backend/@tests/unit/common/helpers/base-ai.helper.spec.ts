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
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_BASE_URL = 'http://localhost:11434';
    process.env.AI_MODEL = 'llama3.1';
    global.fetch = jest.fn();
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.AI_BASE_URL = undefined;
    process.env.AI_MODEL = undefined;
  });

  it('reports availability when model exists and AI is enabled', () => {
    const helper = new TestAiHelper('test-key');

    expect(helper.isAvailable()).toBe(true);
  });

  it('returns null when circuit breaker is open', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);
    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('records success and returns text content for successful request', async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    } as Response);

    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBe('{"ok":true}');
    expect(mockRecordAiSuccess).toHaveBeenCalled();
  });

  it('records failure when response text is empty', async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    } as Response);

    const helper = new TestAiHelper('test-key');

    await expect(helper.call('hello')).resolves.toBeNull();
    expect(mockRecordAiFailure).toHaveBeenCalled();
  });
});
