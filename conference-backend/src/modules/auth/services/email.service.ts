import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Email delivery.
 *
 *  - When SMTP_HOST is configured: real delivery via nodemailer.
 *  - Otherwise: a console transport that logs the full rendered email
 *    (including verification/reset links) so every flow is exercisable in
 *    development without a mail server.
 *
 * Sending failures are logged and swallowed by callers — email must never
 * break the auth request path.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export const emailService = {
  async send(message: EmailMessage): Promise<void> {
    const t = getTransporter();
    if (!t) {
      logger.info('📧 [dev email transport]', {
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return;
    }
    await t.sendMail({ from: env.EMAIL_FROM, to: message.to, subject: message.subject, text: message.text, html: message.html });
  },
};
