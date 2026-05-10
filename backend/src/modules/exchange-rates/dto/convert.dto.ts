import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ConvertItemDto {
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
