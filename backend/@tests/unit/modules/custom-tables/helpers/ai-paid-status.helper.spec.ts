import { BaseAiHelper } from '@/common/helpers/base-ai.helper';
import { AiPaidStatusClassifier } from '@/modules/custom-tables/helpers/ai-paid-status.helper';

const mockFetch = jest.fn();

describe('AiPaidStatusClassifier', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PARSING_ENABLED = 'true';
    process.env.AI_TIMEOUT_MS = '100';
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '100';
    process.env.AI_BASE_URL = 'http://localhost:11434';
    process.env.AI_MODEL = 'llama3.1';
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    process.env.AI_TIMEOUT_MS = undefined;
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = undefined;
    process.env.AI_PARSING_ENABLED = undefined;
    process.env.AI_BASE_URL = undefined;
    process.env.AI_MODEL = undefined;
  });

  it('extends BaseAiHelper', () => {
    const classifier = new AiPaidStatusClassifier('test-key');

    expect(classifier).toBeInstanceOf(BaseAiHelper);
  });

  it('falls back to heuristics when AI returns empty content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    } as Response);

    const classifier = new AiPaidStatusClassifier('test-key');
    const result = await classifier.classify([
      { id: '1', counterparty: 'Invoice pending', comment: 'awaiting payment' },
    ]);

    expect(result).toEqual([{ id: '1', paid: false }]);
  });
});
