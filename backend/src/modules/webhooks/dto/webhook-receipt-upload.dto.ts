import { IsBase64, IsOptional, IsString, IsUUID } from 'class-validator';

export class WebhookReceiptUploadDto {
  @IsBase64()
  @IsOptional()
  fileBase64?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsUUID()
  @IsOptional()
  walletId?: string;
}
