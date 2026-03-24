import { ThemePreference } from '@/entities/user.entity';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AppLocale {
  RU = 'ru',
  EN = 'en',
  KK = 'kk',
}

export class UpdateMyPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(AppLocale)
  locale?: AppLocale;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string | null;

  @IsOptional()
  @IsEnum(ThemePreference)
  themePreference?: ThemePreference;
}
