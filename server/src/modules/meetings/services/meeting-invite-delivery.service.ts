import { Types } from 'mongoose';
import { Meeting, IMeeting } from '../../../database/models/Meeting.model';
import {
  MeetingInviteDelivery,
  buildInviteIdempotencyKey,
  type InviteDeliveryKind,
  type IMeetingInviteDelivery,
} from '../../../database/models/MeetingInviteDelivery.model';
import { MeetingParticipant } from '../../../database/models/MeetingParticipant.model';
import { User } from '../../../database/models/User.model';
import { Workspace } from '../../../database/models/Workspace.model';
import { emailService, isSmtpConfigured, EmailDeliveryError } from '../../auth/services/email.service';
import { meetingInviteEmail } from '../../auth/templates/meeting-invite-email';
import { logger } from '../../../infrastructure/logging/logger';
import { env } from '../../../config/env';
import { createRsvpToken, rsvpUrl, rsvpMapForMeeting } from '../rsvp/meeting-rsvp.service';
import {
  buildGoogleCalendarUrl,
  buildMeetingIcs,
  buildOutlookCalendarUrl,
  ensureCalendarUid,
  meetingEndAt,
  meetingJoinUrl,
} from '../calendar/meeting-ics';

const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InvitationSummary {
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
  smtpConfigured: boolean;
  deliveries: Array<{
    email: string;
    kind: InviteDeliveryKind;
    sequence: number;
    status: string;
    lastError?: string | null;
    attempts: number;
    /** Invitee's answer via the email RSVP links; null = no response yet. */
    rsvp: 'accepted' | 'tentative' | 'declined' | null;
  }>;
  rsvp: { accepted: number; tentative: number; declined: number; noResponse: number };
}

function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim().toLowerCase());
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function calendarLinksForMeeting(m: {
  title?: string;
  description?: string;
  location?: string;
  roomId: string;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  duration?: number;
}): { googleCalendarUrl: string | null; outlookCalendarUrl: string | null; joinUrl: string } {
  const joinUrl = meetingJoinUrl(m.roomId);
  const start = m.scheduledAt ?? m.startedAt;
  if (!start) {
    return { googleCalendarUrl: null, outlookCalendarUrl: null, joinUrl };
  }
  const end = meetingEndAt(start, m.duration ?? 30);
  const payload = {
    title: m.title || 'Meeting',
    start,
    end,
    description: m.description || '',
    location: m.location || '',
    joinUrl,
  };
  return {
    googleCalendarUrl: buildGoogleCalendarUrl(payload),
    outlookCalendarUrl: buildOutlookCalendarUrl(payload),
    joinUrl,
  };
}

/** Collect attendee emails for a meeting (guests + participants), excluding host if desired. */
export async function collectMeetingInviteEmails(
  meeting: IMeeting,
  extraEmails: string[] = [],
  opts?: { excludeHostEmail?: string | null },
): Promise<string[]> {
  const emails = new Set<string>();
  for (const e of meeting.guestEmails ?? []) {
    const n = normalizeEmail(e);
    if (isEmail(n)) emails.add(n);
  }
  for (const e of extraEmails) {
    const n = normalizeEmail(e);
    if (isEmail(n)) emails.add(n);
  }

  const meetingId = String(meeting._id);
  if (Types.ObjectId.isValid(meetingId)) {
    const parts = await MeetingParticipant.find({
      meetingId: new Types.ObjectId(meetingId),
    })
      .select('email')
      .lean();
    for (const p of parts) {
      const n = normalizeEmail(String(p.email || ''));
      if (isEmail(n)) emails.add(n);
    }
  }

  const hostExclude = opts?.excludeHostEmail
    ? normalizeEmail(opts.excludeHostEmail)
    : null;
  if (hostExclude) emails.delete(hostExclude);

  return [...emails];
}

async function hostOrganizer(meeting: IMeeting): Promise<{ email: string; name: string }> {
  const host = await User.findById(meeting.createdBy).select('email name').lean();
  return {
    email: normalizeEmail(String(host?.email || envFallbackOrganizer())),
    name: (host?.name || meeting.createdByName || 'Host').trim() || 'Host',
  };
}

