import { Injectable, NotFoundException } from '@nestjs/common';
import { AdType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { AdContext, AdTargeting, ctr, matchTargeting, pickWeighted } from './ad-targeting';
import { CreateAdDto, CreatePlacementDto, UpdateAdDto } from './dto/ad.dto';

/**
 * Ad management: placements, ads with targeting, a serving endpoint that selects an eligible
 * ad by placement + request context (weighted rotation) and records impressions/clicks, plus
 * per-ad analytics (impressions, clicks, CTR).
 */
@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Placements ----------

  createPlacement(dto: CreatePlacementDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().adPlacement.create({
      data: { tenantId, key: dto.key, name: dto.name, description: dto.description },
    });
  }

  listPlacements() {
    return this.prisma.scoped().adPlacement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ---------- Ads ----------

  createAd(dto: CreateAdDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().ad.create({
      data: {
        tenantId,
        placementId: dto.placementId,
        name: dto.name,
        type: (dto.type as AdType) ?? 'BANNER',
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        html: dto.html,
        targetUrl: dto.targetUrl,
        weight: dto.weight ?? 1,
        active: dto.active ?? true,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        targeting: dto.targeting ?? {},
      },
    });
  }

  listAds() {
    return this.prisma.scoped().ad.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateAd(id: string, dto: UpdateAdDto) {
    await this.requireAd(id);
    return this.prisma.scoped().ad.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        active: dto.active ?? undefined,
        weight: dto.weight ?? undefined,
        targetUrl: dto.targetUrl ?? undefined,
        targeting: (dto.targeting ?? undefined) as object | undefined,
      },
    });
  }

  private async requireAd(id: string) {
    const ad = await this.prisma.scoped().ad.findFirst({ where: { id } });
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  // ---------- Serving ----------

  /**
   * Selects an eligible ad for a placement + request context and records an impression.
   * Eligibility: active, within date window, targeting matches. Weighted rotation among
   * eligible ads. Returns null when nothing matches.
   */
  async serve(placementKey: string, context: AdContext) {
    const tenantId = this.tenantContext.requireTenantId();
    const placement = await this.prisma.scoped().adPlacement.findFirst({
      where: { key: placementKey, active: true },
    });
    if (!placement) return null;

    const now = new Date();
    const ads = await this.prisma.scoped().ad.findMany({
      where: {
        placementId: placement.id,
        active: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
    });

    const eligible = ads.filter((a) => matchTargeting((a.targeting as AdTargeting) ?? {}, context));
    const chosen = pickWeighted(eligible.map((a) => ({ id: a.id, weight: a.weight })));
    if (!chosen) return null;
    const ad = eligible.find((a) => a.id === chosen.id)!;

    await this.prisma.scoped().adImpression.create({
      data: { tenantId, adId: ad.id, context: context as object },
    });
    await this.prisma.scoped().ad.update({
      where: { id: ad.id },
      data: { impressions: { increment: 1 } },
    });
    return ad;
  }

  async recordClick(id: string, context: AdContext) {
    const tenantId = this.tenantContext.requireTenantId();
    const ad = await this.requireAd(id);
    await this.prisma.scoped().adClick.create({
      data: { tenantId, adId: id, context: context as object },
    });
    await this.prisma.scoped().ad.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return { targetUrl: ad.targetUrl };
  }

  // ---------- Analytics ----------

  async stats(id: string) {
    const ad = await this.requireAd(id);
    return {
      adId: ad.id,
      name: ad.name,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ctr(ad.impressions, ad.clicks),
    };
  }
}
