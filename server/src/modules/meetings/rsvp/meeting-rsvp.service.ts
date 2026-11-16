import { createHmac, timingSafeEqual } from 'crypto';
import { Types } from 'mongoose';
import { env } from '../../../config/env';
import { Meeting } from '../../../database/models/Meeting.model';
import { MeetingRsvp, type RsvpResponse } from '../../../database/models/MeetingRsvp.model';
import { User } from '../../../database/models/User.model';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';

/**
 * RSVP links in invitation emails.
 *
 * The token is `base64url(meetingId|email).base64url(HMAC)` — it proves the
 * link was issued for this invitee without storing anything, and can't be
 * altered to answer on someone else's behalf.
 */

export const RSVP_RESPONSES: readonly RsvpResponse[] = ['accepted', 'tentative', 'declined'];

function key(): Buffer {
  // Domain-separated from access-token signing.
  return createHmac('sha256', env.JWT_SECRET).update('samtal:meeting-rsvp:v1').digest();
}

function sign(payload: string): string {
  return createHmac('sha256', key()).update(payload).digest('base64url');
}

export function createRsvpToken(meetingId: string, email: string): string {
  const payload = Buffer.from(`${meetingId}|${email.trim().toLowerCase()}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyRsvpToken(token: string): { meetingId: string; email: string } | null {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const sep = decoded.indexOf('|');
  if (sep === -1) return null;
  const meetingId = decoded.slice(0, sep);
  const email = decoded.slice(sep + 1);
  if (!Types.ObjectId.isValid(meetingId) || !email.includes('@')) return null;
  return { meetingId, email };
}

/** Frontend page that asks the invitee to confirm their answer. */
export function rsvpUrl(token: string, response?: RsvpResponse): string {
  const base = `${String(env.FRONTEND_URL).replace(/\/+$/, '')}/rsvp/${encodeURIComponent(token)}`;
  return response ? `${base}?r=${response}` : base;
}

function resolve(token: string) {
  const parsed = verifyRsvpToken(token);
  if (!parsed) throw new NotFoundError('Invitation');
  return parsed;
}

export async function getRsvp(token: string) {
  const { meetingId, email } = resolve(token);
  const meeting = await Meeting.findById(meetingId).lean();
  if (!meeting) throw new NotFoundError('Meeting');
  const [rsvp, host] = await Promise.all([
    MeetingRsvp.findOne({ meetingId: meeting._id, email }).lean(),
    User.findById(meeting.createdBy).select('name').lean(),
  ]);
  return {
    email,
    meeting: {
      title: meeting.title || 'Meeting',
      hostName: host?.name || meeting.createdByName || 'Host',
      scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
      duration: meeting.duration ?? null,
      timezone: meeting.timezone ?? null,
      status: meeting.status,
      roomId: meeting.roomId,
    },
    response: rsvp?.response ?? null,
    respondedAt: rsvp?.respondedAt?.toISOString() ?? null,
  };
}

export async function setRsvp(token: string, response: unknown) {
  const { meetingId, email } = resolve(token);
  if (!RSVP_RESPONSES.includes(response as RsvpResponse)) {
    throw new ValidationError('Response must be accepted, tentative or declined.');
  }
  const meeting = await Meeting.findById(meetingId).select('status').lean();
  if (!meeting) throw new NotFoundError('Meeting');
  if (meeting.status === 'cancelled') {
    throw new ValidationError('This meeting was cancelled.');
  }
  await MeetingRsvp.updateOne(
    { meetingId: meeting._id, email },
    { $set: { response, respondedAt: new Date() } },
    { upsert: true },
  );
  return getRsvp(token);
}

/** email → response, for the host's invitation list. */
export async function rsvpMapForMeeting(meetingId: string): Promise<Map<string, RsvpResponse>> {
  if (!Types.ObjectId.isValid(meetingId)) return new Map();
  const rows = await MeetingRsvp.find({ meetingId: new Types.ObjectId(meetingId) })
    .select('email response')
    .lean();
  return new Map(rows.map((r) => [r.email, r.response]));
}
