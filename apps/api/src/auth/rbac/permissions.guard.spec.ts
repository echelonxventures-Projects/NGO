import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS } from './permissions';

function ctx(user?: { permissions?: string[] }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  function guardRequiring(required: string[] | undefined) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    return new PermissionsGuard(reflector);
  }

  it('allows the request when no permissions are required', () => {
    expect(guardRequiring(undefined).canActivate(ctx())).toBe(true);
    expect(guardRequiring([]).canActivate(ctx())).toBe(true);
  });

  it('allows when the user holds all required permissions', () => {
    const guard = guardRequiring([PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_WRITE]);
    const request = ctx({ permissions: [PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_WRITE, PERMISSIONS.USER_READ] });
    expect(guard.canActivate(request)).toBe(true);
  });

  it('rejects when the user is missing any required permission', () => {
    const guard = guardRequiring([PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_WRITE]);
    const request = ctx({ permissions: [PERMISSIONS.CONTENT_READ] });
    expect(() => guard.canActivate(request)).toThrow(ForbiddenException);
  });

  it('rejects when the user has no permissions at all', () => {
    const guard = guardRequiring([PERMISSIONS.CONTENT_READ]);
    expect(() => guard.canActivate(ctx())).toThrow(ForbiddenException);
  });
});
