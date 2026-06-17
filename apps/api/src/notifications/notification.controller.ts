import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  // ---- Recipient inbox (any authenticated user) ----

  /** Current user's in-app notifications. `?unreadOnly=true` filters to unread. */
  @Get('me')
  listMine(@CurrentUser() me: AuthUser, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.listForUser(me.userId, unreadOnly === 'true');
  }

  @Get('me/unread-count')
  async unreadCount(@CurrentUser() me: AuthUser) {
    return { count: await this.notifications.unreadCount(me.userId) };
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.notifications.markRead(id, me.userId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() me: AuthUser) {
    return this.notifications.markAllRead(me.userId);
  }

  // ---- Admin ----

  /** Channels currently registered (diagnostics / admin UI). */
  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Get('channels')
  channels() {
    return { channels: this.notifications.availableChannels() };
  }

  /** Dispatch a notification (admin/test). Returns per-channel delivery results. */
  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post('send')
  send(@Body() dto: SendNotificationDto) {
    return this.notifications.notify({
      type: dto.type ?? 'admin.test',
      title: dto.title,
      body: dto.body,
      userId: dto.userId,
      to: dto.to,
      channels: dto.channels,
    });
  }
}
