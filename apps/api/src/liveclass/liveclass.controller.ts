import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { LiveClassService } from './liveclass.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { CreateLiveSessionDto, UpdateLiveStatusDto } from './dto/liveclass.dto';

@Controller('live')
export class LiveClassController {
  constructor(private readonly live: LiveClassService) {}

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('sessions')
  schedule(@Body() dto: CreateLiveSessionDto, @CurrentUser() me: AuthUser) {
    return this.live.schedule(me.userId, dto);
  }

  @Get('sessions')
  upcoming(@Query('courseId') courseId?: string) {
    return this.live.upcoming(courseId);
  }

  @Get('sessions/:id')
  get(@Param('id') id: string) {
    return this.live.get(id);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Put('sessions/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateLiveStatusDto) {
    return this.live.setStatus(id, dto);
  }

  @Post('sessions/:id/join')
  join(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.live.join(id, me.userId);
  }

  @Post('sessions/:id/leave')
  leave(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.live.leave(id, me.userId);
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('sessions/:id/attendance')
  attendance(@Param('id') id: string) {
    return this.live.attendance(id);
  }
}
