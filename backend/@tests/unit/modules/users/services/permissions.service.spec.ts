import { Permission, ROLE_PERMISSIONS } from '@/common/enums/permissions.enum';
import { User, UserRole } from '@/entities/user.entity';
import { PermissionsService } from '@/modules/users/services/permissions.service';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

describe('PermissionsService', () => {
  let testingModule: TestingModule;
  let service: PermissionsService;
  let userRepository: jest.Mocked<Repository<User>>;

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.USER,
      permissions: null,
      ...overrides,
    }) as User;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = testingModule.get<PermissionsService>(PermissionsService);
    userRepository = testingModule.get(getRepositoryToken(User));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('getUserPermissions', () => {
    it('returns all permissions for ADMIN role', () => {
      const user = makeUser({ role: UserRole.ADMIN });

      const result = service.getUserPermissions(user);

      expect(result).toEqual(Object.values(Permission));
    });

    it('returns role-based permissions for USER role without custom permissions', () => {
      const user = makeUser({ role: UserRole.USER, permissions: null });

      const result = service.getUserPermissions(user);

      expect(result).toEqual(expect.arrayContaining(ROLE_PERMISSIONS[UserRole.USER]));
    });

    it('merges role permissions with custom permissions (no duplicates)', () => {
      const customPermission = Permission.STATEMENT_DELETE;
      const user = makeUser({ role: UserRole.USER, permissions: [customPermission] });

      const result = service.getUserPermissions(user);

      // Custom permission is in result
      expect(result).toContain(customPermission);
      // No duplicates - Set ensures uniqueness
      const unique = [...new Set(result)];
      expect(result.length).toBe(unique.length);
    });

    it('includes custom permissions not in role defaults', () => {
      const customPermission = Permission.STATEMENT_DELETE;
      const user = makeUser({ role: UserRole.USER, permissions: [customPermission] });

      const result = service.getUserPermissions(user);

      expect(result).toContain(customPermission);
    });

    it('returns role permissions when custom permissions is empty array', () => {
      const user = makeUser({ role: UserRole.USER, permissions: [] });

      const result = service.getUserPermissions(user);

      ROLE_PERMISSIONS[UserRole.USER].forEach(p => expect(result).toContain(p));
    });

    it('ADMIN permissions include write permissions not in USER role', () => {
      const admin = makeUser({ role: UserRole.ADMIN });
      const regularUser = makeUser({ role: UserRole.USER });

      const adminPerms = service.getUserPermissions(admin);
      const userPerms = service.getUserPermissions(regularUser);

      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
      expect(adminPerms).toContain(Permission.STATEMENT_DELETE);
      expect(userPerms).not.toContain(Permission.STATEMENT_DELETE);
    });
  });

  describe('hasPermission', () => {
    it('returns true when user has the permission', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasPermission(user, Permission.STATEMENT_VIEW);

      expect(result).toBe(true);
    });

    it('returns false when user does not have the permission', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasPermission(user, Permission.STATEMENT_DELETE);

      expect(result).toBe(false);
    });

    it('returns true for any permission for ADMIN', () => {
      const admin = makeUser({ role: UserRole.ADMIN });

      Object.values(Permission).forEach(p => {
        expect(service.hasPermission(admin, p)).toBe(true);
      });
    });

    it('returns true for custom permission not in role defaults', () => {
      const user = makeUser({
        role: UserRole.USER,
        permissions: [Permission.USER_MANAGE],
      });

      expect(service.hasPermission(user, Permission.USER_MANAGE)).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one of the specified permissions', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasAnyPermission(user, [
        Permission.STATEMENT_DELETE, // not in USER role
        Permission.STATEMENT_VIEW,   // in USER role
      ]);

      expect(result).toBe(true);
    });

    it('returns false when user has none of the specified permissions', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasAnyPermission(user, [
        Permission.STATEMENT_DELETE,
        Permission.STATEMENT_EDIT,
        Permission.USER_MANAGE,
      ]);

      expect(result).toBe(false);
    });

    it('returns false for empty permissions array', () => {
      const user = makeUser({ role: UserRole.ADMIN });

      const result = service.hasAnyPermission(user, []);

      expect(result).toBe(false);
    });

    it('returns true for ADMIN with any permission list', () => {
      const admin = makeUser({ role: UserRole.ADMIN });

      const result = service.hasAnyPermission(admin, [Permission.USER_MANAGE]);

      expect(result).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all specified permissions', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasAllPermissions(user, [
        Permission.STATEMENT_VIEW,
        Permission.TRANSACTION_VIEW,
      ]);

      expect(result).toBe(true);
    });

    it('returns false when user is missing even one permission', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasAllPermissions(user, [
        Permission.STATEMENT_VIEW,
        Permission.STATEMENT_DELETE, // not in USER role
      ]);

      expect(result).toBe(false);
    });

    it('returns true for empty permissions array', () => {
      const user = makeUser({ role: UserRole.USER });

      const result = service.hasAllPermissions(user, []);

      expect(result).toBe(true);
    });

    it('returns true for ADMIN with any combination of permissions', () => {
      const admin = makeUser({ role: UserRole.ADMIN });

      const result = service.hasAllPermissions(admin, Object.values(Permission));

      expect(result).toBe(true);
    });
  });

  describe('updateUserPermissions', () => {
    it('updates user permissions and saves', async () => {
      const user = makeUser({ permissions: [] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        ...user,
        permissions: [Permission.STATEMENT_DELETE],
      } as User);

      const result = await service.updateUserPermissions('user-1', [Permission.STATEMENT_DELETE]);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: [Permission.STATEMENT_DELETE] }),
      );
      expect(result.permissions).toContain(Permission.STATEMENT_DELETE);
    });

    it('throws when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserPermissions('non-existent', [Permission.STATEMENT_VIEW]),
      ).rejects.toThrow('User not found');
    });
  });

  describe('addPermission', () => {
    it('adds a new permission to user', async () => {
      const user = makeUser({ permissions: [Permission.STATEMENT_VIEW] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        ...user,
        permissions: [Permission.STATEMENT_VIEW, Permission.STATEMENT_DELETE],
      } as User);

      await service.addPermission('user-1', Permission.STATEMENT_DELETE);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.arrayContaining([
            Permission.STATEMENT_VIEW,
            Permission.STATEMENT_DELETE,
          ]),
        }),
      );
    });

    it('does not add duplicate permission', async () => {
      const user = makeUser({ permissions: [Permission.STATEMENT_VIEW] });
      userRepository.findOne.mockResolvedValue(user);

      await service.addPermission('user-1', Permission.STATEMENT_VIEW);

      // save should not be called if permission already exists
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('throws when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addPermission('non-existent', Permission.STATEMENT_VIEW),
      ).rejects.toThrow('User not found');
    });
  });

  describe('removePermission', () => {
    it('removes an existing permission from user', async () => {
      const user = makeUser({
        permissions: [Permission.STATEMENT_VIEW, Permission.STATEMENT_DELETE],
      });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        ...user,
        permissions: [Permission.STATEMENT_VIEW],
      } as User);

      await service.removePermission('user-1', Permission.STATEMENT_DELETE);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [Permission.STATEMENT_VIEW],
        }),
      );
    });

    it('is idempotent when permission does not exist', async () => {
      const user = makeUser({ permissions: [Permission.STATEMENT_VIEW] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.removePermission('user-1', Permission.STATEMENT_DELETE);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [Permission.STATEMENT_VIEW],
        }),
      );
    });

    it('throws when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removePermission('non-existent', Permission.STATEMENT_VIEW),
      ).rejects.toThrow('User not found');
    });
  });

  describe('resetPermissions', () => {
    it('sets user permissions to null (reverts to role defaults)', async () => {
      const user = makeUser({ permissions: [Permission.STATEMENT_DELETE] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, permissions: null } as User);

      await service.resetPermissions('user-1');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: null }),
      );
    });

    it('throws when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPermissions('non-existent')).rejects.toThrow('User not found');
    });
  });
});
