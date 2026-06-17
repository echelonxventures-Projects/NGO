/**
 * Capability port for transactional email (receipts, certificates, notifications, password
 * resets). Feature code depends only on this interface — never a vendor SDK. Swap the
 * implementation via EMAIL_PROVIDER (log | smtp) with no feature-code changes.
 */
export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Optional sender override; otherwise the configured EMAIL_FROM is used. */
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  provider: string;
  /** Provider message id when available (synthetic for the log adapter). */
  messageId: string;
  accepted: boolean;
}

export interface EmailPort {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
