import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { gmail } from '@googleapis/gmail';
import type { gmail_v1 } from '@googleapis/gmail';
import type { Repository } from 'typeorm';
import { resolveUploadsDir } from '../../../common/utils/uploads.util';
import { GmailSettings, Integration } from '../../../entities';
import { GmailOAuthService } from './gmail-oauth.service';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private static readonly MAX_SYNC_MESSAGES = 500;

  constructor(
    @InjectRepository(GmailSettings)
    private readonly gmailSettingsRepository: Repository<GmailSettings>,
    private readonly gmailOAuthService: GmailOAuthService,
  ) {}

  private getGmailClient(client: Awaited<ReturnType<GmailOAuthService['getGmailClient']>>['client']) {
    return gmail({ version: 'v1', auth: client });
  }

  async setupGmailEnvironment(integration: Integration, userId: string): Promise<void> {
    try {
      const { client } = await this.gmailOAuthService.getGmailClient(userId);
      const gmailClient = gmail({ version: 'v1', auth: client });

      // Get or create label
      const labelsResponse = await gmailClient.users.labels.list({ userId: 'me' });
      const existingLabel = labelsResponse.data.labels?.find(
        label => label.name === 'Lumio/Receipts',
      );

      let labelId: string;
      if (existingLabel?.id) {
        labelId = existingLabel.id;
      } else {
        const createLabelResponse = await gmailClient.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'Lumio/Receipts',
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show',
          },
        });
        const createdLabelId = createLabelResponse.data.id;
        if (!createdLabelId) {
          throw new BadRequestException('Failed to create Gmail label');
        }
        labelId = createdLabelId;
      }

      // Create Gmail filter
      const filterCriteria = {
        hasAttachment: true,
        from: '',
        subject: '',
      };

      const filterAction = {
        addLabelIds: [labelId],
      };

      try {
        await gmailClient.users.settings.filters.create({
          userId: 'me',
          requestBody: {
            criteria: filterCriteria,
            action: filterAction,
          },
        });
      } catch (error) {
        this.logger.warn('Failed to create Gmail filter, continuing...', error);
      }

      // Update settings
      const settings = await this.gmailSettingsRepository.findOne({
        where: { integrationId: integration.id },
      });

      if (settings) {
        settings.labelId = labelId;
        settings.labelName = 'Lumio/Receipts';
        await this.gmailSettingsRepository.save(settings);
      }

      this.logger.log(`Gmail environment setup complete for integration ${integration.id}`);
    } catch (error) {
      this.logger.error('Failed to setup Gmail environment', error);
      throw error;
    }
  }

  async listMessages(
    userId: string,
    query?: string,
    options?: {
      includeLabelFilter?: boolean;
      maxMessages?: number;
    },
  ): Promise<gmail_v1.Schema$Message[]> {
    const { client, integration } = await this.gmailOAuthService.getGmailClient(userId);
    const gmailClient = this.getGmailClient(client);

    const settings = await this.gmailSettingsRepository.findOne({
      where: { integrationId: integration.id },
    });

    const includeLabelFilter = options?.includeLabelFilter !== false;
    const maxMessages = Math.max(
      1,
      Math.min(
        options?.maxMessages ?? GmailService.MAX_SYNC_MESSAGES,
        GmailService.MAX_SYNC_MESSAGES,
      ),
    );

    let searchQuery = query || '';
    if (includeLabelFilter && settings?.labelId && !searchQuery.includes('label:')) {
      searchQuery = `label:${settings.labelId} ${searchQuery}`.trim();
    }

    const messages: gmail_v1.Schema$Message[] = [];
    let pageToken: string | undefined;

    while (messages.length < maxMessages) {
      const remaining = maxMessages - messages.length;
      const response = await gmailClient.users.messages.list({
        userId: 'me',
        q: searchQuery || undefined,
        maxResults: Math.min(100, remaining),
        pageToken,
      });

      const batch = response.data.messages || [];
      messages.push(...batch);

      pageToken = response.data.nextPageToken || undefined;
      if (!pageToken || batch.length === 0) {
        break;
      }
    }

    return messages;
  }

  async getMessage(userId: string, messageId: string): Promise<gmail_v1.Schema$Message> {
    const { client } = await this.gmailOAuthService.getGmailClient(userId);
    const gmailClient = this.getGmailClient(client);

    const response = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  async downloadAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
    filename: string,
  ): Promise<string> {
    const { client } = await this.gmailOAuthService.getGmailClient(userId);
    const gmailClient = gmail({ version: 'v1', auth: client });

    const response = await gmailClient.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    const data = response.data.data;
    if (!data) {
      throw new BadRequestException('No attachment data received');
    }

    // Decode base64url encoded data
    const buffer = Buffer.from(data, 'base64url');

    // Save to uploads directory
    const uploadsDir = resolveUploadsDir();
    const receiptsDir = path.join(uploadsDir, 'receipts');

    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(receiptsDir, `${timestamp}-${sanitizedFilename}`);

    fs.writeFileSync(filePath, buffer);

    return filePath;
  }

  async updateMessageLabels(
    userId: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[],
  ): Promise<void> {
    const { client } = await this.gmailOAuthService.getGmailClient(userId);
    const gmailClient = gmail({ version: 'v1', auth: client });

    await gmailClient.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });
  }
}
