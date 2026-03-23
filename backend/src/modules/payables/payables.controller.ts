import * as fs from 'fs';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePayableDto } from './dto/create-payable.dto';
import { FilterPayablesDto } from './dto/filter-payables.dto';
import { MarkPayablePaidDto } from './dto/mark-payable-paid.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { PayablesService } from './payables.service';

@Controller('payables')
@UseGuards(JwtAuthGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_CREATE)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true, isUndoable: true })
  async create(
    @Body() createDto: CreatePayableDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.create(workspaceId, user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async findAll(@WorkspaceId() workspaceId: string, @Query() query: FilterPayablesDto) {
    return this.payablesService.findAll(workspaceId, query);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async getSummary(@WorkspaceId() workspaceId: string) {
    return this.payablesService.getSummary(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    return this.payablesService.findOne(id, workspaceId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true, isUndoable: true })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdatePayableDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.update(id, workspaceId, user.id, updateDto);
  }

  @Put(':id/mark-paid')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true, isUndoable: true })
  async markAsPaid(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MarkPayablePaidDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.markAsPaid(id, workspaceId, user.id, body);
  }

  @Put(':id/archive')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true, isUndoable: true })
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.archive(id, workspaceId, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_DELETE)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true, isUndoable: true })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.payablesService.remove(id, workspaceId, user.id);
    return { message: 'Payable deleted successfully' };
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async export(
    @Body() body: FilterPayablesDto,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName, contentType } = await this.payablesService.exportData(workspaceId, body);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    const fileStream = fs.createReadStream(filePath);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup failures
      }
    };
    fileStream.pipe(res);
    fileStream.on('end', cleanup);
    fileStream.on('error', cleanup);
    res.on('close', cleanup);
  }
}
