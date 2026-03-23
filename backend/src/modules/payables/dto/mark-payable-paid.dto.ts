import { IsOptional, IsUUID } from 'class-validator';

export class MarkPayablePaidDto {
  @IsOptional()
  @IsUUID()
  linkedTransactionId?: string;
}
