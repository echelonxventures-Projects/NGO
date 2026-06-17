import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { DeepLinkService } from './deeplink.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { CreateSmartLinkDto, UpdateSmartLinkDto } from './dto/deeplink.dto';

@Controller('links')
export class DeepLinkController {
  constructor(private readonly links: DeepLinkService) {}

  // ---------- Public resolution ----------

  @Public()
  @Get('resolve/:slug')
  resolve(
    @Param('slug') slug: string,
    @Headers('user-agent') ua?: string,
    @Headers('referer') referrer?: string,
  ) {
    return this.links.resolve(slug, ua, referrer);
  }

  // ---------- Management ----------

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreateSmartLinkDto) {
    return this.links.create(dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get()
  list(@Query('campaign') campaign?: string) {
    return this.links.list(campaign);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSmartLinkDto) {
    return this.links.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get(':id/qr')
  qr(@Param('id') id: string) {
    return this.links.qrFor(id);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.links.stats(id);
  }
}
