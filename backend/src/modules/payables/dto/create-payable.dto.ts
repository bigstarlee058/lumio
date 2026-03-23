import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PayableSource, PayableStatus } from '../../../entities/payable.entity';

export class CreatePayableDto {
  @IsString()
  @MaxLength(255)
  vendor: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsUUID()
  linkedTransactionId?: string;

  @IsOptional()
  @IsEnum(PayableSource)
  source?: PayableSource;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  statementId?: string;
}
