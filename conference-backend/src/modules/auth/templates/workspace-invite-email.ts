import { env } from '../../../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/**
 * Combined workspace invite email (Samhal):
 * accept invitation + verify email (when needed) + temporary password in one message.
 */
export function workspaceInviteEmail(input: {
  inviteeName: string;
  workspaceName: string;
  inviterName: string;
  email: string;
  temporaryPassword: string | null;
  token: string;
  role: string;
  /** When set, invite link also verifies email in one click. */
  verifyToken?: string | null;
}): { subject: string; text: string; html: string } {
  const verifyQ = input.verifyToken
    ? `&verify=${encodeURIComponent(input.verifyToken)}`
    : '';
  const joinUrl = `${env.FRONTEND_URL}/auth/invite?token=${encodeURIComponent(input.token)}${verifyQ}`;
  const firstName = input.inviteeName.split(' ')[0] || 'there';
  const subject = `You're invited to ${input.workspaceName} on Samhal`;

  const tempLines = input.temporaryPassword
    ? [
        '',
        'Temporary password (you will set a new one after opening the link):',
        input.temporaryPassword,
      ]
    : [];

  const verifyNote = input.verifyToken
    ? 'This one link verifies your email and lets you accept the invitation.'
    : 'Open the link below to accept the invitation.';

  const text = [
    `Hi ${firstName},`,
    '',
    `${input.inviterName} invited you to join the workspace "${input.workspaceName}" on Samhal as a ${input.role}.`,
    '',
    `Your sign-in email: ${input.email}`,
    ...tempLines,
    '',
    verifyNote,
    joinUrl,
    '',
    'This invitation expires in 1 hour.',
    '',
    '— The Samhal team',
  ].join('\n');

  const tempHtml = input.temporaryPassword
    ? `<p style="color:#475569;margin-top:16px">Temporary password (set a new one after you open the link):</p>
       <p style="font-size:18px;font-weight:700;letter-spacing:0.04em;background:#F1F5F9;padding:12px 16px;border-radius:10px;display:inline-block">${escapeHtml(input.temporaryPassword)}</p>`
    : '';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samhal</p>
      <h2 style="margin:0 0 8px">You're invited to ${escapeHtml(input.workspaceName)}</h2>
      <p style="color:#475569">
        Hi ${escapeHtml(firstName)}, <strong>${escapeHtml(input.inviterName)}</strong> invited you to join
        their workspace <strong>${escapeHtml(input.workspaceName)}</strong> on Samhal as a
        <strong>${escapeHtml(input.role)}</strong>.
      </p>
      <p style="color:#475569">Sign-in email: <strong>${escapeHtml(input.email)}</strong></p>
      ${tempHtml}
      <p style="color:#475569;margin-top:16px">${escapeHtml(verifyNote)}</p>
      <p style="margin:24px 0">
        <a href="${joinUrl}" style="display:inline-block;background:#016BE6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
          Accept invitation
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Or open: ${escapeHtml(joinUrl)}</p>
      <p style="color:#94a3b8;font-size:12px">This invitation expires in 1 hour.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samhal team</p>
    </div>`;

  return { subject, text, html };
}
