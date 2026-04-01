import * as fs from 'fs';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type CustomReportDto, ReportFormat } from './dto/custom-report.dto';
import {
  CustomTablesReportDrillDownDto,
  CustomTablesReportDto,
} from './dto/custom-tables-report.dto';
import { CustomTablesSummaryDto } from './dto/custom-tables-summary.dto';
import { ExportFormat, type ExportReportDto } from './dto/export-report.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { SpendOverTimeQueryDto } from './dto/spend-over-time-query.dto';
import { TopCategoriesQueryDto } from './dto/top-categories-query.dto';
import { type WorkspaceExportDto, WorkspaceExportFormat } from './dto/workspace-export.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private scheduleTempFileCleanup(fileStream: fs.ReadStream, filePath: string) {
    const cleanup = () => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // noop cleanup safeguard
      }
    };

    fileStream.on('end', cleanup);
    fileStream.on('error', cleanup);
  }

  @Get('statements/summary')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getStatementsSummary(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.reportsService.getStatementsSummary(workspaceId, days);
  }

  @Get('top-categories')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getTopCategories(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: TopCategoriesQueryDto,
  ) {
    return this.reportsService.getTopCategoriesReport(workspaceId, query);
  }

  @Get('spend-over-time')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getSpendOverTimeReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: SpendOverTimeQueryDto,
  ) {
    return this.reportsService.getSpendOverTimeReport(workspaceId, query);
  }

  @Post('custom-tables/summary')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getCustomTablesSummary(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CustomTablesSummaryDto,
  ) {
    return this.reportsService.getCustomTablesSummary(workspaceId, dto);
  }

  @Post('custom-tables/report')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getCustomTablesReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CustomTablesReportDto,
  ) {
    return this.reportsService.getCustomTablesReport(workspaceId, dto);
  }

  @Post('custom-tables/report/drill-down')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getCustomTablesReportDrillDown(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CustomTablesReportDrillDownDto,
  ) {
    return this.reportsService.getCustomTablesReportDrillDown(workspaceId, dto);
  }

  @Get('custom-tables/available')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getAvailableCustomTables(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.reportsService.getAvailableCustomTables(workspaceId);
  }

  @Get('daily')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getDailyReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('date') date?: string,
  ) {
    const reportDate =
      date === 'latest'
        ? await this.reportsService.getLatestTransactionDate(workspaceId)
        : date ||
          (await this.reportsService.getLatestTransactionDate(workspaceId)) ||
          new Date().toISOString().split('T')[0];
    return this.reportsService.generateDailyReport(workspaceId, reportDate);
  }

  @Get('monthly')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getMonthlyReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const latest = await this.reportsService.getLatestTransactionPeriod(workspaceId);
    const currentDate = new Date();
    const reportYear = year ? Number.parseInt(year, 10) : latest.year || currentDate.getFullYear();
    const reportMonth = month
      ? Number.parseInt(month, 10)
      : latest.month || currentDate.getMonth() + 1;
    return this.reportsService.generateMonthlyReport(workspaceId, reportYear, reportMonth);
  }

  @Post('custom')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getCustomReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CustomReportDto,
  ) {
    return this.reportsService.generateCustomReport(workspaceId, dto);
  }

  @Post('export')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_EXPORT)
  async exportReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    // Generate report based on date range
    let reportData: any;

    if (dto.dateFrom && dto.dateTo) {
      // Custom report
      const customDto: CustomReportDto = {
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        format: dto.format === ExportFormat.EXCEL ? ReportFormat.EXCEL : ReportFormat.CSV,
      };
      reportData = await this.reportsService.generateCustomReport(workspaceId, customDto);
    } else {
      // Daily report for today
      const today = new Date().toISOString().split('T')[0];
      reportData = await this.reportsService.generateDailyReport(workspaceId, today);
    }

    // Export report
    const { filePath, fileName } = await this.reportsService.exportReport(
      workspaceId,
      dto,
      reportData,
    );

    // Send file
    res.setHeader(
      'Content-Type',
      dto.format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    );
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after sending
    this.scheduleTempFileCleanup(fileStream, filePath);
  }

  @Post('generate')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_EXPORT)
  async generateReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ) {
    const { filePath, fileName, contentType } = await this.reportsService.generateFromTemplate(
      workspaceId,
      dto,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    this.scheduleTempFileCleanup(fileStream, filePath);
  }

  @Post('workspace-export')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_EXPORT)
  async exportWorkspaceTransactions(
    @WorkspaceId() workspaceId: string,
    @Body() dto: WorkspaceExportDto,
    @Res() res: Response,
  ) {
    const { filePath, fileName, mimeType } = await this.reportsService.exportWorkspaceTransactions(
      workspaceId,
      dto.format || WorkspaceExportFormat.EXCEL,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    this.scheduleTempFileCleanup(fileStream, filePath);
  }

  @Get('history')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getHistory(@CurrentUser() user: User) {
    return this.reportsService.getReportHistory(user.id);
  }

  @Get('history/:reportId/download')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_EXPORT)
  async downloadHistoryReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName, contentType } = await this.reportsService.downloadHistoryReport(
      workspaceId,
      reportId,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('latest')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.REPORT_VIEW)
  async getLatestPeriod(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.reportsService.getLatestTransactionPeriod(workspaceId);
  }
}
