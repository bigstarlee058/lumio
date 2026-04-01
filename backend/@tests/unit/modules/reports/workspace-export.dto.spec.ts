import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  WorkspaceExportDto,
  WorkspaceExportFormat,
} from '@/modules/reports/dto/workspace-export.dto';

describe('WorkspaceExportDto', () => {
  it('accepts supported export formats', async () => {
    const dto = plainToInstance(WorkspaceExportDto, {
      format: WorkspaceExportFormat.DOCX,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.format).toBe(WorkspaceExportFormat.DOCX);
  });

  it('rejects unknown export formats', async () => {
    const dto = plainToInstance(WorkspaceExportDto, {
      format: 'zip',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('format');
  });
});
