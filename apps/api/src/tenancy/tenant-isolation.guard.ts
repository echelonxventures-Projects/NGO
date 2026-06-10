import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TenantContext } from './tenant-context';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

/**
 * Second line of defense (the Prisma extension is the first). Ensures:
 *  - a tenant context exists for the request, and
 *  - an authenticated user belongs to the resolved tenant, and
 *  - any explicit tenantId in params/body matches the resolved tenant.
 *
 * Applied globally; combined with the Prisma extension, a single forgotten where-clause
 * cannot leak cross-tenant data.
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private readonly tenantContext: TenantContext,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & {
      tenantId?: string;
      user?: { tenantId?: string };
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
    }>();

    const store = this.tenantContext.get();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Routes with no tenant context (e.g. health) are allowed only if explicitly public.
    if (!store?.tenantId || !req.tenantId) {
      if (isPublic) return true;
      throw new ForbiddenException('Tenant context missing');
    }

    if (req.user?.tenantId && req.user.tenantId !== req.tenantId) {
      throw new ForbiddenException('Authenticated user does not belong to this tenant');
    }

    const claimed = (req.params?.tenantId ?? req.body?.tenantId) as string | undefined;
    if (claimed && claimed !== req.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return true;
  }
}
