import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TelegramWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const provided = request.headers['x-telegram-bot-api-secret-token'];

    if (!secret || provided !== secret) {
      throw new UnauthorizedException('Invalid Telegram webhook authentication');
    }

    return true;
  }
}
