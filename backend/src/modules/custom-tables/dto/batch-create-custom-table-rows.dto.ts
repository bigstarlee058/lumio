import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

type JsonObject = Record<string, unknown>;

class BatchRowItemDto {
  @IsObject()
  data: JsonObject;

  @IsOptional()
  @IsInt()
  @Min(1)
  rowNumber?: number;
}

export class BatchCreateCustomTableRowsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchRowItemDto)
  rows: BatchRowItemDto[];
}
