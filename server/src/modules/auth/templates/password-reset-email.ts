import { env } from '../../../config/env';
import { UserRecord } from '../auth.types';

/** Password-reset template. The token expires after 30 minutes and is single-use. */
export function passwordResetEmail(user: UserRecord, token: string): {
  subject: string;
  text: string;
  html: string;
} {
  const url = `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your MeetSpace password';
  const text = [
    `Hi ${user.name},`,
    '',
    'We received a request to reset your MeetSpace password. Open the link below to choose a new one:',
    '',
    url,
    '',
    'This link expires in 30 minutes and can only be used once.',
    'If you did not request a password reset, you can safely ignore this email — your password will not change.',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Reset your password</h2>
      <p style="color:#475569">Hi ${escapeHtml(user.name)}, we received a request to reset your MeetSpace password.</p>
      <p style="margin:24px 0">
        <a href="${url}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Choose a new password
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Or copy this link: <a href="${url}" style="color:#2563eb;word-break:break-all">${url}</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">
        This link expires in 30 minutes and can only be used once. If you did not request a
        password reset, ignore this email — your password will not change.
      </p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
