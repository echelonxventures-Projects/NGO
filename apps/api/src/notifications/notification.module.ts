import { Global, Module } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NOTIFICATION_CHANNELS, NotificationChannelPort } from './notification-channel.port';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { WebhookChannel } from './channels/webhook.channel';
import { LogChannel } from './channels/log.channel';

/**
 * Multi-channel notifications platform. All channel adapters are aggregated under the
 * NOTIFICATION_CHANNELS token and consumed by NotificationService as a registry. Channels
 * without a real provider yet (SMS/WhatsApp/Push/Telegram) use the free-first LogChannel —
 * swap any of them for a real adapter (Twilio, FCM, ...) without touching feature code.
 *
 * @Global so any module can inject NotificationService.
 */
@Global()
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    InAppChannel,
    EmailChannel,
    WebhookChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      inject: [InAppChannel, EmailChannel, WebhookChannel],
      useFactory: (
        inApp: InAppChannel,
        email: EmailChannel,
        webhook: WebhookChannel,
      ): NotificationChannelPort[] => [
        inApp,
        email,
        webhook,
        // Free-first log-backed channels for providers not yet integrated.
        new LogChannel(NotificationChannel.SMS),
        new LogChannel(NotificationChannel.WHATSAPP),
        new LogChannel(NotificationChannel.PUSH),
        new LogChannel(NotificationChannel.TELEGRAM),
      ],
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
