import { env } from '../../../config/env';
import { UserRecord } from '../auth.types';

/**
 * Org self-register: verify email only (password set at signup).
 * Brand: Samtal.
 */
export function verificationEmail(user: UserRecord, token: string): {
  subject: string;
  text: string;
  html: string;
} {
  const url = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = user.name.split(' ')[0] || 'there';
  const subject = 'Verify your email — Samtal';
  const text = [
    `Hi ${firstName},`,
    '',
    'Thanks for registering your organization on Samtal.',
    'Please verify your email address by opening the link below:',
    '',
    url,
    '',
    'This link expires in 1 hour. After you verify, sign in with the password you created to access your organization.',
    '',
    'If you did not create a Samtal account, you can safely ignore this email.',
    '',
    '— The Samtal team',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samtal</p>
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#475569">Hi ${escapeHtml(firstName)}, thanks for registering your organization on <strong>Samtal</strong>.</p>
      <p style="color:#475569">Confirm your email to activate your organization account, then sign in with the password you created.</p>
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
        This link expires in 1 hour. If you did not create a Samtal account, ignore this email.
      </p>
      <p style="color:#94a3b8;font-size:12px">— The Samtal team</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
