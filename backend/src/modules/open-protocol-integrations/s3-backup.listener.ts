import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { StatementUploadedEvent } from '../notifications/events/notification-events';
import { OpenProtocolIntegrationsService } from './open-protocol-integrations.service';

@Injectable()
export class S3BackupListener {
  private readonly logger = new Logger(S3BackupListener.name);

  constructor(private readonly service: OpenProtocolIntegrationsService) {}

  @OnEvent('statement.uploaded')
  async onStatementUploaded(event: StatementUploadedEvent): Promise<void> {
    try {
      await this.service.autoBackupStatementToS3(event.workspaceId, event.statementId);
    } catch (error) {
      this.logger.warn(
        `S3 auto-backup failed for statement ${event.statementId}: ${(error as Error).message}`,
      );
    }
  }
}
