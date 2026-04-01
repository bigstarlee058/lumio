import { IsEnum } from 'class-validator';

export enum WorkspaceExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
  CSV = 'csv',
  DOCX = 'docx',
}

export class WorkspaceExportDto {
  @IsEnum(WorkspaceExportFormat)
  format: WorkspaceExportFormat = WorkspaceExportFormat.EXCEL;
}
