import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

export interface ResolvedTenant {
  tenantId: string;
  slug: string;
}

/**
 * Resolves a request to a tenant. Resolution precedence:
 *   1. trusted tenant header (internal calls)
 *   2. custom domain (exact hostname match)
 *   3. subdomain of PLATFORM_BASE_DOMAIN
 *   4. DEFAULT_TENANT_SLUG (dev only; null disables)
 *
 * Uses a raw PrismaClient (not the tenant-scoped one) because resolution happens
 * BEFORE a tenant context exists.
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly raw = new PrismaClient();
  private readonly CACHE_TTL = 60; // seconds

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  get tenantHeader(): string {
    return this.config.get<string>('tenancy.tenantHeader')!;
  }

  async resolveFromHostOrHeader(
    host: string | undefined,
    headerSlug: string | undefined,
  ): Promise<ResolvedTenant | null> {
    if (headerSlug) {
      return this.resolveBySlug(headerSlug);
    }
    const hostname = (host ?? '').split(':')[0].toLowerCase().trim();
    if (!hostname) {
      return this.resolveDefault();
    }

    const cacheKey = `tenant:host:${hostname}`;
    const cached = await this.safeCacheGet(cacheKey);
    if (cached) return JSON.parse(cached) as ResolvedTenant;

    // 2. custom domain exact match
    const domain = await this.raw.domain.findUnique({
      where: { hostname },
      select: { tenantId: true, tenant: { select: { slug: true, status: true } } },
    });
    if (domain && domain.tenant.status === 'ACTIVE') {
      const resolved = { tenantId: domain.tenantId, slug: domain.tenant.slug };
      await this.safeCacheSet(cacheKey, JSON.stringify(resolved));
      return resolved;
    }

    // 3. subdomain of base domain
    const base = this.config.get<string>('tenancy.baseDomain')!;
    if (hostname.endsWith(`.${base}`)) {
      const slug = hostname.slice(0, -1 * (base.length + 1));
      const resolved = await this.resolveBySlug(slug);
      if (resolved) {
        await this.safeCacheSet(cacheKey, JSON.stringify(resolved));
        return resolved;
      }
    }

    // 4. default tenant (dev)
    return this.resolveDefault();
  }

  private async resolveBySlug(slug: string): Promise<ResolvedTenant | null> {
    const tenant = await this.raw.tenant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: { id: true, slug: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') return null;
    return { tenantId: tenant.id, slug: tenant.slug };
  }

  private async resolveDefault(): Promise<ResolvedTenant | null> {
    const slug = this.config.get<string | null>('tenancy.defaultTenantSlug');
    if (!slug) return null;
    return this.resolveBySlug(slug);
  }

  private async safeCacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeCacheSet(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value, this.CACHE_TTL);
    } catch {
      /* cache is best-effort */
    }
  }
}
