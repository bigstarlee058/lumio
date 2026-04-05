import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { TelegramService, type TelegramUpdatePayload } from './telegram.service';

@Controller('telegram/webhook')
export class TelegramWebhookController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handleUpdate(@Body() update: TelegramUpdatePayload) {
    await this.telegramService.handleUpdate(update);
    return { ok: true };
  }
}
