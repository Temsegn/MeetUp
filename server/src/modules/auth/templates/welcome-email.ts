import { UserRecord } from '../auth.types';

/** Welcome email sent right after organization signup. Brand: Samtal. */
export function welcomeEmail(
  user: UserRecord,
  opts?: { organizationName?: string },
): { subject: string; text: string; html: string } {
  const firstName = user.name.split(' ')[0] || 'there';
  const org = opts?.organizationName?.trim();
  const subject = `Welcome to Samtal, ${firstName}!`;
  const orgLine = org
    ? `Your organization “${org}” is almost ready on Samtal.`
    : 'Your organization account is almost ready on Samtal.';
  const text = [
    `Hi ${firstName},`,
    '',
    'Welcome to Samtal!',
    orgLine,
    '',
    'Next steps:',
    '1. Verify your email with the link we sent you.',
    '2. Sign in with the password you created.',
    '3. Invite teammates and start meeting.',
    '',
    '— The Samtal team',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samtal</p>
      <h2 style="margin:0 0 8px">Welcome to Samtal</h2>
      <p style="color:#475569">Hi ${escapeHtml(firstName)},</p>
      <p style="color:#475569">${escapeHtml(orgLine)}</p>
      <p style="color:#475569">Verify your email with the link we sent, then sign in with the password you created to invite teammates and start meeting.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samtal team</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
