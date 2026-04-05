import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

type JsonObject = Record<string, unknown>;

export class CreateCustomTableRowDto {
  @IsObject()
  data: JsonObject;

  @IsOptional()
  @IsObject()
  styles?: JsonObject;

  @IsOptional()
  @IsInt()
  @Min(1)
  rowNumber?: number;
}
