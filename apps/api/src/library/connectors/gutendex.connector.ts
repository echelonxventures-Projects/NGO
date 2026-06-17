import { Injectable, Logger } from '@nestjs/common';
import { LibraryResource, LibrarySource } from '../library-source.port';

interface GutendexBook {
  id?: number;
  title?: string;
  authors?: { name?: string }[];
  formats?: Record<string, string>;
  copyright?: boolean | null;
}

/**
 * Project Gutenberg via Gutendex (https://gutendex.com) — free, key-less. ~70k public-domain
 * books with direct read links (HTML/EPUB/text).
 */
@Injectable()
export class GutendexConnector implements LibrarySource {
  readonly name = 'gutenberg';
  private readonly logger = new Logger(GutendexConnector.name);

  async search(query: string, limit: number): Promise<LibraryResource[]> {
    try {
      const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { results?: GutendexBook[] };
      return GutendexConnector.map(data.results ?? []).slice(0, limit);
    } catch (err) {
      this.logger.warn(`gutenberg search failed: ${(err as Error).message}`);
      return [];
    }
  }

  static map(books: GutendexBook[]): LibraryResource[] {
    return books
      .filter((b) => b.id && b.title)
      .map((b) => {
        const readUrl =
          b.formats?.['text/html'] ??
          b.formats?.['application/epub+zip'] ??
          `https://www.gutenberg.org/ebooks/${b.id}`;
        return {
          source: 'gutenberg',
          externalId: String(b.id),
          title: b.title!,
          authors: (b.authors ?? []).map((a) => a.name ?? '').filter(Boolean),
          url: readUrl,
          thumbnailUrl: b.formats?.['image/jpeg'],
          format: 'book',
          license: b.copyright ? 'Copyrighted' : 'Public Domain',
        };
      });
  }
}
