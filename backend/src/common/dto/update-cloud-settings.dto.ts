import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateCloudSettingsDto {
  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsString()
  folderName?: string | null;

  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'syncTime must be in HH:MM format',
  })
  syncTime?: string;

  @IsOptional()
  @IsString()
  timeZone?: string | null;
}
