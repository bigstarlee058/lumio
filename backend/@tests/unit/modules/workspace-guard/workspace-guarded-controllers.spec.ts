import 'reflect-metadata';
import { WorkspaceContextGuard } from '@/common/guards/workspace-context.guard';
import { BranchesController } from '@/modules/branches/branches.controller';
import { WalletsController } from '@/modules/wallets/wallets.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('Workspace-guarded controllers', () => {
  it.each([[WalletsController], [BranchesController]])(
    'applies WorkspaceContextGuard on %p',
    controllerClass => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controllerClass) ?? [];

      expect(guards).toContain(WorkspaceContextGuard);
    },
  );
});
