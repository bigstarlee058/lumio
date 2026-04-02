import { Body, Controller, Get, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BalanceService } from './balance.service';
import { BalanceQueryDto } from './dto/balance-query.dto';
import { ExportBalanceDto } from './dto/export-balance.dto';
import { UpdateBalanceSnapshotDto } from './dto/update-balance-snapshot.dto';

@Controller('reports/balance')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('sheet')
  @RequirePermission(Permission.REPORT_VIEW)
  async getSheet(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: BalanceQueryDto,
  ): Promise<unknown> {
    return this.balanceService.getBalanceSheet(
      workspaceId,
      query.date,
      query.locale || user.locale,
    );
  }

  @Get('accounts')
  @RequirePermission(Permission.REPORT_VIEW)
  async getAccounts(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: BalanceQueryDto,
  ): Promise<unknown> {
    return this.balanceService.getAccountsTree(
      workspaceId,
      query.date,
      query.locale || user.locale,
    );
  }

  @Put('snapshot')
  @RequirePermission(Permission.REPORT_VIEW)
  async updateSnapshot(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateBalanceSnapshotDto,
  ) {
    return this.balanceService.updateSnapshot(user.id, workspaceId, dto);
  }

  @Get('export')
  @RequirePermission(Permission.REPORT_EXPORT)
  async exportBalance(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() dto: ExportBalanceDto,
    @Res() res: Response,
  ) {
    const payload = await this.balanceService.exportBalanceSheet(
      workspaceId,
      dto,
      dto.locale || user.locale,
    );

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', payload.fileName));
    res.send(payload.buffer);
  }
}
