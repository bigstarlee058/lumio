import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertItemDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class BulkConvertDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertItemDto)
  items: ConvertItemDto[];

  @IsString()
  targetCurrency: string;
}
