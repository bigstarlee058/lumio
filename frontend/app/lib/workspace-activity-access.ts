export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export const canAccessWorkspaceActivity = (role?: string | null): boolean =>
  role === 'owner' || role === 'admin';
