import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../../entities/audit-event.entity';
import { Category } from '../../entities/category.entity';
import { CustomTableColumn } from '../../entities/custom-table-column.entity';
import { CustomTable } from '../../entities/custom-table.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Workspace } from '../../entities/workspace.entity';
import { AuditController } from './audit.controller';
import { AuditDescriptionService } from './description/audit-description.service';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { RollbackService } from './rollback/rollback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEvent,
      User,
      Workspace,
      Transaction,
      Statement,
      Category,
      CustomTableRow,
      CustomTable,
      CustomTableColumn,
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditDescriptionService, RollbackService, AuditInterceptor],
  exports: [AuditService],
})
export class AuditModule {}
