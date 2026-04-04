import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CustomTablesBaseQueryDto } from './custom-tables-base-query.dto';

export enum CustomTableReportFlowType {
  ALL = 'all',
  EXPENSE = 'expense',
  INCOME = 'income',
}

export enum CustomTableReportSortKey {
  AMOUNT = 'amount',
  AVERAGE = 'average',
  OPERATIONS = 'operations',
}

export class CustomTablesReportDto extends CustomTablesBaseQueryDto {
  @IsOptional()
  @IsEnum(CustomTableReportFlowType)
  flowType?: CustomTableReportFlowType;

  @IsOptional()
  @IsEnum(CustomTableReportSortKey)
  sortBy?: CustomTableReportSortKey;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CustomTablesReportDrillDownDto extends CustomTablesBaseQueryDto {
  @IsString()
  counterparty: string;

  @IsOptional()
  @IsEnum(CustomTableReportFlowType)
  flowType?: CustomTableReportFlowType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
