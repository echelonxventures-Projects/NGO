import { NotificationChannel } from '@prisma/client';

/**
 * Multi-binding token: every channel adapter registers under this token, and
 * NotificationService builds a `channel -> adapter` registry from the injected array.
 * Add a new channel by providing another adapter — no dispatcher changes required.
 */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');

/** A single notification to deliver on one or more channels. */
export interface OutboundNotification {
  /** Event/template key, e.g. "user.welcome", "donation.receipt". */
  type: string;
  title: string;
  body: string;
  /** Optional rich HTML body (used by the email channel; others fall back to `body`). */
  html?: string;
  /** Recipient user id — required for IN_APP; optional for external channels. */
  userId?: string | null;
  /** External address: email / phone / device token / webhook URL, per channel. */
  to?: string | null;
  /** Structured payload (links, ids, CTA) persisted with the notification. */
  data?: Record<string, unknown>;
}

export interface ChannelResult {
  channel: NotificationChannel;
  status: 'sent' | 'failed';
  /** Provider/message reference or persisted notification id when available. */
  ref?: string;
  error?: string;
}

/**
 * Capability port for a delivery channel. Feature code never depends on a concrete channel;
 * it calls NotificationService, which fans out to the registered NotificationChannelPort
 * implementations. Swap/extend channels freely (in-app, email, SMS, push, webhook, ...).
 */
export interface NotificationChannelPort {
  readonly channel: NotificationChannel;
  send(input: OutboundNotification): Promise<ChannelResult>;
}
