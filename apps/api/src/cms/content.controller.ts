import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto, ScheduleContentDto } from './dto/update-content.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /** Admin/editor list (all statuses). */
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get()
  list(@Query('type') type?: string) {
    return this.content.list(type);
  }

  /** Public: only published content (for the public site). */
  @Public()
  @Get('published')
  listPublished(@Query('type') type?: string) {
    return this.content.listPublished(type);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreateContentDto) {
    return this.content.create(dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_PUBLISH)
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.content.publish(id);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_PUBLISH)
  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() dto: ScheduleContentDto) {
    return this.content.schedule(id, dto.publishAt);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_PUBLISH)
  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.content.unpublish(id);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get(':id/revisions')
  revisions(@Param('id') id: string) {
    return this.content.listRevisions(id);
  }

  /** Public read by type+slug (published only). */
  @Public()
  @Get(':type/:slug')
  getBySlug(
    @Param('type') type: string,
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return this.content.getBySlug(type, slug, locale, true);
  }
}
