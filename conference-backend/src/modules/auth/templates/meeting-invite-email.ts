import { env } from '../../../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Guest invite email — join link carries the invited email so they only enter a display name. */
export function meetingInviteEmail(input: {
  inviteeEmail: string;
  meetingTitle: string;
  hostName: string;
  roomId: string;
  scheduledAt?: Date | string | null;
  isLive?: boolean;
}): { subject: string; text: string; html: string } {
  const joinUrl = `${env.FRONTEND_URL}/join/${encodeURIComponent(input.roomId)}?email=${encodeURIComponent(input.inviteeEmail)}`;
  const when = input.scheduledAt
    ? new Date(input.scheduledAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const subject = input.isLive
    ? `Join “${input.meetingTitle}” on Samhal now`
    : `You're invited to “${input.meetingTitle}” on Samhal`;

  const text = [
    `Hi,`,
    '',
    `${input.hostName} invited you to the meeting “${input.meetingTitle}” on Samhal.`,
    when ? `When: ${when}` : '',
    '',
    `This invitation is for ${input.inviteeEmail}. Open the link, enter your name, and join.`,
    joinUrl,
    '',
    '— The Samhal team',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samhal</p>
      <h2 style="margin:0 0 8px">${input.isLive ? 'Join the meeting' : "You're invited"}</h2>
      <p style="color:#475569">
        <strong>${escapeHtml(input.hostName)}</strong> invited you to
        <strong>${escapeHtml(input.meetingTitle)}</strong> on Samhal.
      </p>
      ${when ? `<p style="color:#475569">When: <strong>${escapeHtml(when)}</strong></p>` : ''}
      <p style="color:#475569">
        This invitation is for <strong>${escapeHtml(input.inviteeEmail)}</strong>.
        Open the link, enter your name, and join — no account required.
      </p>
      <p style="margin:24px 0">
        <a href="${joinUrl}" style="display:inline-block;background:#016BE6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
          ${input.isLive ? 'Join meeting' : 'Open invitation'}
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Or open: ${escapeHtml(joinUrl)}</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samhal team</p>
    </div>`;

  return { subject, text, html };
}
