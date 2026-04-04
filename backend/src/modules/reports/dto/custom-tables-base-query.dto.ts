import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CustomTablesBaseQueryDto {
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
}
