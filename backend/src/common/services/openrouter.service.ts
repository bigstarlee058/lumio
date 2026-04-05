import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpenRouter } from '@openrouter/sdk';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenRouterChatApi = {
  completions: {
    create(input: { model: string; messages: OpenRouterMessage[] }): Promise<unknown>;
  };
};

@Injectable()
export class OpenRouterService {
  private readonly apiKey: string | null;
  private client: OpenRouter | null = null;
  private clientInit: Promise<OpenRouter> | null = null;
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') ?? null;

    if (!this.apiKey) {
      this.logger.warn('OPENROUTER_API_KEY is not defined. OpenRouter service will not function.');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: OpenRouterMessage[], model = 'openai/gpt-3.5-turbo') {
    const client = await this.getClient();

    try {
      const chatApi = client.chat as unknown as OpenRouterChatApi;
      const completion = await chatApi.completions.create({
        model,
        messages,
      });
      return completion;
    } catch (error) {
      this.logger.error('Failed to call OpenRouter API', error);
      throw error;
    }
  }

  private async getClient(): Promise<OpenRouter> {
    if (!this.apiKey) {
      throw new Error('OpenRouter client is not initialized (missing API key)');
    }

    if (this.client) {
      return this.client;
    }

    if (!this.clientInit) {
      this.clientInit = this.createClient();
    }

    try {
      this.client = await this.clientInit;
      return this.client;
    } catch (error) {
      this.clientInit = null;
      this.logger.error('Failed to initialize OpenRouter client', error);
      throw error;
    }
  }

  private async createClient(): Promise<OpenRouter> {
    const { OpenRouter } = await this.loadSdk();
    return new OpenRouter({
      apiKey: this.apiKey as string,
    });
  }

  private async loadSdk(): Promise<typeof import('@openrouter/sdk')> {
    // Use native dynamic import to load ESM from CommonJS output.
    const load = new Function('return import("@openrouter/sdk")');
    return load() as Promise<typeof import('@openrouter/sdk')>;
  }
}
