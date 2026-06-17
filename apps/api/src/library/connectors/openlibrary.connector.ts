import { Injectable, Logger } from '@nestjs/common';
import { LibraryResource, LibrarySource } from '../library-source.port';

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ia?: string[];
}

/**
 * Open Library (https://openlibrary.org) — free, key-less. Returns book records; many are
 * readable/borrowable. Cover images are served from covers.openlibrary.org.
 */
@Injectable()
export class OpenLibraryConnector implements LibrarySource {
  readonly name = 'openlibrary';
  private readonly logger = new Logger(OpenLibraryConnector.name);

  async search(query: string, limit: number): Promise<LibraryResource[]> {
    try {
      const url =
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}` +
        `&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,ia`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
      return OpenLibraryConnector.map(data.docs ?? []);
    } catch (err) {
      this.logger.warn(`openlibrary search failed: ${(err as Error).message}`);
      return [];
    }
  }

  static map(docs: OpenLibraryDoc[]): LibraryResource[] {
    return docs
      .filter((d) => d.key && d.title)
      .map((d) => ({
        source: 'openlibrary',
        externalId: d.key!,
        title: d.title!,
        authors: d.author_name ?? [],
        url: `https://openlibrary.org${d.key}`,
        thumbnailUrl: d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : undefined,
        format: 'book',
        license: d.ia?.length ? 'Open' : undefined,
        year: d.first_publish_year,
      }));
  }
}
