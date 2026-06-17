import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  ChannelResult,
  NOTIFICATION_CHANNELS,
  NotificationChannelPort,
  OutboundNotification,
} from './notification-channel.port';

export interface NotifyInput extends OutboundNotification {
  /** Channels to deliver on. Defaults are derived from the recipient data when omitted. */
  channels?: NotificationChannel[];
}

/**
 * Dispatcher for the multi-channel notifications platform. Feature code calls `notify(...)`
 * and the service fans out to the registered channel adapters, persisting one Notification
 * row per channel attempt (the IN_APP row IS the user-facing delivery; other rows form an
 * outbox/audit trail). Delivery is best-effort and isolated per channel — one failing
 * channel never affects the others or the caller.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly registry: Map<NotificationChannel, NotificationChannelPort>;

  constructor(
    @Inject(NOTIFICATION_CHANNELS) channels: NotificationChannelPort[],
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {
    this.registry = new Map(channels.map((c) => [c.channel, c]));
  }

  /** Channels available in the registry (useful for diagnostics / admin UIs). */
  availableChannels(): NotificationChannel[] {
    return Array.from(this.registry.keys());
  }

  /** Sensible default channels when the caller doesn't specify them. */
  private defaultChannels(input: NotifyInput): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    if (input.userId) channels.push(NotificationChannel.IN_APP);
    if (input.to?.includes('@')) channels.push(NotificationChannel.EMAIL);
    return channels.length ? channels : [NotificationChannel.IN_APP];
  }

  async notify(input: NotifyInput): Promise<ChannelResult[]> {
    const channels = input.channels?.length ? input.channels : this.defaultChannels(input);
    const results: ChannelResult[] = [];

    for (const channel of channels) {
      const adapter = this.registry.get(channel);
      let result: ChannelResult;
      if (!adapter) {
        result = { channel, status: 'failed', error: `no adapter registered for ${channel}` };
      } else {
        try {
          result = await adapter.send(input);
        } catch (e) {
          result = { channel, status: 'failed', error: (e as Error).message };
        }
      }
      const persistedId = await this.persist(channel, input, result);
      if (persistedId && !result.ref) result.ref = persistedId;
      results.push(result);
    }
    return results;
  }

  /** Persists the per-channel record. Never throws — persistence failure is logged only. */
  private async persist(
    channel: NotificationChannel,
    input: NotifyInput,
    result: ChannelResult,
  ): Promise<string | null> {
    try {
      const row = await this.prisma.scoped().notification.create({
        data: {
          tenantId: this.tenantContext.requireTenantId(),
          userId: input.userId ?? null,
          channel,
          status: result.status === 'sent' ? 'SENT' : 'FAILED',
          type: input.type,
          title: input.title,
          body: input.body,
          data: (input.data ?? {}) as Prisma.InputJsonValue,
          to: input.to ?? null,
          error: result.error ?? null,
          sentAt: result.status === 'sent' ? new Date() : null,
        },
      });
      return row.id;
    } catch (e) {
      this.logger.warn(`notification persist skipped (${channel}): ${(e as Error).message}`);
      return null;
    }
  }

  // ---- In-app inbox (recipient-facing) ----

  /** Lists a user's in-app notifications (most recent first). `unreadOnly` filters to unread. */
  listForUser(userId: string, unreadOnly = false) {
    return this.prisma.scoped().notification.findMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.scoped().notification.count({
      where: { userId, channel: NotificationChannel.IN_APP, readAt: null },
    });
  }

  /** Marks a single in-app notification read. Scoped to the owner (no cross-user access). */
  async markRead(id: string, userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.scoped().notification.updateMany({
      where: { id, userId, channel: NotificationChannel.IN_APP, readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
    return { updated: res.count };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.scoped().notification.updateMany({
      where: { userId, channel: NotificationChannel.IN_APP, readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
    return { updated: res.count };
  }
}
