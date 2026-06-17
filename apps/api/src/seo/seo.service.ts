import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  articleSchema,
  courseSchema,
  eventSchema,
  organizationSchema,
  productSchema,
} from './structured-data';

/**
 * Builds Schema.org JSON-LD for live tenant entities. Public/read-only; consumed by the
 * Next.js renderer to inject <script type="application/ld+json"> per page.
 */
@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async organization() {
    const branding = await this.prisma.scoped().tenantBranding.findFirst();
    const social = (branding?.socialLinks as Record<string, string>) ?? {};
    const extra = (branding?.extra as Record<string, unknown>) ?? {};
    return organizationSchema({
      name: branding?.shortName ?? (extra.name as string) ?? 'Organization',
      logo: branding?.logoUrl ?? undefined,
      url: (extra.url as string) ?? undefined,
      sameAs: Object.values(social).filter(Boolean),
      isNgo: true,
    });
  }

  async event(slug: string) {
    const e = await this.prisma.scoped().event.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!e) throw new NotFoundException('Event not found');
    return eventSchema({
      name: e.title,
      startDate: e.startsAt.toISOString(),
      endDate: e.endsAt?.toISOString(),
      location: e.location ?? undefined,
      mode: e.mode,
      description: e.description ?? undefined,
    });
  }

  async course(slug: string) {
    const c = await this.prisma.scoped().course.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!c) throw new NotFoundException('Course not found');
    return courseSchema({ name: c.title, description: c.summary ?? undefined });
  }

  async product(slug: string) {
    const p = await this.prisma.scoped().product.findFirst({ where: { slug, status: 'ACTIVE' } });
    if (!p) throw new NotFoundException('Product not found');
    return productSchema({
      name: p.title,
      description: p.description ?? undefined,
      image: p.imageUrl ?? undefined,
      priceMinor: p.price,
      currency: p.currency,
      available: p.stock === null || p.stock === undefined ? true : p.stock > 0,
    });
  }

  async article(slug: string) {
    const a = await this.prisma.scoped().content.findFirst({
      where: { slug, status: 'PUBLISHED' },
    });
    if (!a) throw new NotFoundException('Article not found');
    return articleSchema({
      headline: a.title,
      description: a.excerpt ?? undefined,
      datePublished: a.publishedAt?.toISOString(),
    });
  }
}
