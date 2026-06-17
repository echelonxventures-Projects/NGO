/**
 * Digital Library federation port. Each connector wraps a free, public, key-less educational
 * resource API (Open Library, Project Gutenberg via Gutendex, Internet Archive, ...) and maps
 * its results onto the unified LibraryResource shape. The library service fans out across all
 * registered sources and merges the results — no vendor lock-in, free-first by design.
 */

export interface LibraryResource {
  /** Connector name, e.g. "openlibrary" | "gutenberg" | "internet-archive". */
  source: string;
  /** Stable id within the source (used for bookmarking). */
  externalId: string;
  title: string;
  authors: string[];
  description?: string;
  /** Canonical URL to view/read the resource. */
  url: string;
  thumbnailUrl?: string;
  /** Media kind, e.g. "book" | "text" | "audio" | "video". */
  format?: string;
  /** Rights, e.g. "Public Domain" | "Creative Commons" | "Open". */
  license?: string;
  year?: number;
}

export interface LibrarySource {
  readonly name: string;
  /** Must never throw — return [] on error so one failing source cannot break federation. */
  search(query: string, limit: number): Promise<LibraryResource[]>;
}

export const LIBRARY_SOURCES = Symbol('LIBRARY_SOURCES');
