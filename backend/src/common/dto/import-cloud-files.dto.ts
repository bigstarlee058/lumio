import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ImportCloudFilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  fileIds: string[];
}
