import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { WebsiteService } from './website.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import {
  CreatePageDto,
  CreateThemeDto,
  ImportThemeDto,
  SchedulePageDto,
  UpdatePageDto,
} from './dto/website.dto';

@Controller()
export class WebsiteController {
  constructor(private readonly website: WebsiteService) {}

  // ---------- Block library ----------

  @Public()
  @Get('builder/blocks')
  blocks() {
    return this.website.blockLibrary();
  }

  // ---------- Pages ----------

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post('pages')
  createPage(@Body() dto: CreatePageDto) {
    return this.website.createPage(dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('pages')
  pages() {
    return this.website.listPages();
  }

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Put('pages/:id')
  updatePage(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.website.updatePage(id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_PUBLISH)
  @Post('pages/:id/publish')
  publishPage(@Param('id') id: string) {
    return this.website.publishPage(id);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_PUBLISH)
  @Post('pages/:id/schedule')
  schedulePage(@Param('id') id: string, @Body() dto: SchedulePageDto) {
    return this.website.schedulePage(id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('pages/:id/revisions')
  revisions(@Param('id') id: string) {
    return this.website.revisions(id);
  }

  @Public()
  @Get('render/:slug')
  render(@Param('slug') slug: string) {
    return this.website.render(slug);
  }

  // ---------- Themes ----------

  @Public()
  @Get('themes')
  themes() {
    return this.website.listThemes();
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Post('themes')
  createTheme(@Body() dto: CreateThemeDto) {
    return this.website.createTheme(dto);
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Post('themes/:id/activate')
  activateTheme(@Param('id') id: string) {
    return this.website.activateTheme(id);
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Get('themes/:id/export')
  exportTheme(@Param('id') id: string) {
    return this.website.exportTheme(id);
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Post('themes/import')
  importTheme(@Body() dto: ImportThemeDto) {
    return this.website.importTheme(dto);
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Post('themes/:id/clone')
  cloneTheme(@Param('id') id: string) {
    return this.website.cloneTheme(id);
  }
}
