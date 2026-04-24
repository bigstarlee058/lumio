import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Permission } from '@/common/enums/permissions.enum';
import { ChangeEmailDto } from '@/modules/users/dto/change-email.dto';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import {
  AddPermissionDto,
  RemovePermissionDto,
  UpdatePermissionsDto,
} from '@/modules/users/dto/update-permissions.dto';

describe('User Security DTOs', () => {
  describe('ChangePasswordDto', () => {
    const validInput = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    it('passes validation with valid current and new passwords', async () => {
      const dto = plainToInstance(ChangePasswordDto, validInput);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation when newPassword is shorter than 8 characters', async () => {
      const dto = plainToInstance(ChangePasswordDto, { ...validInput, newPassword: 'short' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'newPassword')).toBe(true);
    });

    it('passes validation when newPassword is exactly 8 characters', async () => {
      const dto = plainToInstance(ChangePasswordDto, { ...validInput, newPassword: 'exactly8' });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'newPassword')).toHaveLength(0);
    });

    it('fails validation when currentPassword is missing', async () => {
      const dto = plainToInstance(ChangePasswordDto, { newPassword: validInput.newPassword });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'currentPassword')).toBe(true);
    });

    it('fails validation when newPassword is missing', async () => {
      const dto = plainToInstance(ChangePasswordDto, { currentPassword: validInput.currentPassword });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'newPassword')).toBe(true);
    });

    it('fails validation when currentPassword is not a string', async () => {
      const dto = plainToInstance(ChangePasswordDto, { ...validInput, currentPassword: 12345678 });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'currentPassword')).toBe(true);
    });
  });

  describe('ChangeEmailDto', () => {
    const validInput = {
      email: 'newemail@example.com',
      currentPassword: 'myPassword123',
    };

    it('passes validation with valid email and password', async () => {
      const dto = plainToInstance(ChangeEmailDto, validInput);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for invalid email format', async () => {
      const dto = plainToInstance(ChangeEmailDto, { ...validInput, email: 'not-an-email' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('fails validation for missing email', async () => {
      const dto = plainToInstance(ChangeEmailDto, { currentPassword: validInput.currentPassword });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('fails validation for missing currentPassword', async () => {
      const dto = plainToInstance(ChangeEmailDto, { email: validInput.email });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'currentPassword')).toBe(true);
    });

    it('rejects SQL injection attempt in email field', async () => {
      const dto = plainToInstance(ChangeEmailDto, {
        ...validInput,
        email: "'; DROP TABLE users; --",
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });
  });

  describe('UpdatePermissionsDto', () => {
    it('passes validation with array of valid Permission enum values', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        permissions: [Permission.STATEMENT_VIEW, Permission.TRANSACTION_VIEW],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('passes validation with empty permissions array', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, { permissions: [] });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation when permissions contains invalid enum value', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        permissions: ['invalid.permission', Permission.STATEMENT_VIEW],
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permissions')).toBe(true);
    });

    it('fails validation when permissions is not an array', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        permissions: Permission.STATEMENT_VIEW,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permissions')).toBe(true);
    });

    it('fails validation when permissions contains arbitrary strings (injection attempt)', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        permissions: ['admin.all', 'root', '* '],
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permissions')).toBe(true);
    });

    it('accepts all valid Permission enum values', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        permissions: Object.values(Permission),
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('AddPermissionDto', () => {
    it('passes validation with a valid Permission enum value', async () => {
      const dto = plainToInstance(AddPermissionDto, { permission: Permission.STATEMENT_DELETE });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for invalid permission string', async () => {
      const dto = plainToInstance(AddPermissionDto, { permission: 'admin.escalate' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permission')).toBe(true);
    });

    it('fails validation when permission is missing', async () => {
      const dto = plainToInstance(AddPermissionDto, {});
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permission')).toBe(true);
    });
  });

  describe('RemovePermissionDto', () => {
    it('passes validation with a valid Permission enum value', async () => {
      const dto = plainToInstance(RemovePermissionDto, { permission: Permission.STATEMENT_VIEW });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for invalid permission string', async () => {
      const dto = plainToInstance(RemovePermissionDto, { permission: 'anything.goes' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permission')).toBe(true);
    });

    it('fails validation when permission is missing', async () => {
      const dto = plainToInstance(RemovePermissionDto, {});
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'permission')).toBe(true);
    });
  });
});
