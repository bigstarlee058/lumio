import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenAiCompatibleChatResponse = {
  choices?: unknown[];
};

@Injectable()
export class OpenRouterService {
  private readonly apiKey: string | null = null;
  private readonly baseUrl: string | null = null;
  private readonly defaultModel: string | null = null;
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') ?? null;
    this.baseUrl = this.configService.get<string>('AI_BASE_URL')?.replace(/\/+$/, '') ?? null;
    this.defaultModel = this.configService.get<string>('AI_MODEL') ?? null;

    if (!this.baseUrl || !this.defaultModel) {
      this.logger.warn('AI_BASE_URL or AI_MODEL is not defined. AI chat service will not function.');
    }
  }

  isAvailable(): boolean {
    return !!this.baseUrl && !!this.defaultModel;
  }

  async chat(messages: OpenRouterMessage[], model = this.defaultModel) {
    if (!this.baseUrl || !model) {
      throw new Error('AI client is not initialized (missing AI_BASE_URL or AI_MODEL)');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI chat request failed with status ${response.status}`);
      }

      return (await response.json()) as OpenAiCompatibleChatResponse;
    } catch (error) {
      this.logger.error('Failed to call OpenAI-compatible AI API', error);
      throw error;
    }
  }
}
