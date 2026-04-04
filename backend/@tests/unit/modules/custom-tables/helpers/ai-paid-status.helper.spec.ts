import { BaseAiHelper } from '@/common/helpers/base-ai.helper';
import { AiPaidStatusClassifier } from '@/modules/custom-tables/helpers/ai-paid-status.helper';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('AiPaidStatusClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PARSING_ENABLED = 'true';
    process.env.AI_TIMEOUT_MS = '100';
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '100';
  });

  afterAll(() => {
    process.env.AI_TIMEOUT_MS = undefined;
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = undefined;
    process.env.AI_PARSING_ENABLED = undefined;
  });

  it('extends BaseAiHelper', () => {
    const classifier = new AiPaidStatusClassifier('test-key');

    expect(classifier).toBeInstanceOf(BaseAiHelper);
  });

  it('falls back to heuristics when AI returns empty content', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '',
      },
    });

    const classifier = new AiPaidStatusClassifier('test-key');
    const result = await classifier.classify([
      { id: '1', counterparty: 'Invoice pending', comment: 'awaiting payment' },
    ]);

    expect(result).toEqual([{ id: '1', paid: false }]);
  });
});
