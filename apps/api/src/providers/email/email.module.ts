import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PORT, EmailPort } from './email.port';
import { LogEmailAdapter } from './log-email.adapter';
import { SmtpEmailAdapter } from './smtp-email.adapter';

/**
 * Binds EMAIL_PORT to the adapter selected by EMAIL_PROVIDER (env). Falls back to the free
 * log adapter so the platform always runs. Add more adapters (ses, sendgrid) to the switch —
 * no feature code changes required.
 */
@Global()
@Module({
  providers: [
    LogEmailAdapter,
    SmtpEmailAdapter,
    {
      provide: EMAIL_PORT,
      inject: [ConfigService, LogEmailAdapter, SmtpEmailAdapter],
      useFactory: (
        config: ConfigService,
        log: LogEmailAdapter,
        smtp: SmtpEmailAdapter,
      ): EmailPort => {
        const provider = config.get<string>('providers.email') ?? 'log';
        switch (provider) {
          case 'smtp':
            return smtp;
          case 'log':
          default:
            return log;
        }
      },
    },
  ],
  exports: [EMAIL_PORT],
})
export class EmailModule {}
