import { OpenLibraryConnector } from './connectors/openlibrary.connector';
import { GutendexConnector } from './connectors/gutendex.connector';
import { InternetArchiveConnector } from './connectors/internet-archive.connector';

describe('Library connectors (pure mapping)', () => {
  it('maps Open Library docs to unified resources', () => {
    const out = OpenLibraryConnector.map([
      { key: '/works/OL1W', title: 'Gravity', author_name: ['Newton'], cover_i: 42, first_publish_year: 1687, ia: ['x'] },
      { title: 'no key — dropped' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      source: 'openlibrary',
      externalId: '/works/OL1W',
      title: 'Gravity',
      authors: ['Newton'],
      url: 'https://openlibrary.org/works/OL1W',
      year: 1687,
      license: 'Open',
    });
    expect(out[0].thumbnailUrl).toContain('covers.openlibrary.org');
  });

  it('maps Gutendex books and prefers an HTML read link', () => {
    const out = GutendexConnector.map([
      {
        id: 1342,
        title: 'Pride and Prejudice',
        authors: [{ name: 'Austen, Jane' }],
        formats: { 'text/html': 'https://gutenberg.org/1342.html', 'image/jpeg': 'cover.jpg' },
        copyright: false,
      },
    ]);
    expect(out[0]).toMatchObject({
      source: 'gutenberg',
      externalId: '1342',
      url: 'https://gutenberg.org/1342.html',
      license: 'Public Domain',
    });
  });

  it('maps Internet Archive docs incl. array creators', () => {
    const out = InternetArchiveConnector.map([
      { identifier: 'abc', title: 'Lecture', creator: ['A', 'B'], mediatype: 'movies', year: '2001' },
    ]);
    expect(out[0]).toMatchObject({
      source: 'internet-archive',
      externalId: 'abc',
      authors: ['A', 'B'],
      url: 'https://archive.org/details/abc',
      format: 'movies',
      year: 2001,
    });
  });
});

describe('Library connector resilience', () => {
  it('returns [] when the upstream fetch fails', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    try {
      const out = await new OpenLibraryConnector().search('x', 5);
      expect(out).toEqual([]);
    } finally {
      global.fetch = original;
    }
  });
});
