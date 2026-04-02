import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}
