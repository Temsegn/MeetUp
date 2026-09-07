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
 * Callers should await `send` and handle failures for invite-critical mail.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailDeliveryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    const hasAuth = Boolean(env.SMTP_USER && env.SMTP_PASS);
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? false,
      auth: hasAuth
        ? {
            user: env.SMTP_USER!,
            pass: env.SMTP_PASS!,
          }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

export const emailService = {
  async send(message: EmailMessage): Promise<{ delivered: boolean; mode: 'smtp' | 'console' }> {
    const t = getTransporter();
    if (!t) {
      logger.info('📧 [dev email transport — set SMTP_HOST/SMTP_USER/SMTP_PASS for real mail]', {
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return { delivered: false, mode: 'console' };
    }
    try {
      const info = await t.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      logger.info('Email sent', {
        to: message.to,
        subject: message.subject,
        messageId: info.messageId,
      });
      return { delivered: true, mode: 'smtp' };
    } catch (err) {
      logger.error('Email send failed', {
        to: message.to,
        subject: message.subject,
        err: err instanceof Error ? err.message : String(err),
      });
      throw new EmailDeliveryError(
        'Could not send email. Check SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM).',
        err,
      );
    }
  },
};
