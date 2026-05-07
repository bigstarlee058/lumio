import { IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../../common/enums/permissions.enum';

export class UpdatePermissionsDto {
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}

export class AddPermissionDto {
  @IsEnum(Permission)
  permission: Permission;
}

export class RemovePermissionDto {
  @IsEnum(Permission)
  permission: Permission;
}
