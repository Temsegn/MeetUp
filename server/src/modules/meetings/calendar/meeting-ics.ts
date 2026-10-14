import ical, { ICalAttendeeStatus, ICalCalendarMethod, ICalEventStatus } from 'ical-generator';
import { env } from '../../../config/env';

export type CalendarInviteMethod = 'REQUEST' | 'CANCEL';

export interface MeetingCalendarInput {
  calendarUid: string;
  sequence: number;
  title: string;
  description?: string;
  location?: string;
  /** UTC start */
  start: Date;
  /** UTC end */
  end: Date;
  timezone?: string;
  roomId: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  method: CalendarInviteMethod;
  joinUrl?: string;
}

export function meetingJoinUrl(roomId: string, inviteeEmail?: string): string {
  const base = `${env.FRONTEND_URL}/join/${encodeURIComponent(roomId)}`;
  if (!inviteeEmail) return base;
  return `${base}?email=${encodeURIComponent(inviteeEmail)}`;
}

export function ensureCalendarUid(meetingId: string, existing?: string | null): string {
  if (existing && existing.trim()) return existing.trim();
  return `${meetingId}@meet.samtal.cc`;
}

export function meetingEndAt(start: Date, durationMinutes: number): Date {
  const raw = Number(durationMinutes);
  const mins = Number.isFinite(raw) && raw >= 1 ? raw : 30;
  return new Date(start.getTime() + Math.max(1, mins) * 60_000);
}

/** Build RFC 5545 calendar payload for a single attendee. */
export function buildMeetingIcs(input: MeetingCalendarInput): {
  filename: string;
  content: string;
  method: CalendarInviteMethod;
  contentType: string;
} {
  const joinUrl =
    input.joinUrl ?? meetingJoinUrl(input.roomId, input.attendeeEmail);
  const descParts = [
    (input.description || '').trim(),
    `Join: ${joinUrl}`,
  ].filter(Boolean);

  const calendar = ical({
    name: 'Samtal MeetUp',
    prodId: { company: 'Samtal', product: 'MeetUp', language: 'EN' },
    method:
      input.method === 'CANCEL' ? ICalCalendarMethod.CANCEL : ICalCalendarMethod.REQUEST,
    scale: 'GREGORIAN',
  });

  const event = calendar.createEvent({
    id: input.calendarUid,
    sequence: Math.max(0, input.sequence),
    start: input.start,
    end: input.end,
    summary: input.title || 'Meeting',
    description: descParts.join('\n\n'),
    location: (input.location || '').trim() || joinUrl,
    url: joinUrl,
    status:
      input.method === 'CANCEL' ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
    organizer: {
      name: input.organizerName || 'Host',
      email: input.organizerEmail,
    },
    attendees: [
      {
        name: input.attendeeEmail.split('@')[0] || input.attendeeEmail,
        email: input.attendeeEmail,
        rsvp: true,
        status: ICalAttendeeStatus.NEEDSACTION,
      },
    ],
  });

  // Prefer floating UTC stamps for maximum client compatibility.
  event.timezone('UTC');

  const content = calendar.toString();
  return {
    filename: 'invite.ics',
    content,
    method: input.method,
    contentType: `text/calendar; method=${input.method}; charset=utf-8`,
  };
}

/** Google Calendar "create event" template URL (user confirms; does not auto-create). */
export function buildGoogleCalendarUrl(input: {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  joinUrl?: string;
}): string {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const details = [input.description || '', input.joinUrl ? `Join: ${input.joinUrl}` : '']
    .filter(Boolean)
    .join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title || 'Meeting',
    dates: `${fmt(input.start)}/${fmt(input.end)}`,
    details,
  });
  if (input.location?.trim()) params.set('location', input.location.trim());
  else if (input.joinUrl) params.set('location', input.joinUrl);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook on the web deep-link to compose a calendar event. */
export function buildOutlookCalendarUrl(input: {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  joinUrl?: string;
}): string {
  const body = [input.description || '', input.joinUrl ? `Join: ${input.joinUrl}` : '']
    .filter(Boolean)
    .join('\n\n');
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: input.title || 'Meeting',
    startdt: input.start.toISOString(),
    enddt: input.end.toISOString(),
    body,
  });
  if (input.location?.trim()) params.set('location', input.location.trim());
  else if (input.joinUrl) params.set('location', input.joinUrl);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
