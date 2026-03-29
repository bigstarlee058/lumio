import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class BulkApproveDto {
  @IsArray()
  @IsUUID('4', { each: true })
  receiptIds: string[];

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
