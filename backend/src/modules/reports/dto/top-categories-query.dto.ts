import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BaseReportQueryDto } from './base-report-query.dto';

export class TopCategoriesQueryDto extends BaseReportQueryDto {

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  counterparties?: string;

  @IsOptional()
  @IsString()
  has?: string;

  @IsOptional()
  @IsString()
  groupBy?: string;
}
