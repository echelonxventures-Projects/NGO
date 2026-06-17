import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import {
  ChannelResult,
  NotificationChannelPort,
  OutboundNotification,
} from '../notification-channel.port';

/**
 * In-app channel. There is no external delivery: the persisted Notification row (written by
 * NotificationService) IS the delivery — the recipient reads it via the notifications API.
 * This adapter only validates that a recipient user is present.
 */
@Injectable()
export class InAppChannel implements NotificationChannelPort {
  readonly channel = NotificationChannel.IN_APP;

  async send(input: OutboundNotification): Promise<ChannelResult> {
    if (!input.userId) {
      return {
        channel: this.channel,
        status: 'failed',
        error: 'in-app notification requires a userId',
      };
    }
    return { channel: this.channel, status: 'sent' };
  }
}
