import { IsOptional, IsString } from 'class-validator';

export class UploadReceiptScanDto {
  @IsOptional()
  @IsString()
  language?: string;
}
