import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LIBRARY_SOURCES } from './library-source.port';
import { OpenLibraryConnector } from './connectors/openlibrary.connector';
import { GutendexConnector } from './connectors/gutendex.connector';
import { InternetArchiveConnector } from './connectors/internet-archive.connector';

/**
 * Digital Library federation module. Connectors are aggregated under the LIBRARY_SOURCES
 * token and consumed by LibraryService as a registry — add a new free source (NDLI, SWAYAM,
 * NPTEL, OpenStax, OER Commons, Wikibooks, ...) by implementing LibrarySource and listing it
 * here; no service/controller changes required.
 */
@Module({
  controllers: [LibraryController],
  providers: [
    LibraryService,
    OpenLibraryConnector,
    GutendexConnector,
    InternetArchiveConnector,
    {
      provide: LIBRARY_SOURCES,
      inject: [OpenLibraryConnector, GutendexConnector, InternetArchiveConnector],
      useFactory: (
        openLibrary: OpenLibraryConnector,
        gutenberg: GutendexConnector,
        archive: InternetArchiveConnector,
      ) => [openLibrary, gutenberg, archive],
    },
  ],
  exports: [LibraryService],
})
export class LibraryModule {}
