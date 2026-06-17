import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailPort, SendEmailInput, SendEmailResult } from './email.port';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Free-first real delivery via SMTP (works with any provider: self-hosted Postfix, Gmail,
 * Mailgun, SES-SMTP, Brevo, etc. — no lock-in). nodemailer is loaded lazily via a non-literal
 * dynamic import, so it stays optional and the log default never requires it. Enable with
 * EMAIL_PROVIDER=smtp (nodemailer is declared as a dependency).
 */
@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private readonly cfg: SmtpConfig;
  private readonly defaultFrom: string;
  private transporter: any;

  constructor(config: ConfigService) {
    this.cfg = config.get<SmtpConfig>('email.smtp')!;
    this.defaultFrom = config.get<string>('email.from') ?? 'no-reply@platform.local';
  }

  private async ensureTransporter(): Promise<void> {
    if (this.transporter) return;
    const moduleName = 'nodemailer';
    let nodemailer: any;
    try {
      nodemailer = await import(/* webpackIgnore: true */ moduleName);
    } catch {
      throw new Error(
        `EMAIL_PROVIDER=smtp requires the dependency "${moduleName}". ` +
          `Install it with: npm i ${moduleName}`,
      );
    }
    this.transporter = (nodemailer.default ?? nodemailer).createTransport({
      host: this.cfg.host,
      port: this.cfg.port,
      secure: this.cfg.secure,
      auth: this.cfg.user ? { user: this.cfg.user, pass: this.cfg.pass } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    await this.ensureTransporter();
    const info = await this.transporter.sendMail({
      from: input.from ?? this.defaultFrom,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    const accepted = Array.isArray(info.accepted) ? info.accepted.length > 0 : true;
    this.logger.debug(`sent messageId=${info.messageId} accepted=${accepted}`);
    return { provider: this.name, messageId: info.messageId ?? 'unknown', accepted };
  }
}
