import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ReceiptStatus } from '../../../entities';

export class UpdateReceiptDto {
  @IsOptional()
  @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;

  @IsOptional()
  @IsObject()
  parsedData?: Record<string, unknown>;
}
