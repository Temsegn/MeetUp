import { env } from '../../../config/env';
import { UserRecord } from '../auth.types';

/**
 * Org self-register: verify email only (no password — they set it at signup).
 * Brand: Samhal.
 */
export function verificationEmail(user: UserRecord, token: string): {
  subject: string;
  text: string;
  html: string;
} {
  const url = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = user.name.split(' ')[0] || 'there';
  const subject = 'Verify your email — Samhal';
  const text = [
    `Hi ${firstName},`,
    '',
    'Thanks for registering your organization on Samhal.',
    'Please verify your email address by opening the link below:',
    '',
    url,
    '',
    'This link expires in 1 hour. After you verify, sign in with the password you created.',
    '',
    'If you did not create a Samhal account, you can safely ignore this email.',
    '',
    '— The Samhal team',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Verify your email</h2>
      <p style="color:#475569">Hi ${escapeHtml(firstName)}, thanks for registering your organization on <strong>Samhal</strong>.</p>
      <p style="color:#475569">Confirm your email address to activate your account, then sign in with the password you created.</p>
      <p style="margin:24px 0">
        <a href="${url}"
           style="background:#016BE6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Verify email address
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Or copy this link: <a href="${url}" style="color:#016BE6;word-break:break-all">${url}</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">
        This link expires in 1 hour. If you did not create a Samhal account, ignore this email.
      </p>
      <p style="color:#94a3b8;font-size:12px">— The Samhal team</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
