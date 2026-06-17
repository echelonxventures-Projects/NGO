import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AdsService } from './ads.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AdContext } from './ad-targeting';
import { CreateAdDto, CreatePlacementDto, UpdateAdDto } from './dto/ad.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  // ---------- Public serving ----------

  @Public()
  @Get('serve')
  serve(@Query('placement') placement: string, @Query() query: Record<string, string>) {
    const context: AdContext = {
      country: query.country,
      state: query.state,
      city: query.city,
      language: query.language,
      device: query.device,
      role: query.role,
      membership: query.membership,
    };
    return this.ads.serve(placement, context);
  }

  @Public()
  @Post(':id/click')
  click(@Param('id') id: string, @Body() context: AdContext) {
    return this.ads.recordClick(id, context ?? {});
  }

  // ---------- Management ----------

  @RequirePermissions(PERMISSIONS.AD_WRITE)
  @Post('placements')
  createPlacement(@Body() dto: CreatePlacementDto) {
    return this.ads.createPlacement(dto);
  }

  @RequirePermissions(PERMISSIONS.AD_READ)
  @Get('placements')
  placements() {
    return this.ads.listPlacements();
  }

  @RequirePermissions(PERMISSIONS.AD_WRITE)
  @Post()
  create(@Body() dto: CreateAdDto) {
    return this.ads.createAd(dto);
  }

  @RequirePermissions(PERMISSIONS.AD_READ)
  @Get()
  list() {
    return this.ads.listAds();
  }

  @RequirePermissions(PERMISSIONS.AD_WRITE)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.ads.updateAd(id, dto);
  }

  @RequirePermissions(PERMISSIONS.AD_READ)
  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.ads.stats(id);
  }
}
