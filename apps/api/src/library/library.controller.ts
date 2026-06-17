import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Public } from '../auth/public.decorator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { BookmarkDto } from './dto/library.dto';

/**
 * Digital Library endpoints. Search and source listing are public (no auth); bookmarks and
 * recommendations are per-user.
 */
@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Public()
  @Get('sources')
  sources() {
    return { sources: this.library.listSources() };
  }

  @Public()
  @Get('search')
  search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('sources') sources?: string,
  ) {
    const only = sources ? sources.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.library.search(q ?? '', limit ? parseInt(limit, 10) : 20, only);
  }

  @Get('bookmarks')
  bookmarks(@CurrentUser() me: AuthUser) {
    return this.library.listBookmarks(me.userId);
  }

  @Post('bookmarks')
  addBookmark(@Body() dto: BookmarkDto, @CurrentUser() me: AuthUser) {
    return this.library.addBookmark(me.userId, dto);
  }

  @Delete('bookmarks/:id')
  removeBookmark(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.library.removeBookmark(me.userId, id);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() me: AuthUser) {
    return this.library.recommendations(me.userId);
  }
}
