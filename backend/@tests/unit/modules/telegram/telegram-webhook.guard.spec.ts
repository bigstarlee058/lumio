import { UnauthorizedException } from '@nestjs/common';
import { TelegramWebhookGuard } from '@/modules/telegram/telegram-webhook.guard';

describe('TelegramWebhookGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TELEGRAM_WEBHOOK_SECRET: 'expected-secret' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows requests with the configured Telegram secret token header', () => {
    const guard = new TelegramWebhookGuard();

    expect(
      guard.canActivate(
        createContext({ 'x-telegram-bot-api-secret-token': 'expected-secret' }),
      ),
    ).toBe(true);
  });

  it('rejects forged webhook requests without the Telegram secret token header', () => {
    const guard = new TelegramWebhookGuard();

    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });
});

function createContext(headers: Record<string, string>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as never;
}
