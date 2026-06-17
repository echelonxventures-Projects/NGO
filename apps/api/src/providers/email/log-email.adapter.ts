import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EmailPort, SendEmailInput, SendEmailResult } from './email.port';

/**
 * Free-first default. "Sends" email by logging it — zero external services, so the platform
 * runs and every email-triggering flow is demoable out of the box. Swap to real delivery via
 * EMAIL_PROVIDER=smtp with no feature-code changes.
 */
@Injectable()
export class LogEmailAdapter implements EmailPort {
  readonly name = 'log';
  private readonly logger = new Logger('Email');

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const to = Array.isArray(input.to) ? input.to.join(', ') : input.to;
    const messageId = `log_${randomUUID()}`;
    this.logger.log(
      `[EMAIL:log] to=${to} subject="${input.subject}" ` +
        `attachments=${input.attachments?.length ?? 0} messageId=${messageId}`,
    );
    return { provider: this.name, messageId, accepted: true };
  }
}
