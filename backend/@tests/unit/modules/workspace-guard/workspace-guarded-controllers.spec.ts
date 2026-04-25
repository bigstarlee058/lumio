import 'reflect-metadata';
import { WorkspaceContextGuard } from '@/common/guards/workspace-context.guard';
import { BranchesController } from '@/modules/branches/branches.controller';
import { WalletsController } from '@/modules/wallets/wallets.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('Workspace-guarded controllers', () => {
  it.each([[WalletsController], [BranchesController]])(
    'applies WorkspaceContextGuard on methods of %p',
    controllerClass => {
      const proto = controllerClass.prototype;
      const methodNames = Object.getOwnPropertyNames(proto).filter(
        name => name !== 'constructor' && typeof proto[name] === 'function',
      );

      // At least one method should have WorkspaceContextGuard
      const hasGuardedMethod = methodNames.some(name => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, proto[name]) ?? [];
        return guards.some(
          (g: unknown) => g === WorkspaceContextGuard || (typeof g === 'function' && g.name === 'WorkspaceContextGuard'),
        );
      });

      expect(hasGuardedMethod).toBe(true);
    },
  );
});
