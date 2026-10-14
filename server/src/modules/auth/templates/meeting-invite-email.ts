import { env } from '../../../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function formatWhen(
  scheduledAt: Date | string | null | undefined,
  timezone?: string | null,
): string | null {
  if (!scheduledAt) return null;
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone && timezone.trim() ? timezone : undefined,
    });
  } catch {
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
}

export type MeetingInviteEmailKind = 'invite' | 'update' | 'cancel';

/** Guest / attendee invite email — join link carries the invited email. */
export function meetingInviteEmail(input: {
  inviteeEmail: string;
  meetingTitle: string;
  hostName: string;
  /** Workspace / company name shown as the inviting organization. */
  companyName: string;
  roomId: string;
  scheduledAt?: Date | string | null;
  endsAt?: Date | string | null;
  timezone?: string | null;
  location?: string | null;
  isLive?: boolean;
  kind?: MeetingInviteEmailKind;
}): { subject: string; text: string; html: string; joinUrl: string } {
  const joinUrl = `${env.FRONTEND_URL}/join/${encodeURIComponent(input.roomId)}?email=${encodeURIComponent(input.inviteeEmail)}`;
  const when = formatWhen(input.scheduledAt, input.timezone);
  const ends = formatWhen(input.endsAt, input.timezone);
  const company = input.companyName.trim() || 'a team';
  const kind = input.kind ?? 'invite';
  const tzNote = input.timezone?.trim() ? ` (${input.timezone.trim()})` : '';

  const subject =
    kind === 'cancel'
      ? `Cancelled: “${input.meetingTitle}” on Samtal`
      : kind === 'update'
        ? `Updated: “${input.meetingTitle}” on Samtal`
        : input.isLive
          ? `${company} invited you to join “${input.meetingTitle}” on Samtal`
          : `${company} invited you to “${input.meetingTitle}” on Samtal`;

  const headline =
    kind === 'cancel'
      ? 'Meeting cancelled'
      : kind === 'update'
        ? 'Meeting updated'
        : input.isLive
          ? 'Join the meeting'
          : "You're invited to a meeting";

  const intro =
    kind === 'cancel'
      ? `${company} cancelled a meeting on the Samtal platform.`
      : kind === 'update'
        ? `${company} updated a meeting on the Samtal platform. Your calendar invite was refreshed.`
        : `${company} invited you to a meeting on the Samtal platform. A calendar invitation (.ics) is attached.`;

  const text = [
    `Hi,`,
    '',
    intro,
    '',
    `Meeting: ${input.meetingTitle}`,
    `Host: ${input.hostName}`,
    when ? `When: ${when}${tzNote}` : '',
    ends ? `Ends: ${ends}${tzNote}` : '',
    input.location?.trim() ? `Location: ${input.location.trim()}` : '',
    '',
    kind === 'cancel'
      ? `This cancellation is for ${input.inviteeEmail}.`
      : `This invitation is for ${input.inviteeEmail}. Open the link below, enter your name, and join.`,
    kind === 'cancel' ? '' : joinUrl,
    '',
    '— The Samtal team',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em">Samtal</p>
      <h2 style="margin:0 0 8px">${escapeHtml(headline)}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.55">
        ${escapeHtml(intro)}
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
          <td style="padding:0 16px 14px;color:#0f172a;font-size:14px">${escapeHtml(when)}${escapeHtml(tzNote)}</td>
        </tr>`
            : ''
        }
        ${
          ends
            ? `<tr>
          <td style="padding:0 16px 14px;color:#64748b;font-size:12px;vertical-align:top">Ends</td>
          <td style="padding:0 16px 14px;color:#0f172a;font-size:14px">${escapeHtml(ends)}${escapeHtml(tzNote)}</td>
        </tr>`
            : ''
        }
        ${
          input.location?.trim()
            ? `<tr>
          <td style="padding:0 16px 14px;color:#64748b;font-size:12px;vertical-align:top">Location</td>
          <td style="padding:0 16px 14px;color:#0f172a;font-size:14px">${escapeHtml(input.location.trim())}</td>
        </tr>`
            : ''
        }
      </table>
      ${
        kind === 'cancel'
          ? `<p style="color:#475569;font-size:14px;line-height:1.55">
        This cancellation is for <strong>${escapeHtml(input.inviteeEmail)}</strong>.
      </p>`
          : `<p style="color:#475569;font-size:14px;line-height:1.55">
        This invitation is for <strong>${escapeHtml(input.inviteeEmail)}</strong>.
        Open the link, enter your name, and join — no account required.
        A calendar invite is attached for Google Calendar, Outlook, and other apps.
      </p>
      <p style="margin:24px 0">
        <a href="${joinUrl}" style="display:inline-block;background:#016BE6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
          ${input.isLive ? 'Join meeting' : 'Open invitation'}
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Or open: ${escapeHtml(joinUrl)}</p>`
      }
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">— The Samtal team</p>
    </div>`;

  return { subject, text, html, joinUrl };
}
