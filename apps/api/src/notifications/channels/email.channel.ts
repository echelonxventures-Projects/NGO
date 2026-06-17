import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { EMAIL_PORT, EmailPort } from '../../providers/email/email.port';
import {
  ChannelResult,
  NotificationChannelPort,
  OutboundNotification,
} from '../notification-channel.port';

/**
 * Email channel — delivers through the configured EmailPort (log/SMTP). Reuses the provider
 * abstraction already in place, so switching email providers needs no notification changes.
 */
@Injectable()
export class EmailChannel implements NotificationChannelPort {
  readonly channel = NotificationChannel.EMAIL;

  constructor(@Inject(EMAIL_PORT) private readonly email: EmailPort) {}

  async send(input: OutboundNotification): Promise<ChannelResult> {
    if (!input.to) {
      return { channel: this.channel, status: 'failed', error: 'email notification requires a "to" address' };
    }
    try {
      const res = await this.email.send({
        to: input.to,
        subject: input.title,
        html: input.html ?? input.body,
        text: input.body,
      });
      return {
        channel: this.channel,
        status: res.accepted ? 'sent' : 'failed',
        ref: res.messageId,
      };
    } catch (e) {
      return { channel: this.channel, status: 'failed', error: (e as Error).message };
    }
  }
}
