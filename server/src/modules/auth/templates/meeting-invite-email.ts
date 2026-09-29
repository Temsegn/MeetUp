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
  /** Workspace / company name shown as the inviting organization. */
  companyName: string;
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
  const company = input.companyName.trim() || 'a team';
  const subject = input.isLive
    ? `${company} invited you to join “${input.meetingTitle}” on Samhal`
    : `${company} invited you to “${input.meetingTitle}” on Samhal`;

  const text = [
    `Hi,`,
    '',
    `${company} invited you to a meeting on the Samhal platform.`,
    '',
    `Meeting: ${input.meetingTitle}`,
    `Host: ${input.hostName}`,
    when ? `When: ${when}` : '',
    '',
    `This invitation is for ${input.inviteeEmail}. Open the link below, enter your name, and join.`,
    joinUrl,
    '',
    '— The Samhal team',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samhal</p>
      <h2 style="margin:0 0 8px">${input.isLive ? 'Join the meeting' : "You're invited to a meeting"}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.55">
        <strong>${escapeHtml(company)}</strong> invited you to a meeting on the
        <strong>Samhal</strong> platform.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#F8FAFC;border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:14px 16px;color:#64748b;font-size:12px;width:88px;vertical-align:top">Meeting</td>
          <td style="padding:14px 16px;color:#0f172a;font-size:14px;font-weight:600">${escapeHtml(input.meetingTitle)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;color:#64748b;font-size:12px;vertical-align:top">Host</td>
          <td style="padding:0 16px 14px;color:#0f172a;font-size:14px">${escapeHtml(input.hostName)}</td>
        </tr>
        ${
          when
            ? `<tr>
          <td style="padding:0 16px 14px;color:#64748b;font-size:12px;vertical-align:top">When</td>
          <td style="padding:0 16px 14px;color:#0f172a;font-size:14px">${escapeHtml(when)}</td>
        </tr>`
            : ''
        }
      </table>
      <p style="color:#475569;font-size:14px;line-height:1.55">
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
