import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { BLOCK_LIBRARY, PageBlock, validateBlocks } from './block-library';
import {
  CreatePageDto,
  CreateThemeDto,
  ImportThemeDto,
  SchedulePageDto,
  UpdatePageDto,
} from './dto/website.dto';

/**
 * Website + theme builder. Pages are block-based (drag-and-drop) with drafts, publishing,
 * scheduling and revision history. Themes are token bundles (colors/fonts) that can be created,
 * cloned, activated, imported and exported — a free, self-hosted theme marketplace primitive.
 */
@Injectable()
export class WebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Block library ----------

  blockLibrary() {
    return BLOCK_LIBRARY;
  }

  // ---------- Pages ----------

  async createPage(dto: CreatePageDto) {
    const tenantId = this.tenantContext.requireTenantId();
    this.assertBlocks(dto.blocks ?? []);
    const existing = await this.prisma.scoped().page.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Page slug already in use');
    return this.prisma.scoped().page.create({
      data: {
        tenantId,
        slug: dto.slug,
        title: dto.title,
        blocks: (dto.blocks ?? []) as object,
        seo: dto.seo ?? {},
      },
    });
  }

  listPages() {
    return this.prisma.scoped().page.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  private async requirePage(id: string) {
    const page = await this.prisma.scoped().page.findFirst({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  /** Updates a page and snapshots the previous block state as a revision. */
  async updatePage(id: string, dto: UpdatePageDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const page = await this.requirePage(id);
    if (dto.blocks) this.assertBlocks(dto.blocks);

    await this.prisma.scoped().pageRevision.create({
      data: { tenantId, pageId: id, version: page.version, blocks: page.blocks as object },
    });

    return this.prisma.scoped().page.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        blocks: (dto.blocks ?? undefined) as object | undefined,
        seo: (dto.seo ?? undefined) as object | undefined,
        version: { increment: 1 },
      },
    });
  }

  async publishPage(id: string) {
    await this.requirePage(id);
    return this.prisma.scoped().page.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), scheduledAt: null },
    });
  }

  async schedulePage(id: string, dto: SchedulePageDto) {
    await this.requirePage(id);
    return this.prisma.scoped().page.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt: new Date(dto.scheduledAt) },
    });
  }

  revisions(pageId: string) {
    return this.prisma.scoped().pageRevision.findMany({
      where: { pageId },
      orderBy: { version: 'desc' },
    });
  }

  /** Public render: returns a published page + the active theme tokens for the renderer. */
  async render(slug: string) {
    const now = new Date();
    const page = await this.prisma.scoped().page.findFirst({
      where: {
        slug,
        OR: [
          { status: 'PUBLISHED' },
          { status: 'SCHEDULED', scheduledAt: { lte: now } },
        ],
      },
    });
    if (!page) throw new NotFoundException('Page not found');
    const theme = await this.prisma.scoped().theme.findFirst({ where: { isActive: true } });
    return { page, theme: theme?.tokens ?? {} };
  }

  // ---------- Themes ----------

  createTheme(dto: CreateThemeDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().theme.create({
      data: { tenantId, slug: dto.slug, name: dto.name, tokens: dto.tokens ?? {} },
    });
  }

  listThemes() {
    return this.prisma.scoped().theme.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async activateTheme(id: string) {
    const theme = await this.prisma.scoped().theme.findFirst({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    await this.prisma.scoped().theme.updateMany({ data: { isActive: false } });
    return this.prisma.scoped().theme.update({ where: { id }, data: { isActive: true } });
  }

  /** Export a theme as a portable JSON bundle. */
  async exportTheme(id: string) {
    const theme = await this.prisma.scoped().theme.findFirst({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    return { slug: theme.slug, name: theme.name, version: theme.version, tokens: theme.tokens };
  }

  /** Import a theme bundle (clones with a new slug if needed). */
  async importTheme(dto: ImportThemeDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const exists = await this.prisma.scoped().theme.findFirst({ where: { slug: dto.slug } });
    const slug = exists ? `${dto.slug}-${Date.now().toString(36)}` : dto.slug;
    return this.prisma.scoped().theme.create({
      data: { tenantId, slug, name: dto.name, tokens: dto.tokens, source: 'imported' },
    });
  }

  async cloneTheme(id: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const theme = await this.prisma.scoped().theme.findFirst({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    return this.prisma.scoped().theme.create({
      data: {
        tenantId,
        slug: `${theme.slug}-copy-${Date.now().toString(36)}`,
        name: `${theme.name} (copy)`,
        tokens: theme.tokens as object,
        source: theme.source,
      },
    });
  }

  private assertBlocks(blocks: PageBlock[]) {
    const result = validateBlocks(blocks);
    if (!result.valid) throw new BadRequestException(result.errors.join('; '));
  }
}
