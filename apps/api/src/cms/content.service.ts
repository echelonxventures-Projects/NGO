import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

/**
 * Dynamic CMS. `type` is a free string so tenants define custom content types with no code
 * change. All queries go through the tenant-scoped client, so tenantId is injected
 * automatically and cross-tenant reads are impossible.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  list(type?: string) {
    return this.prisma.scoped().content.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Public listing: only PUBLISHED items whose publishedAt has passed. */
  listPublished(type?: string) {
    return this.prisma.scoped().content.findMany({
      where: {
        ...(type ? { type } : {}),
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getById(id: string) {
    const item = await this.prisma.scoped().content.findFirst({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');
    return item;
  }

  async getBySlug(type: string, slug: string, locale = 'en', publishedOnly = false) {
    const item = await this.prisma.scoped().content.findFirst({
      where: {
        type,
        slug,
        locale,
        ...(publishedOnly ? { status: 'PUBLISHED', publishedAt: { lte: new Date() } } : {}),
      },
    });
    if (!item) throw new NotFoundException('Content not found');
    return item;
  }

  create(dto: CreateContentDto) {
    return this.prisma.scoped().content.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        type: dto.type,
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt,
        body: dto.body ?? {},
        locale: dto.locale ?? 'en',
        status: dto.status ?? 'DRAFT',
        seo: dto.seo ?? {},
      },
    });
  }

  /** Updates content fields and snapshots the prior state as a revision. */
  async update(id: string, dto: UpdateContentDto) {
    const current = await this.getById(id);
    await this.snapshot(current);
    return this.prisma.scoped().content.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        excerpt: dto.excerpt ?? undefined,
        body: (dto.body ?? undefined) as object | undefined,
        locale: dto.locale ?? undefined,
        seo: (dto.seo ?? undefined) as object | undefined,
      },
    });
  }

  /** Publish immediately. */
  async publish(id: string) {
    const current = await this.getById(id);
    await this.snapshot(current);
    return this.prisma.scoped().content.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  /** Schedule for future publication (becomes visible once publishAt passes). */
  async schedule(id: string, publishAt: string) {
    const when = new Date(publishAt);
    if (isNaN(when.getTime())) throw new BadRequestException('Invalid publishAt');
    const current = await this.getById(id);
    await this.snapshot(current);
    return this.prisma.scoped().content.update({
      where: { id },
      data: { status: 'SCHEDULED', publishedAt: when },
    });
  }

  async unpublish(id: string) {
    const current = await this.getById(id);
    await this.snapshot(current);
    return this.prisma.scoped().content.update({
      where: { id },
      data: { status: 'DRAFT', publishedAt: null },
    });
  }

  listRevisions(id: string) {
    return this.prisma.scoped().contentRevision.findMany({
      where: { contentId: id },
      orderBy: { version: 'desc' },
    });
  }

  /** Snapshots the current content state as the next revision version. */
  private async snapshot(content: {
    id: string;
    title: string;
    excerpt: string | null;
    body: unknown;
    seo: unknown;
    status: string;
    authorId: string | null;
  }) {
    const tenantId = this.tenantContext.requireTenantId();
    const count = await this.prisma.scoped().contentRevision.count({
      where: { contentId: content.id },
    });
    await this.prisma.scoped().contentRevision.create({
      data: {
        tenantId,
        contentId: content.id,
        version: count + 1,
        title: content.title,
        excerpt: content.excerpt,
        body: content.body as object,
        seo: content.seo as object,
        status: content.status,
        authorId: content.authorId,
      },
    });
  }
}
