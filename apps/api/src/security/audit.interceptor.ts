import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { TenantContext } from '../tenancy/tenant-context';
import { AuthUser } from '../auth/current-user.decorator';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Global interceptor recording an audit row for every mutating request (POST/PUT/PATCH/DELETE)
 * with the acting user, tenant, route and response status. Read requests are not logged to keep
 * volume manageable. Writes are fire-and-forget so they never affect latency or failure modes.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only HTTP requests are audited here; GraphQL/other contexts are skipped.
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      headers: Record<string, string>;
      ip?: string;
      user?: AuthUser;
    }>();

    if (!MUTATING.has(req.method)) return next.handle();

    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const userId = req.user?.userId ?? null;
    const tenantId = this.tenantContext.get()?.tenantId ?? req.user?.tenantId ?? null;
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
        void this.audit.record({
          tenantId,
          userId,
          method: req.method,
          path,
          statusCode: res?.statusCode,
          ip: typeof ip === 'string' ? ip : undefined,
          userAgent,
        });
      }),
    );
  }
}
