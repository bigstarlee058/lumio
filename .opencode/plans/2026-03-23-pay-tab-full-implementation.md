# Pay Tab — Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Pay tab from a stub (reusing StatementsListView) into a fully functional Accounts Payable workspace with its own backend CRUD API, dedicated frontend UI, notifications, and export.

**Architecture:** Create a new `payables` NestJS module following the `branches` module pattern (controller + service + DTOs), using the existing `Payable` entity and migrations. Replace the frontend stub at `/statements/pay/` with a dedicated payables view backed by API calls. Add a cron job for overdue detection and notification triggers. Implement Excel/CSV export using the existing `xlsx` library.

**Tech Stack:** NestJS (TypeORM, class-validator, @nestjs/schedule), Next.js 14 (React, Tailwind, react-hot-toast, DrawerShell), xlsx library for export.

---

## What Already Exists

- `Payable` entity with enums (`PayableStatus`, `PayableSource`) — `backend/src/entities/payable.entity.ts`
- DB migrations: `1763100000000-AddPayables.ts`, `1763200000000-AddPayableToAuditEntityTypeEnum.ts`
- Permissions: `PAYABLE_VIEW`, `PAYABLE_CREATE`, `PAYABLE_EDIT`, `PAYABLE_DELETE` — `backend/src/common/enums/permissions.enum.ts:32-36`
- Notification types: `PAYABLE_DUE_SOON`, `PAYABLE_OVERDUE`, `PAYABLE_MARKED_PAID` — `backend/src/entities/notification.entity.ts:27-29`
- `EntityType.PAYABLE` in audit enum — `backend/src/entities/audit-event.entity.ts:23`
- Dashboard queries `payableRepo` for `totalPayable` and `totalOverdue` — `backend/src/modules/dashboard/dashboard.service.ts`
- Frontend route `/statements/pay/page.tsx` (13-line stub reusing `StatementsListView`)
- Side panel shows Pay item with localStorage-based badge count

---

## Phase 1 — Backend: Payables Module (CRUD + Filters)

### Task 1: Create Payables DTOs

**Files:**
- Create: `backend/src/modules/payables/dto/create-payable.dto.ts`
- Create: `backend/src/modules/payables/dto/update-payable.dto.ts`
- Create: `backend/src/modules/payables/dto/filter-payables.dto.ts`

**Step 1: Write create-payable.dto.ts**

```typescript
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString, MaxLength, Min } from 'class-validator';
import { PayableSource } from '../../../entities/payable.entity';

export class CreatePayableDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  vendor: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PayableSource)
  source?: PayableSource;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsString()
  statementId?: string;

  @IsOptional()
  @IsString()
  linkedTransactionId?: string;
}
```

**Step 2: Write update-payable.dto.ts**

```typescript
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, MaxLength, Min } from 'class-validator';
import { PayableStatus, PayableSource } from '../../../entities/payable.entity';

export class UpdatePayableDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsEnum(PayableSource)
  source?: PayableSource;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsString()
  linkedTransactionId?: string | null;
}
```

**Step 3: Write filter-payables.dto.ts**

```typescript
import { IsOptional, IsEnum, IsString, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PayableStatus, PayableSource } from '../../../entities/payable.entity';

export class FilterPayablesDto {
  @IsOptional()
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsEnum(PayableSource)
  source?: PayableSource;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sortOrder?: 'asc' | 'desc';
}
```

**Step 4: Commit**

```bash
git add backend/src/modules/payables/dto/
git commit -m "feat(payables): add create, update, and filter DTOs"
```

---

### Task 2: Create Payables Service

**Files:**
- Create: `backend/src/modules/payables/payables.service.ts`
- Reference: `backend/src/modules/branches/branches.service.ts` (pattern)
- Reference: `backend/src/entities/payable.entity.ts`

**Step 1: Write payables.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Payable, PayableStatus } from '../../entities/payable.entity';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { FilterPayablesDto } from './dto/filter-payables.dto';

@Injectable()
export class PayablesService {
  constructor(
    @InjectRepository(Payable)
    private readonly payableRepo: Repository<Payable>,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreatePayableDto): Promise<Payable> {
    const payable = this.payableRepo.create({
      workspaceId,
      createdById: userId,
      vendor: dto.vendor,
      amount: dto.amount,
      currency: dto.currency ?? 'KZT',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      source: dto.source,
      isRecurring: dto.isRecurring ?? false,
      comment: dto.comment ?? null,
      statementId: dto.statementId ?? null,
      linkedTransactionId: dto.linkedTransactionId ?? null,
    });
    return this.payableRepo.save(payable);
  }

