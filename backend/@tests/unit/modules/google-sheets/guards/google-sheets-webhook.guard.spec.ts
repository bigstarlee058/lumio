import { GoogleSheetsWebhookGuard } from '@/modules/google-sheets/guards/google-sheets-webhook.guard';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('GoogleSheetsWebhookGuard', () => {
  let guard: GoogleSheetsWebhookGuard;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  function makeContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
    guard = new GoogleSheetsWebhookGuard(mockConfigService as unknown as ConfigService);
  });

  describe('when SHEETS_WEBHOOK_TOKEN is configured', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sheets-secret-token');
    });

    it('allows request with valid x-webhook-token header', () => {
      const context = makeContext({ 'x-webhook-token': 'sheets-secret-token' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows request with valid x-webhook-secret header as fallback', () => {
      const context = makeContext({ 'x-webhook-secret': 'sheets-secret-token' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('prefers x-webhook-token over x-webhook-secret when both present', () => {
      const context = makeContext({
        'x-webhook-token': 'sheets-secret-token',
        'x-webhook-secret': 'wrong-secret',
      });

      // x-webhook-token is checked first via ||, so valid token passes
      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws UnauthorizedException for wrong x-webhook-token', () => {
      const context = makeContext({ 'x-webhook-token': 'wrong-token' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook token');
    });

    it('throws UnauthorizedException when no token header is present', () => {
      const context = makeContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook token');
    });

    it('throws UnauthorizedException for empty token value', () => {
      const context = makeContext({ 'x-webhook-token': '' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('is case-sensitive: rejects token with different casing', () => {
      const context = makeContext({ 'x-webhook-token': 'SHEETS-SECRET-TOKEN' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('retrieves token from ConfigService with SHEETS_WEBHOOK_TOKEN key', () => {
      const context = makeContext({ 'x-webhook-token': 'sheets-secret-token' });

      guard.canActivate(context);

      expect(mockConfigService.get).toHaveBeenCalledWith('SHEETS_WEBHOOK_TOKEN');
    });
  });

  describe('when SHEETS_WEBHOOK_TOKEN is NOT configured', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
    });

    it('throws UnauthorizedException regardless of provided token', () => {
      const context = makeContext({ 'x-webhook-token': 'any-token' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Sheets webhook token is not configured',
      );
    });

    it('throws UnauthorizedException with no token header', () => {
      const context = makeContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Sheets webhook token is not configured',
      );
    });

    it('throws UnauthorizedException when token is null', () => {
      mockConfigService.get.mockReturnValue(null);
      const context = makeContext({ 'x-webhook-token': 'any-token' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
