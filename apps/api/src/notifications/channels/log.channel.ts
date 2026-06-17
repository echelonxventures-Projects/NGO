import { Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import {
  ChannelResult,
  NotificationChannelPort,
  OutboundNotification,
} from '../notification-channel.port';

/**
 * Free-first default for channels without a real provider yet (SMS, WhatsApp, Push, Telegram).
 * "Delivers" by logging, so those channels are wired and demoable end-to-end with zero
 * external services. Replace with a real adapter (Twilio, FCM, etc.) for the same channel —
 * the dispatcher and feature code stay unchanged.
 */
export class LogChannel implements NotificationChannelPort {
  private readonly logger = new Logger('Notification');

  constructor(readonly channel: NotificationChannel) {}

  async send(input: OutboundNotification): Promise<ChannelResult> {
    this.logger.log(
      `[NOTIFY:${this.channel}] to=${input.to ?? input.userId ?? 'n/a'} ` +
        `type=${input.type} title="${input.title}"`,
    );
    return { channel: this.channel, status: 'sent', ref: `log_${this.channel.toLowerCase()}` };
  }
}
