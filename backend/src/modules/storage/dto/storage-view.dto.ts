import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { StorageViewFilters } from '../interfaces/storage-view-filters.interface';

export class StorageViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsOptional()
  filters?: StorageViewFilters;
}
