import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { QrService } from '../common/qr/qr.service';
import { detectPlatform, resolveTarget } from './deep-link';
import { CreateSmartLinkDto, UpdateSmartLinkDto } from './dto/deeplink.dto';

/**
 * Deep linking / smart links. One short link resolves to platform-specific destinations
 * (Android deep link, iOS universal link, web) with campaign/referral attribution, QR
 * generation and click tracking. Works across web, apps and messaging/social shares.
 */
@Injectable()
export class DeepLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly qr: QrService,
  ) {}

  private readonly publicBaseUrl = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000';

  async create(dto: CreateSmartLinkDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const slug = dto.slug ?? this.generateSlug();
    const existing = await this.prisma.scoped().smartLink.findFirst({ where: { slug } });
    if (existing) throw new ConflictException('Slug already in use');
    const shareUrl = `${this.publicBaseUrl.replace(/\/$/, '')}/l/${slug}`;
    return this.prisma.scoped().smartLink.create({
      data: {
        tenantId,
        slug,
        targetUrl: dto.targetUrl,
        androidUrl: dto.androidUrl,
        iosUrl: dto.iosUrl,
        fallbackUrl: dto.fallbackUrl,
        title: dto.title,
        campaign: dto.campaign,
        referrerId: dto.referrerId,
        qrPayload: shareUrl,
      },
    });
  }

  list(campaign?: string) {
    return this.prisma.scoped().smartLink.findMany({
      where: campaign ? { campaign } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateSmartLinkDto) {
    await this.requireLink(id);
    return this.prisma.scoped().smartLink.update({
      where: { id },
      data: {
        targetUrl: dto.targetUrl ?? undefined,
        androidUrl: dto.androidUrl ?? undefined,
        iosUrl: dto.iosUrl ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  private async requireLink(id: string) {
    const link = await this.prisma.scoped().smartLink.findFirst({ where: { id } });
    if (!link) throw new NotFoundException('Link not found');
    return link;
  }

  async qrFor(id: string) {
    const link = await this.requireLink(id);
    return { slug: link.slug, payload: link.qrPayload, qrSvg: await this.qr.toSvg(link.qrPayload) };
  }

  /**
   * Resolves a slug for a request: detects platform from the user-agent, records a click and
   * returns the destination. Callers (web /l/:slug route) issue the actual HTTP redirect.
   */
  async resolve(slug: string, userAgent?: string, referrer?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const link = await this.prisma.scoped().smartLink.findFirst({ where: { slug, active: true } });
    if (!link) throw new NotFoundException('Link not found');

    const platform = detectPlatform(userAgent);
    const targetUrl = resolveTarget(link, platform);

    await this.prisma.scoped().smartLinkClick.create({
      data: { tenantId, linkId: link.id, platform, userAgent, referrer },
    });
    await this.prisma.scoped().smartLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    });

    return { targetUrl, platform, campaign: link.campaign, referrerId: link.referrerId };
  }

  async stats(id: string) {
    const link = await this.requireLink(id);
    const byPlatform = await this.prisma.scoped().smartLinkClick.groupBy({
      by: ['platform'],
      where: { linkId: id },
      _count: { _all: true },
    });
    return {
      slug: link.slug,
      clicks: link.clicks,
      byPlatform: byPlatform.map((b) => ({ platform: b.platform, count: b._count._all })),
    };
  }

  private generateSlug(): string {
    return randomBytes(5).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 7);
  }
}