/** Bare address from EMAIL_FROM ("Name <addr>" or "addr"). */
function senderAddress(): string | null {
  const raw = String(env.EMAIL_FROM || '').trim();
  const match = raw.match(/<([^>]+)>/);
  const addr = normalizeEmail(match ? match[1] : raw);
  return isEmail(addr) ? addr : null;
}

function envFallbackOrganizer(): string {
  // Prefer a plausible mailto if host email missing; ICS requires ORGANIZER.
  return 'noreply@meet.samtal.cc';
}

/** How long a sender owns a row before another sender may retry it. */
const CLAIM_LEASE_MS = 2 * 60_000;

/**
 * Atomically take ownership of a delivery row. The immediate send loop and the
 * 30s retry sweep both pick up 'pending' rows; without this lease, a slow SMTP
 * send let both deliver the same invite (recipients got it twice).
 */
async function claimDelivery(rowId: Types.ObjectId | string): Promise<IMeetingInviteDelivery | null> {
  const now = new Date();
  return MeetingInviteDelivery.findOneAndUpdate(
    {
      _id: rowId,
      status: { $in: ['pending', 'failed'] },
      $or: [{ claimedUntil: null }, { claimedUntil: { $lte: now } }],
    },
    { $set: { claimedUntil: new Date(now.getTime() + CLAIM_LEASE_MS) } },
    { new: true },
  );
}

async function sendOneDelivery(
  candidate: IMeetingInviteDelivery,
  meeting: IMeeting,
  companyName: string,
): Promise<void> {
  if (candidate.status === 'accepted' || candidate.status === 'skipped') return;
  const row = await claimDelivery(candidate._id as Types.ObjectId);
  if (!row) return; // another sender owns it, or it was already sent
  row.claimedUntil = null;
  if (row.attempts >= MAX_ATTEMPTS) {
    row.status = 'failed';
    row.lastError = row.lastError || 'Max delivery attempts reached.';
    await row.save();
    return;
  }

  const start = meeting.scheduledAt ?? meeting.startedAt ?? new Date();
  const end = meetingEndAt(start, meeting.duration ?? 30);
  const host = await hostOrganizer(meeting);
  // ORGANIZER must match the address the mail is actually sent from. A
  // host's @gmail.com/@outlook.com organizer on mail sent by our SMTP server
  // looks spoofed to Gmail (DMARC) and the invite is dropped or spammed.
  // Keep the host's name; replies go to the host via Reply-To.
  const organizer = { email: senderAddress() ?? host.email, name: host.name };
  const calendarUid = ensureCalendarUid(String(meeting._id), meeting.calendarUid);
  const ws = meeting.workspaceId
    ? await Workspace.findById(meeting.workspaceId).select('email logoUrl settings.timeZone').lean()
    : null;
  const timezone =
    (meeting.timezone && meeting.timezone.trim()) ||
    (ws?.settings as { timeZone?: string } | undefined)?.timeZone ||
    'Asia/Riyadh';
  const method = row.kind === 'cancel' ? 'CANCEL' : 'REQUEST';
  const ics = buildMeetingIcs({
    calendarUid,
    sequence: row.sequence,
    title: meeting.title || 'Meeting',
    description: [meeting.description, ...(meeting.agenda ?? [])].filter(Boolean).join('\n'),
    location: meeting.location || '',
    start,
    end,
    timezone,
    roomId: meeting.roomId,
    organizerEmail: organizer.email,
    organizerName: organizer.name,
    attendeeEmail: row.email,
    method,
  });

  const emailKind = row.kind === 'cancel' ? 'cancel' : row.kind === 'update' ? 'update' : 'invite';
  const msg = meetingInviteEmail({
    inviteeEmail: row.email,
    meetingTitle: meeting.title || 'Meeting',
    hostName: organizer.name,
    companyName,
    roomId: meeting.roomId,
    scheduledAt: start,
    endsAt: end,
    timezone,
    location: meeting.location,
    isLive: meeting.status === 'live' || meeting.type === 'instant',
    kind: emailKind,
    logoUrl: ws?.logoUrl ?? null,
    supportEmail: (ws?.email || '').trim() || 'support@samtal.cc',
    rsvp:
      emailKind === 'cancel'
        ? null
        : (() => {
            const token = createRsvpToken(String(meeting._id), row.email);
            return {
              accept: rsvpUrl(token, 'accepted'),
              tentative: rsvpUrl(token, 'tentative'),
              decline: rsvpUrl(token, 'declined'),
            };
          })(),
  });

  row.attempts += 1;
  try {
    const result = await emailService.send({
      to: row.email,
      replyTo: isEmail(host.email) ? host.email : 'no-reply@samtal.cc',
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      icalEvent: {
        method,
        content: ics.content,
        filename: ics.filename,
      },
      attachments: [
        {
          filename: ics.filename,
          content: ics.content,
          contentType: ics.contentType,
        },
      ],
    });
    row.smtpMode = result.mode;
    row.messageId = result.messageId ?? null;
    if (result.delivered) {
      row.status = 'accepted';
      row.lastError = null;
      row.nextAttemptAt = null;
    } else {
      // Console transport: meeting saved, but not actually delivered.
      row.status = 'failed';
      row.lastError = 'SMTP is not configured. Email was logged to the server console only.';
      row.nextAttemptAt = new Date(Date.now() + backoffMs(row.attempts));
    }
  } catch (err) {
    const message =
      err instanceof EmailDeliveryError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    row.status = 'failed';
    row.lastError = message;
    row.nextAttemptAt = new Date(Date.now() + backoffMs(row.attempts));
    logger.warn('Meeting invite delivery failed', {
      meetingId: String(meeting._id),
      email: row.email,
      kind: row.kind,
      sequence: row.sequence,
      error: message,
    });
  }
  await row.save();
}

