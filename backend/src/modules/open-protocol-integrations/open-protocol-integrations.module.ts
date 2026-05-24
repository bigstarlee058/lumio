import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration, OpenProtocolSettings, Receipt, Statement } from '../../entities';
import { AuditModule } from '../audit/audit.module';
import { GmailModule } from '../gmail/gmail.module';
import { StatementsModule } from '../statements/statements.module';
import { OpenProtocolIntegrationsController } from './open-protocol-integrations.controller';
import { OpenProtocolIntegrationsService } from './open-protocol-integrations.service';
import { S3BackupListener } from './s3-backup.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, OpenProtocolSettings, Statement, Receipt]),
    AuditModule,
    StatementsModule,
    GmailModule,
  ],
  controllers: [OpenProtocolIntegrationsController],
  providers: [OpenProtocolIntegrationsService, S3BackupListener],
})
export class OpenProtocolIntegrationsModule {}
