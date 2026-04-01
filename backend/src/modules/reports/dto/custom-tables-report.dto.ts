import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

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

export class CustomTablesReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tableIds?: string[];

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

export class CustomTablesReportDrillDownDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tableIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

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
