import { Inject, Injectable } from '@nestjs/common';
import { LIBRARY_SOURCES, LibraryResource, LibrarySource } from './library-source.port';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { BookmarkDto } from './dto/library.dto';

/**
 * Digital Library service. Federates a query across all registered free public sources in
 * parallel and merges the results. Bookmarks are tenant+user scoped. Recommendations are
 * derived from the user's most-bookmarked authors/titles (no external dependency).
 */
@Injectable()
export class LibraryService {
  constructor(
    @Inject(LIBRARY_SOURCES) private readonly sources: LibrarySource[],
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  listSources() {
    return this.sources.map((s) => s.name);
  }

  /**
   * Unified search. `only` optionally restricts to named sources. Each source has a per-source
   * limit; results are interleaved round-robin so no single source dominates the top.
   */
  async search(query: string, limit = 20, only?: string[]): Promise<{ total: number; results: LibraryResource[] }> {
    const active = only?.length
      ? this.sources.filter((s) => only.includes(s.name))
      : this.sources;
    const perSource = Math.max(5, Math.ceil(limit / Math.max(1, active.length)));

    const settled = await Promise.all(active.map((s) => s.search(query, perSource)));
    const merged = this.interleave(settled).slice(0, limit);
    return { total: merged.length, results: merged };
  }

  // ---------- Bookmarks ----------

  listBookmarks(userId: string) {
    return this.prisma.scoped().libraryBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addBookmark(userId: string, dto: BookmarkDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().libraryBookmark.upsert({
      where: {
        tenantId_userId_source_externalId: {
          tenantId,
          userId,
          source: dto.source,
          externalId: dto.externalId,
        },
      },
      create: {
        tenantId,
        userId,
        source: dto.source,
        externalId: dto.externalId,
        title: dto.title,
        authors: dto.authors ?? [],
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl,
        format: dto.format,
        license: dto.license,
      },
      update: { title: dto.title, url: dto.url },
    });
  }

  async removeBookmark(userId: string, id: string) {
    await this.prisma.scoped().libraryBookmark.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  /** Recommendations: re-search the user's most frequent bookmarked author/title terms. */
  async recommendations(userId: string, limit = 10): Promise<LibraryResource[]> {
    const bookmarks = await this.prisma.scoped().libraryBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (bookmarks.length === 0) return [];
    const terms = new Map<string, number>();
    for (const b of bookmarks) {
      const authors = (b.authors as string[]) ?? [];
      const seed = authors[0] ?? b.title.split(' ').slice(0, 2).join(' ');
      if (seed) terms.set(seed, (terms.get(seed) ?? 0) + 1);
    }
    const topTerm = [...terms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topTerm) return [];
    const bookmarkedIds = new Set(bookmarks.map((b) => `${b.source}:${b.externalId}`));
    const { results } = await this.search(topTerm, limit + bookmarks.length);
    return results.filter((r) => !bookmarkedIds.has(`${r.source}:${r.externalId}`)).slice(0, limit);
  }

  /** Round-robin merge so each source contributes fairly to the top of the list. */
  private interleave(lists: LibraryResource[][]): LibraryResource[] {
    const out: LibraryResource[] = [];
    const max = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) {
      for (const list of lists) {
        if (list[i]) out.push(list[i]);
      }
    }
    return out;
  }
}
