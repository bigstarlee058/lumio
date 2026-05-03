import { IsBase64, IsOptional, IsString, IsUUID } from 'class-validator';

export class WebhookStatementUploadDto {
  @IsBase64()
  @IsOptional()
  fileBase64?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsUUID()
  @IsOptional()
  walletId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
