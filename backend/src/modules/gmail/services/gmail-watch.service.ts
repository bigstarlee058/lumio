import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import type { Repository } from 'typeorm';
import {
  GmailSettings,
  GmailWatchSubscription,
  Integration,
  ReceiptJobStatus,
  ReceiptProcessingJob,
  WatchSubscriptionStatus,
} from '../../../entities';
import { GmailOAuthService } from './gmail-oauth.service';

@Injectable()
export class GmailWatchService {
  private readonly logger = new Logger(GmailWatchService.name);

  constructor(
    @InjectRepository(GmailWatchSubscription)
    private readonly watchSubscriptionRepository: Repository<GmailWatchSubscription>,
    @InjectRepository(GmailSettings)
    private readonly gmailSettingsRepository: Repository<GmailSettings>,
    @InjectRepository(ReceiptProcessingJob)
    private readonly jobRepository: Repository<ReceiptProcessingJob>,
    private readonly gmailOAuthService: GmailOAuthService,
  ) {}

  private getTopicName(): string {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    const topicName = process.env.PUBSUB_TOPIC_NAME || 'gmail-watch-notifications';
    return `projects/${projectId}/topics/${topicName}`;
  }

  async setupWatch(integration: Integration, userId: string): Promise<GmailWatchSubscription> {
    try {
      const { client } = await this.gmailOAuthService.getGmailClient(userId);
      const gmail = google.gmail({ version: 'v1', auth: client });

      // Get user's email address
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress || null;

      // Get label ID from settings
      const settings = await this.gmailSettingsRepository.findOne({
        where: { integrationId: integration.id },
      });

      const topicName = this.getTopicName();

      // Set up watch request
      const watchRequest: gmail_v1.Params$Resource$Users$Watch = {
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: settings?.labelId ? [settings.labelId] : ['INBOX'],
        },
      };

      const response = await gmail.users.watch(watchRequest);

      const expiration = new Date(Number(response.data.expiration));
      const historyId = response.data.historyId || null;

      // Create or update watch subscription
      const existing = await this.watchSubscriptionRepository.findOne({
        where: { integrationId: integration.id },
      });

      const subscription =
        existing ||
        this.watchSubscriptionRepository.create({
          integrationId: integration.id,
        });

      subscription.topicName = topicName;
      subscription.subscriptionName = `gmail-watch-${integration.id}`;
      subscription.expiration = expiration;
      subscription.historyId = historyId;
      subscription.emailAddress = emailAddress;
      subscription.status = WatchSubscriptionStatus.ACTIVE;

      await this.watchSubscriptionRepository.save(subscription);

      // Update Gmail settings
      if (settings) {
        settings.watchEnabled = true;
        settings.watchExpiration = expiration;
        settings.historyId = historyId;
        await this.gmailSettingsRepository.save(settings);
      }

      this.logger.log(
        `Gmail watch setup complete for integration ${integration.id}, expires at ${expiration}`,
      );

      return subscription;
    } catch (error) {
      this.logger.error('Failed to setup Gmail watch', error);
      throw error;
    }
  }

  async renewWatch(integration: Integration, userId: string): Promise<GmailWatchSubscription> {
    this.logger.log(`Renewing Gmail watch for integration ${integration.id}`);
    return this.setupWatch(integration, userId);
  }

  async stopWatch(integration: Integration, userId: string): Promise<void> {
    try {
      const { client } = await this.gmailOAuthService.getGmailClient(userId);
      const gmail = google.gmail({ version: 'v1', auth: client });

      await gmail.users.stop({ userId: 'me' });

      // Update subscription status
      await this.watchSubscriptionRepository.update(
        { integrationId: integration.id },
        { status: WatchSubscriptionStatus.EXPIRED },
      );

      // Update settings
      await this.gmailSettingsRepository.update(
        { integrationId: integration.id },
        { watchEnabled: false, watchExpiration: null },
      );

      this.logger.log(`Gmail watch stopped for integration ${integration.id}`);
    } catch (error) {
      this.logger.error('Failed to stop Gmail watch', error);
      throw error;
    }
  }

  async processHistoryUpdate(
    integration: Integration,
    newHistoryId: string,
    userId: string,
  ): Promise<void> {
    try {
      const settings = await this.gmailSettingsRepository.findOne({
        where: { integrationId: integration.id },
      });

      if (!settings?.historyId) {
        this.logger.warn('No history ID found, skipping history processing');
        return;
      }

      const { client } = await this.gmailOAuthService.getGmailClient(userId);
      const gmail = google.gmail({ version: 'v1', auth: client });

      // Fetch history since last historyId
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: settings.historyId,
        historyTypes: ['messageAdded', 'labelAdded'],
      });

      const history = response.data.history || [];

      // Process new messages with the receipt label
      for (const record of history) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            const message = added.message;
            const labelIds = message?.labelIds || [];
            const messageId = message?.id;

            // Check if message has our receipt label
            if (settings.labelId && messageId && labelIds.includes(settings.labelId)) {
              // Create processing job
              await this.jobRepository.save(
                this.jobRepository.create({
                  userId,
                  status: ReceiptJobStatus.PENDING,
                  payload: {
                    integrationId: integration.id,
                    gmailMessageId: messageId,
                    historyId: newHistoryId,
                  },
                }),
              );

              this.logger.log(`Queued receipt processing for message ${messageId}`);
            }
          }
        }
      }

      // Update history ID
      settings.historyId = newHistoryId;
      settings.lastSyncAt = new Date();
      await this.gmailSettingsRepository.save(settings);
    } catch (error) {
      this.logger.error('Failed to process history update', error);
    }
  }
}
