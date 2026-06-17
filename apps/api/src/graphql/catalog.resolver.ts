import { Args, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { CampaignGql, CourseGql, EventGql, ProductGql } from './models';

/**
 * Read-only GraphQL gateway over the core public catalog (courses, products, events,
 * campaigns). Tenant scoping is automatic via prisma.scoped() (tenant resolved by the same
 * middleware as REST). Queries are @Public; mutations remain on the REST surface.
 */
@Resolver()
export class CatalogResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Query(() => [CourseGql])
  async courses(): Promise<CourseGql[]> {
    const rows = await this.prisma.scoped().course.findMany({ where: { status: 'PUBLISHED' } });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary ?? undefined,
      price: c.price,
      currency: c.currency,
    }));
  }

  @Public()
  @Query(() => [ProductGql])
  async products(): Promise<ProductGql[]> {
    const rows = await this.prisma.scoped().product.findMany({ where: { status: 'ACTIVE' } });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? undefined,
      price: p.price,
      currency: p.currency,
    }));
  }

  @Public()
  @Query(() => [EventGql])
  async events(): Promise<EventGql[]> {
    const rows = await this.prisma.scoped().event.findMany({ where: { status: 'PUBLISHED' } });
    return rows.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      startsAt: e.startsAt,
      location: e.location ?? undefined,
    }));
  }

  @Public()
  @Query(() => [CampaignGql])
  async campaigns(): Promise<CampaignGql[]> {
    const rows = await this.prisma.scoped().campaign.findMany();
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      goalAmount: c.goalAmount,
      raisedAmount: c.raisedAmount,
      progressPct: c.goalAmount > 0 ? Math.round((c.raisedAmount / c.goalAmount) * 100) : 0,
    }));
  }
}
