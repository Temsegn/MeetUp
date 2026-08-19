import { UserRecord } from '../auth.types';

/** Welcome email sent right after account creation. */
export function welcomeEmail(user: UserRecord): { subject: string; text: string; html: string } {
  const subject = `Welcome to MeetSpace, ${user.name.split(' ')[0]}!`;
  const text = [
    `Hi ${user.name},`,
    '',
    'Welcome to MeetSpace! Your account is ready.',
    '',
    'Next step: verify your email address using the verification email we just sent,',
    'then start or join a meeting.',
    '',
    '— The MeetSpace team',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Welcome to MeetSpace 🎉</h2>
      <p style="color:#475569">Hi ${escapeHtml(user.name)}, your account is ready to go.</p>
      <p style="color:#475569">
        Please verify your email address using the verification email we just sent, then
        start or join your first meeting.
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The MeetSpace team</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
