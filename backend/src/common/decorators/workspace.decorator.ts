import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

const CurrentWorkspace = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { workspace?: any }>();
  return request.workspace;
});

export const WorkspaceId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { workspace?: any }>();
  return request.workspace?.id;
});
