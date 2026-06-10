import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant-context';

declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
    tenantSlug?: string;
  }
}

/**
 * Resolves the tenant for every request and runs the rest of the request inside the
 * AsyncLocalStorage tenant context. Unknown hosts are rejected (no data leakage).
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const headerSlug = req.headers[this.tenantService.tenantHeader] as string | undefined;
    const host = req.headers['x-forwarded-host'] ?? req.headers.host;

    const resolved = await this.tenantService.resolveFromHostOrHeader(
      Array.isArray(host) ? host[0] : host,
      headerSlug,
    );

    if (!resolved) {
      throw new NotFoundException('Tenant not found for this host');
    }

    req.tenantId = resolved.tenantId;
    req.tenantSlug = resolved.slug;

    this.tenantContext.run(
      { tenantId: resolved.tenantId, slug: resolved.slug },
      () => next(),
    );
  }
}
