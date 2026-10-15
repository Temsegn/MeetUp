import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Email delivery.
 *
 *  - When SMTP_HOST is configured: real delivery via nodemailer.
 *  - Otherwise: a console transport that logs a short summary
 *    so every flow is exercisable in development without a mail server.
 *
 * Callers should await `send` and handle failures for invite-critical mail.
 */

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailIcalEvent {
  method: 'REQUEST' | 'CANCEL' | 'PUBLISH' | 'REPLY';
  content: string;
  filename?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
  /** Nodemailer calendar MIME part (text/calendar; method=…). */
  icalEvent?: EmailIcalEvent;
  /** Prefer no-reply so invitation replies do not bounce into a monitored inbox. */
  replyTo?: string;
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
  async send(
    message: EmailMessage,
  ): Promise<{ delivered: boolean; mode: 'smtp' | 'console'; messageId?: string }> {
    const t = getTransporter();
    if (!t) {
      logger.info('📧 [dev email transport — set SMTP_HOST/SMTP_USER/SMTP_PASS for real mail]', {
        to: message.to,
        subject: message.subject,
        hasIcal: Boolean(message.icalEvent),
        attachmentCount: message.attachments?.length ?? 0,
        textPreview: message.text.slice(0, 240),
      });
      return { delivered: false, mode: 'console' };
    }
    try {
      const info = await t.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        replyTo: message.replyTo ?? 'no-reply@samtal.cc',
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
        icalEvent: message.icalEvent
          ? {
              method: message.icalEvent.method,
              content: message.icalEvent.content,
              filename: message.icalEvent.filename ?? 'invite.ics',
            }
          : undefined,
      });
      logger.info('Email sent', {
        to: message.to,
        subject: message.subject,
        messageId: info.messageId,
        hasIcal: Boolean(message.icalEvent),
      });
      return { delivered: true, mode: 'smtp', messageId: info.messageId };
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      logger.error('Email send failed', {
        to: message.to,
        subject: message.subject,
        err: raw,
        code,
      });
      const hint =
        code === 'EAUTH' || /Username and Password not accepted|BadCredentials|Invalid login/i.test(raw)
          ? 'Gmail rejected SMTP login. Turn on 2-Step Verification, create a new App Password, and set SMTP_USER/SMTP_PASS in server/.env (no spaces in the password).'
          : 'Could not send email. Check SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM).';
      throw new EmailDeliveryError(hint, err);
    }
  },
};
