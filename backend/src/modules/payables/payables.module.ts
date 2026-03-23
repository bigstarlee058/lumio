import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payable } from '../../entities/payable.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayablesController } from './payables.controller';
import { PayablesExportService } from './payables-export.service';
import { PayablesScheduler } from './payables.scheduler';
import { PayablesService } from './payables.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payable, Transaction, Statement]), AuditModule, NotificationsModule],
  controllers: [PayablesController],
  providers: [PayablesService, PayablesExportService, PayablesScheduler],
  exports: [PayablesService],
})
export class PayablesModule {}
