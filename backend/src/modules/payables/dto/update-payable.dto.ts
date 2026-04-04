import { PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PayableSource, PayableStatus } from '../../../entities/payable.entity';
import { CreatePayableDto } from './create-payable.dto';

export class UpdatePayableDto extends PartialType(CreatePayableDto) {
  @IsOptional()
  @IsUUID()
  linkedTransactionId?: string | null;

  @IsOptional()
  @IsString()
  comment?: string | null;

  @IsOptional()
  @IsUUID()
  statementId?: string | null;
}
