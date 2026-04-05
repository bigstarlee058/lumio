import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DataEntryType } from '../../../entities/data-entry.entity';

export class CreateDataEntryDto {
  @IsEnum(DataEntryType)
  type: DataEntryType;

  @IsDateString()
  date: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @ValidateIf((o: Pick<CreateDataEntryDto, 'customFieldValue'>) => {
    const raw = o.customFieldValue;
    if (raw === undefined || raw === null) return false;
    return String(raw).trim().length > 0;
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customFieldName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customFieldIcon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customFieldValue?: string | null;

  @IsOptional()
  @IsUUID('4')
  customTabId?: string | null;
}
