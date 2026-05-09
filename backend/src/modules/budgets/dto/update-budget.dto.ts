import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BudgetPeriodType } from '../../../entities/budget.entity';

export class UpdateBudgetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  limitAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  manualSpentAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BudgetPeriodType)
  @IsOptional()
  periodType?: BudgetPeriodType;
}
