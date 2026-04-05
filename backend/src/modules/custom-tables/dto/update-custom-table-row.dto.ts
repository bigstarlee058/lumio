import { IsObject, IsOptional } from 'class-validator';

type JsonObject = Record<string, unknown>;

export class UpdateCustomTableRowDto {
  @IsObject()
  data: JsonObject;

  @IsOptional()
  @IsObject()
  styles?: JsonObject;
}
