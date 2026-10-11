import { env } from '../../../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Reminder when a scheduled meeting's start time is reached (or the room goes live). */
export function meetingReminderEmail(input: {
  inviteeEmail: string;
  meetingTitle: string;
  hostName: string;
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
  const company = input.companyName.trim() || 'your team';
  const subject = input.isLive
    ? `Reminder: “${input.meetingTitle}” is starting now on Samtal`
    : `Reminder: “${input.meetingTitle}” starts now on Samtal`;

  const text = [
    `Hi,`,
    '',
    `This is a reminder from ${company} on Samtal.`,
    '',
    `Meeting: ${input.meetingTitle}`,
    `Host: ${input.hostName}`,
    when ? `When: ${when}` : '',
    '',
    input.isLive
      ? 'The meeting is live — join now.'
      : 'It is time for your meeting — join now.',
    joinUrl,
    '',
    '— The Samtal team',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samtal reminder</p>
      <h2 style="margin:0 0 8px">${input.isLive ? 'Your meeting is starting' : 'It is time for your meeting'}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.55">
        Reminder from <strong>${escapeHtml(company)}</strong> — join
        <strong>${escapeHtml(input.meetingTitle)}</strong> on Samtal.
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
      <p style="margin:24px 0">
        <a href="${joinUrl}" style="display:inline-block;background:#016BE6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
          Join meeting
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Or open: ${escapeHtml(joinUrl)}</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samtal team</p>
    </div>`;

  return { subject, text, html };
}
