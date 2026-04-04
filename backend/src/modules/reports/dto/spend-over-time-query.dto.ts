import { IsIn, IsOptional } from 'class-validator';
import { BaseReportQueryDto } from './base-report-query.dto';

export class SpendOverTimeQueryDto extends BaseReportQueryDto {

  @IsOptional()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}
