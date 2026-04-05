import type { Permission } from '@/common/enums/permissions.enum';
import {
  findUserOrThrow,
  getCurrentPermissions,
  withCurrentPermissions,
} from '@/modules/users/services/permissions.util';

type UserWithOptionalPermissions = { id?: string; permissions?: string[] | null };

describe('permissions.util', () => {
  it('returns a normalized permissions array', () => {
    expect(getCurrentPermissions({ permissions: null })).toEqual([]);
    expect(getCurrentPermissions({ permissions: ['read'] })).toEqual(['read']);
  });

  it('passes normalized permissions to a callback', () => {
    expect(
      withCurrentPermissions<
        UserWithOptionalPermissions,
        { user: UserWithOptionalPermissions; permissions: Permission[] }
      >(
        { permissions: ['read'] },
        (user: UserWithOptionalPermissions, permissions: Permission[]) => ({
          user,
          permissions,
        }),
      ),
    ).toEqual({
      user: { permissions: ['read'] },
      permissions: ['read'],
    });
  });

  it('returns the user or throws when missing', async () => {
    await expect(findUserOrThrow(Promise.resolve({ id: 'u1' }))).resolves.toEqual({ id: 'u1' });
    await expect(findUserOrThrow(Promise.resolve(null))).rejects.toThrow('User not found');
  });
});
