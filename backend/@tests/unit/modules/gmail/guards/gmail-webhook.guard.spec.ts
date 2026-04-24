import { GmailWebhookGuard } from '@/modules/gmail/guards/gmail-webhook.guard';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

describe('GmailWebhookGuard', () => {
  let guard: GmailWebhookGuard;
  const ORIGINAL_ENV = process.env;

  function makeContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    guard = new GmailWebhookGuard();
    // Reset env to a clean copy for each test
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('when PUBSUB_WEBHOOK_TOKEN is configured', () => {
    beforeEach(() => {
      process.env.PUBSUB_WEBHOOK_TOKEN = 'secret-token-123';
    });

    it('allows request with valid Bearer token', () => {
      const context = makeContext({ authorization: 'Bearer secret-token-123' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws UnauthorizedException for invalid token', () => {
      const context = makeContext({ authorization: 'Bearer wrong-token' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Authorization header is missing', () => {
      const context = makeContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook authentication');
    });

    it('throws UnauthorizedException when Authorization header is not Bearer scheme', () => {
      const context = makeContext({ authorization: 'Basic secret-token-123' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for empty Bearer token', () => {
      const context = makeContext({ authorization: 'Bearer ' });

      // Empty string after 'Bearer ' does not match the expected token
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('is case-sensitive: rejects token with wrong casing', () => {
      const context = makeContext({ authorization: 'Bearer SECRET-TOKEN-123' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when PUBSUB_WEBHOOK_TOKEN is NOT configured (dev mode bypass)', () => {
    beforeEach(() => {
      delete process.env.PUBSUB_WEBHOOK_TOKEN;
    });

    it('allows request even with valid Bearer token when env not set', () => {
      const context = makeContext({ authorization: 'Bearer any-token' });

      // ⚠️ Security: dev bypass — allows all requests when token not configured
      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws UnauthorizedException when Authorization header is completely missing', () => {
      const context = makeContext({});

      // Guard checks for Bearer header BEFORE checking if token is configured
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when PUBSUB_WEBHOOK_TOKEN is empty string', () => {
    beforeEach(() => {
      process.env.PUBSUB_WEBHOOK_TOKEN = '';
    });

    it('applies dev bypass (empty string is falsy)', () => {
      const context = makeContext({ authorization: 'Bearer any-token' });

      // Empty string token is treated as "not configured"
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
