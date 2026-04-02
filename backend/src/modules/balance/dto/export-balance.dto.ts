import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export enum BalanceExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ExportBalanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsEnum(BalanceExportFormat)
  format: BalanceExportFormat = BalanceExportFormat.EXCEL;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}
