import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantIsolationGuard } from './tenant-isolation.guard';

function ctx(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantIsolationGuard', () => {
  function guard(opts: { store?: { tenantId: string } | undefined; isPublic?: boolean }) {
    const tenantContext = { get: jest.fn().mockReturnValue(opts.store) } as any;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(opts.isPublic ?? false),
    } as unknown as Reflector;
    return new TenantIsolationGuard(tenantContext, reflector);
  }

  it('allows a public route when there is no tenant context', () => {
    const g = guard({ store: undefined, isPublic: true });
    expect(g.canActivate(ctx({}))).toBe(true);
  });

  it('rejects a non-public route when the tenant context is missing', () => {
    const g = guard({ store: undefined, isPublic: false });
    expect(() => g.canActivate(ctx({ tenantId: 't1' }))).toThrow(ForbiddenException);
  });

  it('allows when the resolved tenant matches the authenticated user', () => {
    const g = guard({ store: { tenantId: 't1' } });
    const req = { tenantId: 't1', user: { tenantId: 't1' } };
    expect(g.canActivate(ctx(req))).toBe(true);
  });

  it('rejects when the authenticated user belongs to a different tenant', () => {
    const g = guard({ store: { tenantId: 't1' } });
    const req = { tenantId: 't1', user: { tenantId: 't2' } };
    expect(() => g.canActivate(ctx(req))).toThrow(ForbiddenException);
  });

  it('rejects when a body tenantId claims a different tenant', () => {
    const g = guard({ store: { tenantId: 't1' } });
    const req = { tenantId: 't1', body: { tenantId: 't2' } };
    expect(() => g.canActivate(ctx(req))).toThrow(ForbiddenException);
  });

  it('rejects when a param tenantId claims a different tenant', () => {
    const g = guard({ store: { tenantId: 't1' } });
    const req = { tenantId: 't1', params: { tenantId: 't2' } };
    expect(() => g.canActivate(ctx(req))).toThrow(ForbiddenException);
  });

  it('allows when a claimed tenantId matches the resolved tenant', () => {
    const g = guard({ store: { tenantId: 't1' } });
    const req = { tenantId: 't1', body: { tenantId: 't1' } };
    expect(g.canActivate(ctx(req))).toBe(true);
  });
});
