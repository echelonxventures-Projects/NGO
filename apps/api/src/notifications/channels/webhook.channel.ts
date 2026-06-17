import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import {
  ChannelResult,
  NotificationChannelPort,
  OutboundNotification,
} from '../notification-channel.port';

/**
 * Webhook channel — POSTs the notification as JSON to a tenant/integration-supplied URL
 * (`to`). Lets external systems (Slack/Discord relays, CRMs, automations) subscribe to
 * platform events without any vendor-specific code here.
 */
@Injectable()
export class WebhookChannel implements NotificationChannelPort {
  readonly channel = NotificationChannel.WEBHOOK;

  async send(input: OutboundNotification): Promise<ChannelResult> {
    if (!input.to) {
      return { channel: this.channel, status: 'failed', error: 'webhook notification requires a "to" URL' };
    }
    try {
      const res = await fetch(input.to, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data ?? {},
          sentAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        return { channel: this.channel, status: 'failed', error: `HTTP ${res.status}` };
      }
      return { channel: this.channel, status: 'sent', ref: String(res.status) };
    } catch (e) {
      return { channel: this.channel, status: 'failed', error: (e as Error).message };
    }
  }
}
