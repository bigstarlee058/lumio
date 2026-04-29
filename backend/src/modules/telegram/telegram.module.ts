import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramReport } from '../../entities/telegram-report.entity';
import { User } from '../../entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { ReportsModule } from '../reports/reports.module';
import { StatementsModule } from '../statements/statements.module';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramController } from './telegram.controller';
import { TelegramScheduler } from './telegram.scheduler';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramReport, User]),
    ApplicationSettingsModule,
    ReportsModule,
    StatementsModule,
    AuditModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [TelegramService, TelegramScheduler],
  exports: [TelegramService],
})
export class TelegramModule {}