function backoffMs(attempts: number): number {
  const base = 30_000;
  return Math.min(30 * 60_000, base * Math.pow(2, Math.max(0, attempts - 1)));
}

async function upsertDeliveryRows(
  meetingId: string,
  emails: string[],
  kind: InviteDeliveryKind,
  sequence: number,
): Promise<IMeetingInviteDelivery[]> {
  const rows: IMeetingInviteDelivery[] = [];
  for (const email of emails) {
    const key = buildInviteIdempotencyKey(meetingId, email, kind, sequence);
    const existing = await MeetingInviteDelivery.findOne({ idempotencyKey: key });
    if (existing) {
      rows.push(existing);
      continue;
    }
    try {
      const created = await MeetingInviteDelivery.create({
        meetingId: new Types.ObjectId(meetingId),
        email,
        kind,
        sequence,
        idempotencyKey: key,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
      });
      rows.push(created);
    } catch (err) {
      // Race on unique key — re-fetch.
      const raced = await MeetingInviteDelivery.findOne({ idempotencyKey: key });
      if (raced) rows.push(raced);
      else {
        logger.warn('Failed to create invite delivery row', {
          meetingId,
          email,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return rows;
}

export async function summarizeDeliveries(meetingId: string): Promise<InvitationSummary> {
  const rows = await MeetingInviteDelivery.find({
    meetingId: new Types.ObjectId(meetingId),
  })
    .sort({ sequence: -1, email: 1 })
    .lean();

  // Prefer latest sequence per email for the summary list.
  const latestByEmail = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!latestByEmail.has(r.email)) latestByEmail.set(r.email, r);
  }
  const latest = [...latestByEmail.values()];
  const rsvps = await rsvpMapForMeeting(meetingId);
  const rsvpCounts = { accepted: 0, tentative: 0, declined: 0, noResponse: 0 };
  for (const r of latest) {
    const answer = rsvps.get(r.email);
    if (answer) rsvpCounts[answer] += 1;
    else rsvpCounts.noResponse += 1;
  }

  let sent = 0;
  let failed = 0;
  let pending = 0;
  let skipped = 0;
  for (const r of latest) {
    if (r.status === 'accepted') sent += 1;
    else if (r.status === 'failed') failed += 1;
    else if (r.status === 'pending') pending += 1;
    else skipped += 1;
  }

  return {
    sent,
    failed,
    pending,
    skipped,
    smtpConfigured: isSmtpConfigured(),
    deliveries: latest.map((r) => ({
      email: r.email,
      kind: r.kind,
      sequence: r.sequence,
      status: r.status,
      lastError: r.lastError,
      attempts: r.attempts,
      rsvp: rsvps.get(r.email) ?? null,
    })),
    rsvp: rsvpCounts,
  };
}

export async function queueAndSendMeetingInvites(opts: {
  meeting: IMeeting;
  emails: string[];
  kind: InviteDeliveryKind;
  companyName: string;
  /** When true, bump calendarSequence on the meeting before sending. */
  bumpSequence?: boolean;
}): Promise<InvitationSummary> {
  const meeting = opts.meeting;
  const meetingId = String(meeting._id);

  if (!meeting.calendarUid) {
    meeting.calendarUid = ensureCalendarUid(meetingId, meeting.calendarUid);
  }

  if (opts.bumpSequence) {
    meeting.calendarSequence = Math.max(0, Number(meeting.calendarSequence ?? 0)) + 1;
  } else if (meeting.calendarSequence == null) {
    meeting.calendarSequence = 0;
  }
  await meeting.save();

  const emails = [...new Set(opts.emails.map(normalizeEmail).filter(isEmail))];
  if (emails.length === 0) {
    return summarizeDeliveries(meetingId);
  }

  const sequence = Number(meeting.calendarSequence ?? 0);
  const rows = await upsertDeliveryRows(meetingId, emails, opts.kind, sequence);

  for (const row of rows) {
    if (row.status === 'accepted') continue;
    await sendOneDelivery(row, meeting, opts.companyName);
  }

  return summarizeDeliveries(meetingId);
}

export async function retryFailedMeetingInvites(
  meetingId: string,
  companyName: string,
): Promise<InvitationSummary> {
  if (!Types.ObjectId.isValid(meetingId)) {
    return {
      sent: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      smtpConfigured: isSmtpConfigured(),
      deliveries: [],
      rsvp: { accepted: 0, tentative: 0, declined: 0, noResponse: 0 },
    };
  }
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return {
      sent: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      smtpConfigured: isSmtpConfigured(),
      deliveries: [],
      rsvp: { accepted: 0, tentative: 0, declined: 0, noResponse: 0 },
    };
  }

  const rows = await MeetingInviteDelivery.find({
    meetingId: new Types.ObjectId(meetingId),
    status: { $in: ['failed', 'pending'] },
    attempts: { $lt: MAX_ATTEMPTS },
  });

  for (const row of rows) {
    row.nextAttemptAt = new Date();
    await sendOneDelivery(row, meeting, companyName);
  }

  return summarizeDeliveries(meetingId);
}

export async function processPendingInviteDeliveries(limit = 40): Promise<number> {
  const now = new Date();
  const rows = await MeetingInviteDelivery.find({
    status: { $in: ['pending', 'failed'] },
    attempts: { $lt: MAX_ATTEMPTS },
    $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
  })
    .sort({ nextAttemptAt: 1 })
    .limit(limit);

  let processed = 0;
  for (const row of rows) {
    const meeting = await Meeting.findById(row.meetingId);
    if (!meeting) {
      row.status = 'skipped';
      row.lastError = 'Meeting no longer exists.';
      await row.save();
      continue;
    }
    let companyName = 'a team';
    if (meeting.workspaceId && Types.ObjectId.isValid(String(meeting.workspaceId))) {
      const ws = await Workspace.findById(meeting.workspaceId).select('name').lean();
      companyName = (ws?.name || '').trim() || 'a team';
    }
    await sendOneDelivery(row, meeting, companyName);
    processed += 1;
  }
  return processed;
}

export function buildMeetingIcsForDownload(meeting: IMeeting, organizer: {
  email: string;
  name: string;
}, attendeeEmail?: string): ReturnType<typeof buildMeetingIcs> {
  const start = meeting.scheduledAt ?? meeting.startedAt ?? new Date();
  const end = meetingEndAt(start, meeting.duration ?? 30);
  const calendarUid = ensureCalendarUid(String(meeting._id), meeting.calendarUid);
  const method = meeting.status === 'cancelled' ? 'CANCEL' : 'REQUEST';
  return buildMeetingIcs({
    calendarUid,
    sequence: Number(meeting.calendarSequence ?? 0),
    title: meeting.title || 'Meeting',
    description: [meeting.description, ...(meeting.agenda ?? [])].filter(Boolean).join('\n'),
    location: meeting.location || '',
    start,
    end,
    timezone: meeting.timezone || 'UTC',
    roomId: meeting.roomId,
    organizerEmail: organizer.email,
    organizerName: organizer.name,
    attendeeEmail: attendeeEmail || organizer.email,
    method,
  });
}
