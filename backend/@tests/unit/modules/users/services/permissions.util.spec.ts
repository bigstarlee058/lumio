import {
  findUserOrThrow,
  getCurrentPermissions,
  withCurrentPermissions,
} from '@/modules/users/services/permissions.util';

describe('permissions.util', () => {
  it('returns a normalized permissions array', () => {
    expect(getCurrentPermissions({ permissions: null } as any)).toEqual([]);
    expect(getCurrentPermissions({ permissions: ['read'] } as any)).toEqual(['read']);
  });

  it('passes normalized permissions to a callback', () => {
    expect(
      withCurrentPermissions({ permissions: ['read'] } as any, (user, permissions) => ({
        user,
        permissions,
      })),
    ).toEqual({
      user: { permissions: ['read'] },
      permissions: ['read'],
    });
  });

  it('returns the user or throws when missing', async () => {
    await expect(findUserOrThrow(Promise.resolve({ id: 'u1' } as any))).resolves.toEqual({ id: 'u1' });
    await expect(findUserOrThrow(Promise.resolve(null))).rejects.toThrow('User not found');
  });
});
