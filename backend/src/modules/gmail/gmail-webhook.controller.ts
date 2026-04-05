import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { GmailWebhookGuard } from './guards/gmail-webhook.guard';
import { GmailWebhookService } from './services/gmail-webhook.service';

interface GmailPubSubNotificationBody {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

@ApiTags('Gmail Webhook')
@Controller('webhook/gmail')
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);

  constructor(private readonly gmailWebhookService: GmailWebhookService) {}

  @Public()
  @Post('pubsub')
  @UseGuards(GmailWebhookGuard)
  @ApiOperation({ summary: 'Receive Gmail Pub/Sub notifications' })
  async handlePubSubNotification(@Body() body: GmailPubSubNotificationBody) {
    try {
      this.logger.log('Received Pub/Sub notification');

      await this.gmailWebhookService.handlePubSubNotification(body);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle Pub/Sub notification', error);
      // Return 200 to prevent Pub/Sub retries for invalid messages
      return { success: false, error: 'Internal error' };
    }
  }
}
