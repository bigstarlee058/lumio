import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CategoryType } from '@/entities/category.entity';
import { UpdateCategoryDto } from '@/modules/categories/dto/update-category.dto';
import { UpdateCustomTableColumnDto } from '@/modules/custom-tables/dto/update-custom-table-column.dto';
import { UpdateDriveSettingsDto } from '@/modules/google-drive/dto/update-drive-settings.dto';
import { UpdateDropboxSettingsDto } from '@/modules/dropbox/dto/update-dropbox-settings.dto';
import { UpdateWalletDto } from '@/modules/wallets/dto/update-wallet.dto';
import { UpdateWorkspaceDto } from '@/modules/workspaces/dto/update-workspace.dto';

describe('update DTO compatibility', () => {
  it('keeps category update fields optional with existing validation rules', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {
      name: 'Food',
      type: CategoryType.EXPENSE,
      parentId: 'not-a-uuid',
    });

    const errors = await validate(dto as object);

    expect(errors.some(error => error.property === 'parentId')).toBe(true);
  });

  it('keeps custom table column update fields optional with existing validation rules', async () => {
    const dto = plainToInstance(UpdateCustomTableColumnDto, {
      title: '',
      position: -1,
    });

    const errors = await validate(dto as object);

    expect(errors.some(error => error.property === 'title')).toBe(true);
    expect(errors.some(error => error.property === 'position')).toBe(true);
  });

  it('preserves workspace and wallet extra optional flags', async () => {
    const workspaceDto = plainToInstance(UpdateWorkspaceDto, { isFavorite: true });
    const walletDto = plainToInstance(UpdateWalletDto, { isActive: false });

    expect(await validate(workspaceDto as object)).toHaveLength(0);
    expect(await validate(walletDto as object)).toHaveLength(0);
  });

  it('keeps drive and dropbox settings DTOs aligned', async () => {
    const payload = {
      folderId: 'folder-1',
      folderName: 'Receipts',
      syncEnabled: true,
      syncTime: '09:30',
      timeZone: 'Asia/Almaty',
    };

    const driveDto = plainToInstance(UpdateDriveSettingsDto, payload);
    const dropboxDto = plainToInstance(UpdateDropboxSettingsDto, payload);

    expect(await validate(driveDto as object)).toHaveLength(0);
    expect(await validate(dropboxDto as object)).toHaveLength(0);
  });
});
