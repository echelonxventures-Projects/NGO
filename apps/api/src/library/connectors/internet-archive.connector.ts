import { Injectable, Logger } from '@nestjs/common';
import { LibraryResource, LibrarySource } from '../library-source.port';

interface IaDoc {
  identifier?: string;
  title?: string;
  creator?: string | string[];
  year?: number | string;
  mediatype?: string;
}

/**
 * Internet Archive (https://archive.org) — free, key-less advancedsearch API. Federates
 * texts, audio and video. Thumbnails are served from archive.org/services/img/<id>.
 */
@Injectable()
export class InternetArchiveConnector implements LibrarySource {
  readonly name = 'internet-archive';
  private readonly logger = new Logger(InternetArchiveConnector.name);

  async search(query: string, limit: number): Promise<LibraryResource[]> {
    try {
      const url =
        `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}` +
        `&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=mediatype` +
        `&rows=${limit}&page=1&output=json`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { response?: { docs?: IaDoc[] } };
      return InternetArchiveConnector.map(data.response?.docs ?? []);
    } catch (err) {
      this.logger.warn(`internet-archive search failed: ${(err as Error).message}`);
      return [];
    }
  }

  static map(docs: IaDoc[]): LibraryResource[] {
    return docs
      .filter((d) => d.identifier && d.title)
      .map((d) => ({
        source: 'internet-archive',
        externalId: d.identifier!,
        title: Array.isArray(d.title) ? d.title.join(' ') : d.title!,
        authors: d.creator ? (Array.isArray(d.creator) ? d.creator : [d.creator]) : [],
        url: `https://archive.org/details/${d.identifier}`,
        thumbnailUrl: `https://archive.org/services/img/${d.identifier}`,
        format: d.mediatype ?? 'text',
        license: 'Open',
        year: d.year ? Number(d.year) || undefined : undefined,
      }));
  }
}
