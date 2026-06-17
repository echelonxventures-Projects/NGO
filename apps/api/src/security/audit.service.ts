import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  method: string;
  path: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

/**
 * Persists audit/activity log entries. Uses the base (unscoped) Prisma client because audit
 * rows may belong to no tenant (pre-tenant routes) and must be written regardless of the
 * request's tenant context. Writes are best-effort and never throw into the request path.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          method: entry.method,
          path: entry.path,
          statusCode: entry.statusCode,
          ip: entry.ip,
          userAgent: entry.userAgent,
          meta: (entry.meta ?? {}) as object,
        },
      });
    } catch (err) {
      this.logger.warn(`audit write failed: ${(err as Error).message}`);
    }
  }

  list(tenantId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
