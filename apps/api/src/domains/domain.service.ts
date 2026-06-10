import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { RedisService } from '../redis/redis.service';

/**
 * Domain management for a tenant: add custom domains/subdomains, verify ownership via a DNS
 * TXT record, mark a primary, and remove. Verifying or changing domains invalidates the
 * tenant-resolution cache so routing picks up the change immediately.
 */
@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);
  // Dev/testing convenience: allow manual token-echo verification (never enable in prod).
  private readonly allowManual = process.env.DOMAIN_VERIFY_ALLOW_MANUAL === 'true';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly redis: RedisService,
  ) {}

  list() {
    return this.prisma.scoped().domain.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** Adds a domain in PENDING state and returns the DNS TXT record to publish. */
  async add(hostname: string) {
    const host = hostname.toLowerCase().trim();
    const token = randomBytes(16).toString('hex');
    const domain = await this.prisma.scoped().domain.create({
      data: { tenantId: this.tenantContext.requireTenantId(), hostname: host, verifyToken: token, status: 'PENDING' },
    });
    return { domain, dnsRecord: this.dnsRecord(host, token) };
  }

  /** The TXT record the tenant must publish to prove ownership. */
  private dnsRecord(hostname: string, token: string) {
    return { type: 'TXT', name: `_dxp-verify.${hostname}`, value: `dxp-verify=${token}` };
  }

  /**
   * Verifies ownership by resolving the _dxp-verify TXT record and matching the token.
   * On success: status VERIFIED and the resolution cache for the host is invalidated.
   */
  async verify(id: string, manualToken?: string) {
    const domain = await this.requireDomain(id);
    if (!domain.verifyToken) throw new BadRequestException('Domain has no verification token');

    const expected = `dxp-verify=${domain.verifyToken}`;
    let verified = false;

    try {
      const records = await dns.resolveTxt(`_dxp-verify.${domain.hostname}`);
      const flat = records.map((r) => r.join(''));
      verified = flat.includes(expected);
    } catch (e) {
      this.logger.warn(`DNS TXT lookup failed for ${domain.hostname}: ${(e as Error).message}`);
    }

    // Dev-only fallback so the flow is testable without controlling DNS.
    if (!verified && this.allowManual && manualToken && manualToken === domain.verifyToken) {
      verified = true;
    }

    const updated = await this.prisma.scoped().domain.update({
      where: { id },
      data: { status: verified ? 'VERIFIED' : 'FAILED' },
    });
    await this.invalidate(domain.hostname);
    return { verified, domain: updated, expectedRecord: this.dnsRecord(domain.hostname, domain.verifyToken) };
  }

  /** Marks one domain primary (and clears the flag on the tenant's other domains). */
  async setPrimary(id: string) {
    const domain = await this.requireDomain(id);
    if (domain.status !== 'VERIFIED') {
      throw new BadRequestException('Only a VERIFIED domain can be made primary');
    }
    const tenantId = this.tenantContext.requireTenantId();
    await this.prisma.scoped().domain.updateMany({ where: { tenantId }, data: { isPrimary: false } });
    const updated = await this.prisma.scoped().domain.update({ where: { id }, data: { isPrimary: true } });
    await this.invalidate(domain.hostname);
    return updated;
  }

  async remove(id: string) {
    const domain = await this.requireDomain(id);
    await this.prisma.scoped().domain.delete({ where: { id } });
    await this.invalidate(domain.hostname);
    return { deleted: true, id };
  }

  private async requireDomain(id: string) {
    const domain = await this.prisma.scoped().domain.findFirst({ where: { id } });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  /** Clears the tenant-resolution cache entry for a host (best-effort). */
  private async invalidate(hostname: string) {
    try {
      await this.redis.del(`tenant:host:${hostname.toLowerCase()}`);
    } catch {
      /* cache invalidation is best-effort */
    }
  }
}
