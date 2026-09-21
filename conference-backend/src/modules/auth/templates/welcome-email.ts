import { UserRecord } from '../auth.types';

/** Welcome email sent right after organization signup (no password). Brand: Samhal. */
export function welcomeEmail(user: UserRecord): { subject: string; text: string; html: string } {
  const firstName = user.name.split(' ')[0] || 'there';
  const subject = `Welcome to Samhal, ${firstName}!`;
  const text = [
    `Hi ${firstName},`,
    '',
    'Welcome to Samhal! Your organization account is almost ready.',
    '',
    'Next step: verify your email using the verification link we sent,',
    'then sign in with the password you created.',
    '',
    '— The Samhal team',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Welcome to Samhal</h2>
      <p style="color:#475569">Hi ${escapeHtml(firstName)}, your organization account is almost ready.</p>
      <p style="color:#475569">
        Please verify your email using the verification link we sent, then sign in with the password you created.
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samhal team</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
