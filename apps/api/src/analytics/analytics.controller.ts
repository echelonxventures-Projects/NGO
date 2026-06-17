import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { FunnelQueryDto, TrackEventDto } from './dto/analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Public ingestion endpoint (pageviews, client events). */
  @Public()
  @Post('track')
  track(@Body() dto: TrackEventDto) {
    return this.analytics.track(dto);
  }

  /** Authenticated ingestion (attributes the event to the user). */
  @Post('track/me')
  trackMe(@Body() dto: TrackEventDto, @CurrentUser() me: AuthUser) {
    return this.analytics.track(dto, me.userId);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('overview')
  overview(@Query('days') days?: string) {
    return this.analytics.overview(days ? parseInt(days, 10) : 30);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('timeseries')
  timeseries(@Query('type') type: string, @Query('days') days?: string) {
    return this.analytics.timeseries(type, days ? parseInt(days, 10) : 30);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('top-paths')
  topPaths(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.analytics.topPaths(limit ? parseInt(limit, 10) : 10, days ? parseInt(days, 10) : 30);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Post('funnel')
  funnel(@Body() dto: FunnelQueryDto, @Query('days') days?: string) {
    return this.analytics.funnel(dto.steps, days ? parseInt(days, 10) : 30);
  }
}