  async findAll(
    workspaceId: string,
    filters: FilterPayablesDto,
  ): Promise<{ data: Payable[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const sortBy = filters.sortBy ?? 'createdAt';
    const sortOrder = (filters.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.payableRepo
      .createQueryBuilder('p')
      .where('p.workspaceId = :workspaceId', { workspaceId });

    this.applyFilters(qb, filters);

    qb.orderBy(`p.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(workspaceId: string, id: string): Promise<Payable> {
    const payable = await this.payableRepo.findOne({
      where: { id, workspaceId },
    });
    if (!payable) {
      throw new NotFoundException(`Payable ${id} not found`);
    }
    return payable;
  }

  async update(workspaceId: string, id: string, dto: UpdatePayableDto): Promise<Payable> {
    const payable = await this.findOne(workspaceId, id);
    Object.assign(payable, dto);

    // Auto-close when linked to a transaction
    if (dto.linkedTransactionId && payable.status !== PayableStatus.PAID) {
      payable.status = PayableStatus.PAID;
    }

    return this.payableRepo.save(payable);
  }

  async markAsPaid(workspaceId: string, id: string, linkedTransactionId?: string): Promise<Payable> {
    const payable = await this.findOne(workspaceId, id);
    payable.status = PayableStatus.PAID;
    if (linkedTransactionId) {
      payable.linkedTransactionId = linkedTransactionId;
    }
    return this.payableRepo.save(payable);
  }

  async archive(workspaceId: string, id: string): Promise<Payable> {
    const payable = await this.findOne(workspaceId, id);
    payable.status = PayableStatus.ARCHIVED;
    return this.payableRepo.save(payable);
  }

  async remove(workspaceId: string, id: string): Promise<{ message: string }> {
    const payable = await this.findOne(workspaceId, id);
    await this.payableRepo.softRemove(payable);
    return { message: 'Payable deleted successfully' };
  }

  async getSummary(workspaceId: string): Promise<{
    toPay: number;
    overdue: number;
    dueThisWeek: number;
    paidThisMonth: number;
    toPayCount: number;
    overdueCount: number;
  }> {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const qb = this.payableRepo
      .createQueryBuilder('p')
      .select([
        `COALESCE(SUM(CASE WHEN p.status IN ('to_pay', 'scheduled') THEN p.amount ELSE 0 END), 0) AS "toPay"`,
        `COALESCE(SUM(CASE WHEN p.status = 'overdue' THEN p.amount ELSE 0 END), 0) AS "overdue"`,
        `COALESCE(SUM(CASE WHEN p.status IN ('to_pay', 'scheduled') AND p.due_date BETWEEN :now AND :weekFromNow THEN p.amount ELSE 0 END), 0) AS "dueThisWeek"`,
        `COALESCE(SUM(CASE WHEN p.status = 'paid' AND p.updated_at >= :monthStart THEN p.amount ELSE 0 END), 0) AS "paidThisMonth"`,
        `COUNT(CASE WHEN p.status IN ('to_pay', 'scheduled') THEN 1 END) AS "toPayCount"`,
        `COUNT(CASE WHEN p.status = 'overdue' THEN 1 END) AS "overdueCount"`,
      ])
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .setParameter('now', now)
      .setParameter('weekFromNow', weekFromNow)
      .setParameter('monthStart', monthStart);

    const result = await qb.getRawOne();

    return {
      toPay: parseFloat(result?.toPay ?? '0'),
      overdue: parseFloat(result?.overdue ?? '0'),
      dueThisWeek: parseFloat(result?.dueThisWeek ?? '0'),
      paidThisMonth: parseFloat(result?.paidThisMonth ?? '0'),
      toPayCount: parseInt(result?.toPayCount ?? '0', 10),
      overdueCount: parseInt(result?.overdueCount ?? '0', 10),
    };
  }

  async getExportData(workspaceId: string, filters: FilterPayablesDto): Promise<Payable[]> {
    const qb = this.payableRepo
      .createQueryBuilder('p')
      .where('p.workspaceId = :workspaceId', { workspaceId });
    this.applyFilters(qb, filters);
    qb.orderBy('p.dueDate', 'ASC');
    return qb.getMany();
  }

  /**
   * Called by cron — flips to_pay/scheduled -> overdue when dueDate has passed.
   * Returns the number of records updated.
   */
  async markOverduePayables(): Promise<number> {
    const result = await this.payableRepo
      .createQueryBuilder()
      .update(Payable)
      .set({ status: PayableStatus.OVERDUE })
      .where('status IN (:...activeStatuses)', {
        activeStatuses: [PayableStatus.TO_PAY, PayableStatus.SCHEDULED],
      })
      .andWhere('due_date < CURRENT_DATE')
      .andWhere('due_date IS NOT NULL')
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Returns payables whose dueDate is tomorrow (for "due soon" notifications).
   */
  async findDueSoon(daysAhead: number = 1): Promise<Payable[]> {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const dateStr = target.toISOString().split('T')[0];

    return this.payableRepo
      .createQueryBuilder('p')
      .where('p.status IN (:...activeStatuses)', {
        activeStatuses: [PayableStatus.TO_PAY, PayableStatus.SCHEDULED],
      })
      .andWhere('p.dueDate = :dateStr', { dateStr })
      .getMany();
  }

  private applyFilters(qb: SelectQueryBuilder<Payable>, filters: FilterPayablesDto): void {
    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters.source) {
      qb.andWhere('p.source = :source', { source: filters.source });
    }
    if (filters.vendor) {
      qb.andWhere('p.vendor ILIKE :vendor', { vendor: `%${filters.vendor}%` });
    }
    if (filters.dueDateFrom) {
      qb.andWhere('p.dueDate >= :dueDateFrom', { dueDateFrom: filters.dueDateFrom });
    }
    if (filters.dueDateTo) {
      qb.andWhere('p.dueDate <= :dueDateTo', { dueDateTo: filters.dueDateTo });
    }
    if (filters.search) {
      qb.andWhere('(p.vendor ILIKE :search OR p.comment ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/payables/payables.service.ts
git commit -m "feat(payables): add payables service with CRUD, summary, and overdue logic"
```

---

### Task 3: Create Payables Controller

**Files:**
- Create: `backend/src/modules/payables/payables.controller.ts`
- Reference: `backend/src/modules/branches/branches.controller.ts` (pattern)
- Reference: `backend/src/modules/reports/reports.controller.ts:104-148` (export pattern)

**Step 1: Write payables.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'node:fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Audit } from '../audit/decorators/audit.decorator';
import { EntityType } from '../../entities/audit-event.entity';
import { User } from '../../entities';
import { PayablesService } from './payables.service';
import { PayablesExportService } from './payables-export.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { FilterPayablesDto } from './dto/filter-payables.dto';

@Controller('payables')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
export class PayablesController {
  constructor(
    private readonly payablesService: PayablesService,
    private readonly payablesExportService: PayablesExportService,
  ) {}

  @Post()
  @RequirePermission(Permission.PAYABLE_CREATE)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePayableDto,
  ) {
    return this.payablesService.create(workspaceId, user.id, dto);
  }

  @Get()
  @RequirePermission(Permission.PAYABLE_VIEW)
  findAll(@WorkspaceId() workspaceId: string, @Query() filters: FilterPayablesDto) {
    return this.payablesService.findAll(workspaceId, filters);
  }

  @Get('summary')
  @RequirePermission(Permission.PAYABLE_VIEW)
  getSummary(@WorkspaceId() workspaceId: string) {
    return this.payablesService.getSummary(workspaceId);
  }

  @Get(':id')
  @RequirePermission(Permission.PAYABLE_VIEW)
  findOne(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payablesService.findOne(workspaceId, id);
  }

  @Put(':id')
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayableDto,
  ) {
    return this.payablesService.update(workspaceId, id, dto);
  }

  @Put(':id/mark-paid')
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  markAsPaid(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { linkedTransactionId?: string },
  ) {
    return this.payablesService.markAsPaid(workspaceId, id, body.linkedTransactionId);
  }

  @Put(':id/archive')
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  archive(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payablesService.archive(workspaceId, id);
  }

  @Delete(':id')
  @RequirePermission(Permission.PAYABLE_DELETE)
  @Audit({ entityType: EntityType.PAYABLE })
  remove(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payablesService.remove(workspaceId, id);
  }

  @Post('export')
  @RequirePermission(Permission.PAYABLE_VIEW)
  async exportPayables(
    @WorkspaceId() workspaceId: string,
    @Query() filters: FilterPayablesDto,
    @Query('format') format: 'excel' | 'csv' = 'excel',
    @Res() res: Response,
  ) {
    const data = await this.payablesService.getExportData(workspaceId, filters);
    const { filePath, fileName } = await this.payablesExportService.export(data, format);

    const contentType =
      format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('end', () => fs.unlinkSync(filePath));
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/payables/payables.controller.ts
git commit -m "feat(payables): add payables controller with CRUD, mark-paid, archive, export endpoints"
```

---

### Task 4: Create Payables Export Service

**Files:**
- Create: `backend/src/modules/payables/payables-export.service.ts`
- Reference: `backend/src/modules/reports/reports.service.ts:962-1045` (export pattern)

**Step 1: Write payables-export.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Payable } from '../../entities/payable.entity';

@Injectable()
export class PayablesExportService {
  async export(
    payables: Payable[],
    format: 'excel' | 'csv',
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const fileName = `payables-${timestamp}.${ext}`;
    const dir = path.join(process.cwd(), 'uploads', 'exports');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);
    const rows = payables.map((p) => ({
      Vendor: p.vendor,
      Amount: Number(p.amount),
      Currency: p.currency,
      'Due Date': p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '',
      Status: p.status,
      Source: p.source,
      Recurring: p.isRecurring ? 'Yes' : 'No',
      Comment: p.comment ?? '',
      'Created At': p.createdAt.toISOString().split('T')[0],
    }));

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Payables');
      XLSX.writeFile(wb, filePath);
    } else {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.join(','),
        ...rows.map((r) =>
          headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(','),
        ),
      ];
      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
    }

    return { filePath, fileName };
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/payables/payables-export.service.ts
git commit -m "feat(payables): add export service for Excel and CSV"
```

---

### Task 5: Create Payables Scheduler (Overdue Detection + Notifications)

**Files:**
- Create: `backend/src/modules/payables/payables.scheduler.ts`
- Reference: `backend/src/modules/telegram/telegram.scheduler.ts` (cron pattern)
- Reference: `backend/src/modules/notifications/notifications.service.ts:115-149` (notification creation)

**Step 1: Write payables.scheduler.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayablesService } from './payables.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory } from '../../entities/notification.entity';

@Injectable()
export class PayablesScheduler {
  private readonly logger = new Logger(PayablesScheduler.name);

  constructor(
    private readonly payablesService: PayablesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs daily at 6 AM:
   * 1. Flip to_pay/scheduled -> overdue for past-due items
   * 2. Send "due soon" notifications for items due tomorrow
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyPayableCheck(): Promise<void> {
    this.logger.log('Running daily payable overdue check...');

    // 1. Mark overdue
    const overdueCount = await this.payablesService.markOverduePayables();
    if (overdueCount > 0) {
      this.logger.log(`Marked ${overdueCount} payables as overdue`);
    }

    // 2. Send "due soon" notifications for items due tomorrow
    try {
      const dueSoon = await this.payablesService.findDueSoon(1);
      for (const payable of dueSoon) {
        await this.notificationsService.createForWorkspaceMembers({
          workspaceId: payable.workspaceId,
          type: NotificationType.PAYABLE_DUE_SOON,
          category: NotificationCategory.WORKSPACE_UPDATED,
          title: 'Платёж скоро к оплате',
          message: `«${payable.vendor}» — ${payable.amount} ${payable.currency} — срок оплаты завтра`,
          entityType: 'payable',
          entityId: payable.id,
        });
      }
      if (dueSoon.length > 0) {
        this.logger.log(`Sent ${dueSoon.length} due-soon notifications`);
      }
    } catch (err) {
      this.logger.error('Failed to send due-soon notifications', err);
    }

    this.logger.log('Daily payable check complete');
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/payables/payables.scheduler.ts
git commit -m "feat(payables): add daily scheduler for overdue detection and due-soon notifications"
```

---

### Task 6: Create Payables Module and Register in App

**Files:**
- Create: `backend/src/modules/payables/payables.module.ts`
- Modify: `backend/src/app.module.ts` — add `PayablesModule` to imports

**Step 1: Write payables.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payable } from '../../entities/payable.entity';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { PayablesExportService } from './payables-export.service';
import { PayablesScheduler } from './payables.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payable]), NotificationsModule],
  controllers: [PayablesController],
  providers: [PayablesService, PayablesExportService, PayablesScheduler],
  exports: [PayablesService],
})
export class PayablesModule {}
```

**Step 2: Add PayablesModule to app.module.ts imports**

Find the imports array in `backend/src/app.module.ts` and add `PayablesModule` alongside other feature modules. Import it at the top of the file.

**Step 3: Verify the backend compiles**

Run: `cd backend && npm run build`
Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add backend/src/modules/payables/payables.module.ts backend/src/app.module.ts
git commit -m "feat(payables): register payables module in app"
```

---

### Task 7: Write Backend Unit Tests

**Files:**
- Create: `backend/@tests/unit/modules/payables/payables.service.spec.ts`
- Create: `backend/@tests/unit/modules/payables/payables.controller.spec.ts`

**Step 1: Write payables.service.spec.ts**

Test cases to cover:
- `create()` — creates a payable with correct fields, defaults currency to KZT
- `findAll()` — returns paginated results, applies status filter, applies vendor search
- `findOne()` — returns payable, throws NotFoundException for missing ID
- `update()` — updates fields, auto-closes when linking transaction
- `markAsPaid()` — sets status to PAID, optionally links transaction
- `archive()` — sets status to ARCHIVED
- `remove()` — calls softRemove
- `getSummary()` — returns aggregated amounts
- `markOverduePayables()` — flips active items past due date to overdue

Use the mock pattern from `backend/@tests/unit/modules/dashboard/dashboard.service.spec.ts` — create a mock repository with `createQueryBuilder` mock.

**Step 2: Write payables.controller.spec.ts**

Test that each endpoint calls the correct service method with correct arguments. Use `Test.createTestingModule` from `@nestjs/testing`.

**Step 3: Run tests**

Run: `cd backend && npx jest --testPathPattern=payables --verbose`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add backend/@tests/unit/modules/payables/
git commit -m "test(payables): add unit tests for payables service and controller"
```

---

## Phase 2 — Frontend: Dedicated Pay UI

### Task 8: Create Payables API Client Helpers

**Files:**
- Create: `frontend/app/lib/payables-api.ts`
- Reference: `frontend/app/lib/api.ts` (apiClient pattern)

**Step 1: Write payables-api.ts**

```typescript
import apiClient from './api';

export interface PayableItem {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  status: 'to_pay' | 'scheduled' | 'paid' | 'overdue' | 'archived';
  source: 'statement' | 'invoice' | 'manual';
  isRecurring: boolean;
  comment: string | null;
  linkedTransactionId: string | null;
  statementId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayableSummary {
  toPay: number;
  overdue: number;
  dueThisWeek: number;
  paidThisMonth: number;
  toPayCount: number;
  overdueCount: number;
}

export interface PayableFilters {
  status?: string;
  source?: string;
  vendor?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PayableListResponse {
  data: PayableItem[];
  total: number;
  page: number;
  limit: number;
}

export const payablesApi = {
  list: (filters: PayableFilters = {}) =>
    apiClient.get<PayableListResponse>('/payables', { params: filters }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<PayableItem>(`/payables/${id}`).then((r) => r.data),

  getSummary: () =>
    apiClient.get<PayableSummary>('/payables/summary').then((r) => r.data),

  create: (data: Omit<PayableItem, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'status'>) =>
    apiClient.post<PayableItem>('/payables', data).then((r) => r.data),

  update: (id: string, data: Partial<PayableItem>) =>
    apiClient.put<PayableItem>(`/payables/${id}`, data).then((r) => r.data),

  markAsPaid: (id: string, linkedTransactionId?: string) =>
    apiClient.put<PayableItem>(`/payables/${id}/mark-paid`, { linkedTransactionId }).then((r) => r.data),

  archive: (id: string) =>
    apiClient.put<PayableItem>(`/payables/${id}/archive`).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/payables/${id}`).then((r) => r.data),

  exportList: (filters: PayableFilters, format: 'excel' | 'csv' = 'excel') =>
    apiClient
      .post('/payables/export', null, {
        params: { ...filters, format },
        responseType: 'blob',
      })
      .then((r) => r.data),
};
```

**Step 2: Commit**

```bash
git add frontend/app/lib/payables-api.ts
git commit -m "feat(payables): add frontend API client helpers"
```

---

### Task 9: Create PayableSummaryCards Component

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/PayableSummaryCards.tsx`

**Step 1: Write PayableSummaryCards.tsx**

A row of 4 summary cards showing: To Pay, Overdue, Due This Week, Paid This Month. Cards are clickable to pre-filter the list below.

```
// Summary cards component
// Props: summary: PayableSummary, currency: string, onFilterByStatus: (status: string | null) => void
// Cards:
//   1. "To Pay" — summary.toPay amount, summary.toPayCount items, blue accent
//   2. "Overdue" — summary.overdue amount, summary.overdueCount items, red accent
//   3. "Due This Week" — summary.dueThisWeek amount, amber accent
//   4. "Paid This Month" — summary.paidThisMonth amount, green accent
// Each card: rounded-xl border, icon at top, amount in large text, count in muted text
// onClick sets a status filter to pre-filter the payables list
```

Use Tailwind classes consistent with the app's design. Reference `frontend/app/components/dashboard/FinancialSnapshot.tsx` for the card style pattern (rounded border cards with icon + amount + label).

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/PayableSummaryCards.tsx
git commit -m "feat(payables): add summary cards component (To Pay, Overdue, Due This Week, Paid This Month)"
```

---

### Task 10: Create PayablesList Component

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/PayablesList.tsx`

**Step 1: Write PayablesList.tsx**

A table/list view for payable items with columns: Vendor, Amount, Due Date, Status, Source, Actions.

Key features:
- Status badge with color coding: `to_pay` (blue), `scheduled` (amber), `overdue` (red), `paid` (green), `archived` (gray)
- Due date display with relative indicator ("Tomorrow", "Today", "3 days overdue")
- Inline actions: "Mark as paid" button, "Edit" button, "Archive" button
- Responsive: table on desktop, card list on mobile (use `useIsMobile()` hook)
- Empty state when no payables exist
- Pagination using `AppPagination` from `frontend/app/components/ui/pagination.tsx`

Reference `frontend/app/(main)/statements/components/StatementsListView.tsx` for the general list layout pattern (search bar, filter dropdowns, list items, pagination, empty state).

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/PayablesList.tsx
git commit -m "feat(payables): add payables list component with status badges and inline actions"
```

---

### Task 11: Create PayableFiltersBar Component

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/PayableFiltersBar.tsx`

**Step 1: Write PayableFiltersBar.tsx**

Filter bar above the payables list with:
- Search input (search by vendor/comment)
- Status dropdown: All, To Pay, Scheduled, Overdue, Paid, Archived
- Source dropdown: All, Statement, Invoice, Manual
- Due Date range picker (From/To)
- Sort by dropdown: Due Date, Amount, Created Date
- Reset filters button

Follow the filter dropdown pattern from `frontend/app/(main)/statements/components/StatementsListView.tsx:320-340` — small dropdown buttons with chevron icons.

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/PayableFiltersBar.tsx
git commit -m "feat(payables): add filter bar with status, source, date range, and search"
```

---

### Task 12: Create CreatePayableDrawer Component

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/CreatePayableDrawer.tsx`
- Reference: `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx` (drawer pattern)
- Reference: `frontend/app/components/ui/drawer-shell.tsx` (DrawerShell component)

**Step 1: Write CreatePayableDrawer.tsx**

A right-side sliding drawer for creating/editing payable items.

Fields:
- Vendor (text input, required)
- Amount (number input, required)
- Currency (select: KZT, USD, EUR, RUB — default KZT)
- Due Date (date picker, optional)
- Source (radio: Manual, Invoice, Statement — default Manual)
- Recurring (toggle/checkbox)
- Comment (textarea, optional)
- Link Transaction (optional — searchable dropdown that queries `/transactions` by counterparty)

When in edit mode, receives existing payable data and pre-fills the form. Submit calls `payablesApi.create()` or `payablesApi.update()`.

Uses `DrawerShell` from `frontend/app/components/ui/drawer-shell.tsx` with `position="right"` and `width="md"`.

Shows `toast.success()` on save and `toast.error()` on failure.

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/CreatePayableDrawer.tsx
git commit -m "feat(payables): add create/edit payable drawer with form fields"
```

---

### Task 13: Create PayablesView (Main Container)

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/PayablesView.tsx`

**Step 1: Write PayablesView.tsx**

The main container component that orchestrates:
1. `PayableSummaryCards` at the top
2. `PayableFiltersBar` below summary cards
3. `PayablesList` as the main content
4. `CreatePayableDrawer` triggered by a "Create Payable" button (floating action button bottom-right, matching the `+` button pattern from the existing statements page)
5. Export button in the top-right area

State management:
- `filters` state object controlling the API query
- `summary` loaded from `payablesApi.getSummary()`
- `payables` loaded from `payablesApi.list(filters)`
- `loading` state for skeleton placeholders
- `drawerOpen` / `editingPayable` for the create/edit drawer
- `refreshKey` counter to trigger re-fetches after mutations

Data flow:
- On mount and when filters change, call `payablesApi.list(filters)` and `payablesApi.getSummary()`
- On "Mark as paid": call `payablesApi.markAsPaid(id)`, show toast, refresh
- On "Archive": call `payablesApi.archive(id)`, show toast, refresh
- On "Delete": confirm, then `payablesApi.remove(id)`, show toast, refresh
- On "Export": call `payablesApi.exportList(filters, format)`, download blob

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/PayablesView.tsx
git commit -m "feat(payables): add PayablesView container component"
```

---

### Task 14: Replace Pay Page Stub with PayablesView

**Files:**
- Modify: `frontend/app/(main)/statements/pay/page.tsx`

**Step 1: Replace stub content**

Replace the current 13-line stub that renders `StatementsListView` with:

```tsx
import { StatementsSidePanel } from '../components/StatementsSidePanel';
import PayablesView from '../components/payables/PayablesView';

export default function StatementsPayPage() {
  return (
    <>
      <StatementsSidePanel activeItem="pay" />
      <PayablesView />
    </>
  );
}
```

**Step 2: Verify it renders**

Run: `cd frontend && npm run dev`
Navigate to `/statements/pay` — should show summary cards, filter bar, empty list with "Create your first payable" CTA.

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/pay/page.tsx
git commit -m "feat(payables): replace Pay page stub with dedicated PayablesView"
```

---

### Task 15: Update Side Panel Badge to Use API

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`

**Step 1: Update Pay badge count**

In the `loadStageCounts` effect (around line 100), instead of reading the localStorage stage map for Pay counts, add a call to `payablesApi.getSummary()` and use `summary.toPayCount + summary.overdueCount` as the Pay badge count.

Keep the existing Submit and Approve counts based on localStorage (they still use the statement workflow).

**Step 2: Verify badge shows correct count**

Create a test payable via the API, then navigate to `/statements/pay` — the side panel badge should reflect the API count.

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsSidePanel.tsx
git commit -m "feat(payables): switch Pay badge count from localStorage to API-driven"
```

---

### Task 16: Add i18n Labels for Pay Tab

**Files:**
- Modify: `frontend/app/(main)/statements/page.content.ts` — add payables-specific labels
- Modify: `frontend/app/(main)/statements/[id]/edit/page.content.ts` — update pay button labels

**Step 1: Add payables labels to page.content.ts**

Add a `payables` section with translated labels for:
- Summary card titles (To Pay, Overdue, Due This Week, Paid This Month)
- Filter labels (Status, Source, Due Date, Vendor)
- Status names (to_pay, scheduled, overdue, paid, archived)
- Action labels (Mark as paid, Edit, Archive, Delete, Create payable)
- Drawer labels (Create Payable, Edit Payable, Vendor, Amount, Currency, Due Date, Source, Recurring, Comment)
- Empty state text
- Export button label
- Toast messages (Created, Updated, Marked as paid, Archived, Deleted, Export started)

All in three languages: `ru`, `en`, `kk`.

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/page.content.ts frontend/app/(main)/statements/[id]/edit/page.content.ts
git commit -m "feat(payables): add i18n translations for Pay tab (en/ru/kk)"
```

---

## Phase 3 — Dashboard Integration & Export

### Task 17: Update Dashboard to Link to Payables API

**Files:**
- Verify: `backend/src/modules/dashboard/dashboard.service.ts` — already queries `payableRepo`

**Step 1: Verify existing dashboard integration**

The dashboard service already computes `totalPayable` and `totalOverdue` from the payable repo. Verify these return correct values after creating test payables.

**Step 2: Update dashboard action items**

In `dashboard.service.ts`, ensure the `payments_overdue` action item links to `/statements/pay?status=overdue` so users can click through from the dashboard to the filtered Pay view.

**Step 3: Commit if changes were needed**

```bash
git add backend/src/modules/dashboard/dashboard.service.ts
git commit -m "feat(payables): update dashboard action items to link to filtered Pay view"
```

---

### Task 18: Add Export Button to PayablesView

**Files:**
- Modify: `frontend/app/(main)/statements/components/payables/PayablesView.tsx`

**Step 1: Add export functionality**

Add an "Export" dropdown button in the header area with options:
- "Export to Excel (.xlsx)"
- "Export to CSV (.csv)"

On click:
1. Show `toast.loading('Exporting...')`
2. Call `payablesApi.exportList(currentFilters, format)`
3. Create a blob URL from the response
4. Trigger download via programmatic `<a>` click
5. Show `toast.success('Exported')` or `toast.error('Export failed')`

Follow the pattern from `frontend/app/(main)/custom-tables/page.tsx:608-706`.

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/PayablesView.tsx
git commit -m "feat(payables): add Excel and CSV export functionality"
```

---

### Task 19: Enable Pay Button on Gmail Receipts Page

**Files:**
- Modify: `frontend/app/storage/gmail-receipts/[id]/page.tsx:720-741`

**Step 1: Enable the Pay button**

Replace the disabled Pay button with an enabled one that opens `CreatePayableDrawer` pre-filled with the receipt's vendor, amount, and source set to `invoice`.

Remove the tooltip "Pay workflow will be enabled after payable pipeline integration".

**Step 2: Commit**

```bash
git add frontend/app/storage/gmail-receipts/[id]/page.tsx
git commit -m "feat(payables): enable Pay button on Gmail receipts page"
```

---

## Phase 4 — Tests & Polish

### Task 20: Write Frontend Component Tests

**Files:**
- Create: `frontend/app/(main)/statements/components/payables/__tests__/PayableSummaryCards.test.tsx`
- Create: `frontend/app/(main)/statements/components/payables/__tests__/PayablesList.test.tsx`
- Create: `frontend/app/(main)/statements/components/payables/__tests__/PayablesView.test.tsx`

**Step 1: Write summary cards tests**

- Renders 4 cards with correct labels
- Formats amounts correctly
- Calls onFilterByStatus when card is clicked
- Shows zero state gracefully

**Step 2: Write payables list tests**

- Renders list of payables with correct columns
- Shows correct status badges with correct colors
- Shows empty state when no payables
- Calls markAsPaid handler when button clicked

**Step 3: Write PayablesView integration test**

- Mocks `payablesApi.list` and `payablesApi.getSummary`
- Renders summary cards + list together
- Verifies filter changes trigger new API call

**Step 4: Run tests**

Run: `cd frontend && npx jest --testPathPattern=payables --verbose`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/payables/__tests__/
git commit -m "test(payables): add frontend component tests for Pay tab"
```

---

### Task 21: Run Lint, Format, and Full Test Suite

**Step 1: Run linting**

Run: `make lint`
Expected: No lint errors.

**Step 2: Run formatting**

Run: `make format`
Expected: No formatting issues.

**Step 3: Run backend tests**

Run: `make test-backend`
Expected: All tests pass.

**Step 4: Run frontend tests**

Run: `make test-frontend`
Expected: All tests pass.

**Step 5: Fix any issues, then commit**

```bash
git add -A
git commit -m "chore(payables): fix lint and test issues"
```

---

## Summary of New Files

### Backend (7 files)
```
backend/src/modules/payables/
├── dto/
│   ├── create-payable.dto.ts
│   ├── update-payable.dto.ts
│   └── filter-payables.dto.ts
├── payables.module.ts
├── payables.controller.ts
├── payables.service.ts
├── payables-export.service.ts
└── payables.scheduler.ts
```

### Backend Tests (2 files)
```
backend/@tests/unit/modules/payables/
├── payables.service.spec.ts
└── payables.controller.spec.ts
```

### Frontend (6 files)
```
frontend/app/lib/payables-api.ts

frontend/app/(main)/statements/components/payables/
├── PayableSummaryCards.tsx
├── PayablesList.tsx
├── PayableFiltersBar.tsx
├── CreatePayableDrawer.tsx
└── PayablesView.tsx
```

### Frontend Tests (3 files)
```
frontend/app/(main)/statements/components/payables/__tests__/
├── PayableSummaryCards.test.tsx
├── PayablesList.test.tsx
└── PayablesView.test.tsx
```

### Modified Files
```
backend/src/app.module.ts                           — import PayablesModule
frontend/app/(main)/statements/pay/page.tsx         — replace stub with PayablesView
frontend/app/(main)/statements/components/StatementsSidePanel.tsx  — API-driven badge
frontend/app/(main)/statements/page.content.ts      — i18n labels
frontend/app/storage/gmail-receipts/[id]/page.tsx   — enable Pay button
backend/src/modules/dashboard/dashboard.service.ts  — link action items to /statements/pay
```

---

## API Endpoints Summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/payables` | PAYABLE_CREATE | Create a new payable |
| GET | `/payables` | PAYABLE_VIEW | List payables (paginated, filtered) |
| GET | `/payables/summary` | PAYABLE_VIEW | Get summary card data |
| GET | `/payables/:id` | PAYABLE_VIEW | Get single payable |
| PUT | `/payables/:id` | PAYABLE_EDIT | Update payable fields |
| PUT | `/payables/:id/mark-paid` | PAYABLE_EDIT | Mark payable as paid |
| PUT | `/payables/:id/archive` | PAYABLE_EDIT | Archive payable |
| DELETE | `/payables/:id` | PAYABLE_DELETE | Soft-delete payable |
| POST | `/payables/export` | PAYABLE_VIEW | Export list (Excel/CSV) |

---

## Execution Order

Tasks 1-7 (backend) are sequential and must be done first.
Tasks 8-16 (frontend) depend on backend being complete. Tasks 8-12 can be parallelized. Tasks 13-16 are sequential.
Tasks 17-19 (integration) can be done after frontend.
Tasks 20-21 (tests & polish) are last.
