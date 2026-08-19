import { env } from '../../../config/env';
import { UserRecord } from '../auth.types';

/**
 * Email-verification template. The link embeds the opaque single-use token
 * in the query string; the reset page submits it to the API.
 */
export function verificationEmail(user: UserRecord, token: string): {
  subject: string;
  text: string;
  html: string;
} {
  const url = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your email address';
  const text = [
    `Hi ${user.name},`,
    '',
    'Thanks for signing up for MeetSpace. Please verify your email address by opening the link below:',
    '',
    url,
    '',
    'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Verify your email</h2>
      <p style="color:#475569">Hi ${escapeHtml(user.name)}, thanks for signing up for MeetSpace.</p>
      <p style="color:#475569">Confirm your email address to activate your account:</p>
      <p style="margin:24px 0">
        <a href="${url}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Verify email address
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Or copy this link: <a href="${url}" style="color:#2563eb;word-break:break-all">${url}</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">
        This link expires in 24 hours. If you did not create a MeetSpace account, ignore this email.
      </p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
