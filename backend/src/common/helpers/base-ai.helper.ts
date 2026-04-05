import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { TimeoutError, retry, withTimeout } from '../utils/async.util';
import {
  isAiCircuitOpen,
  isAiEnabled,
  recordAiFailure,
  recordAiSuccess,
  withAiConcurrency,
} from '../../modules/parsing/helpers/ai-runtime.util';

type GenerateJsonOptions = {
  timeoutMs: number;
  timeoutMessage: string;
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

type AiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type AiTextPart = {
  text: string;
};

type AiContent = {
  role: 'user' | 'model';
  parts: Array<AiInlineDataPart | AiTextPart>;
};

export abstract class BaseAiHelper {
  protected geminiModel: GenerativeModel | null = null;

  constructor(apiKey: string | undefined = process.env.GEMINI_API_KEY) {
    if (apiKey && isAiEnabled()) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
    }
  }

  isAvailable(): boolean {
    return Boolean(this.geminiModel) && isAiEnabled() && !isAiCircuitOpen();
  }

  protected async generateJsonContent(
    contents: AiContent[],
    options: GenerateJsonOptions,
  ): Promise<string | null> {
    if (!this.geminiModel || !this.isAvailable()) {
      return null;
    }

    try {
      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents,
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            options.timeoutMs,
            options.timeoutMessage,
          ),
        {
          retries: options.retries,
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      const content = completion?.response?.text();
      if (!content) {
        recordAiFailure();
        return null;
      }

      recordAiSuccess();
      return content;
    } catch {
      recordAiFailure();
      return null;
    }
  }
}
