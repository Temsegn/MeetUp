import { Types } from 'mongoose';
import { Meeting } from '../../database/models/Meeting.model';
import { MeetingParticipant } from '../../database/models/MeetingParticipant.model';
import { User } from '../../database/models/User.model';
import { Workspace } from '../../database/models/Workspace.model';
import { emailService } from '../auth/services/email.service';
import { meetingReminderEmail } from '../auth/templates/meeting-reminder-email';
import { logger } from '../../infrastructure/logging/logger';

const SWEEP_MS = 30_000;
/** Do not remind for meetings whose start was more than 2h ago (stale). */
const MAX_LATENESS_MS = 2 * 60 * 60_000;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function recipientEmailsForMeeting(
  meetingId: string,
  guestEmails: string[],
  createdBy?: unknown,
): Promise<string[]> {
  const emails = new Set<string>();
  for (const e of guestEmails ?? []) {
    const n = e.trim().toLowerCase();
    if (isEmail(n)) emails.add(n);
  }

  if (Types.ObjectId.isValid(meetingId)) {
    const parts = await MeetingParticipant.find({
      meetingId: new Types.ObjectId(meetingId),
    })
      .select('email')
      .lean();
    for (const p of parts) {
      const n = String(p.email || '').trim().toLowerCase();
      if (isEmail(n)) emails.add(n);
    }
  }

  if (createdBy && Types.ObjectId.isValid(String(createdBy))) {
    const host = await User.findById(createdBy).select('email').lean();
    const hostEmail = String(host?.email || '').trim().toLowerCase();
    if (isEmail(hostEmail)) emails.add(hostEmail);
  }

  return [...emails];
}

async function companyName(workspaceId: unknown): Promise<string> {
  if (!workspaceId || !Types.ObjectId.isValid(String(workspaceId))) return 'your team';
  const ws = await Workspace.findById(workspaceId).select('name').lean();
  return (ws?.name || '').trim() || 'your team';
}

async function deliverRemindersForMeeting(meetingId: string): Promise<boolean> {
  const claimed = await Meeting.findOneAndUpdate(
    {
      _id: meetingId,
      startReminderSentAt: null,
      status: { $in: ['scheduled', 'live'] },
    },
    { $set: { startReminderSentAt: new Date() } },
    { new: true },
  );
  if (!claimed) return false;

  const emails = await recipientEmailsForMeeting(
    String(claimed._id),
    claimed.guestEmails ?? [],
    claimed.createdBy,
  );
  if (emails.length === 0) return true;

  const company = await companyName(claimed.workspaceId);
  const title = (claimed.title || 'Meeting').trim() || 'Meeting';
  const isLive = claimed.status === 'live';
  const when = claimed.scheduledAt ?? claimed.startedAt ?? null;

  await Promise.all(
    emails.map(async (email) => {
      try {
        const msg = meetingReminderEmail({
          inviteeEmail: email,
          meetingTitle: title,
          hostName: claimed.createdByName || 'Host',
          companyName: company,
          roomId: claimed.roomId,
          scheduledAt: when,
          isLive,
        });
        await emailService.send({ to: email, ...msg });
      } catch (err) {
        logger.warn('Failed to send meeting start reminder', {
          email,
          roomId: claimed.roomId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  logger.info('Meeting start reminders sent', {
    roomId: claimed.roomId,
    recipients: emails.length,
    isLive,
  });
  return true;
}

/**
 * Send start-time reminder emails once per meeting when scheduledAt is reached,
 * or when a live meeting still has not been reminded.
 */
export async function sendDueMeetingStartReminders(): Promise<number> {
  const now = Date.now();
  const earliest = new Date(now - MAX_LATENESS_MS);

  // Instant meetings already get the invitation email at create time — do not
  // also fire a "starting now" reminder in the same minute.
  const due = await Meeting.find({
    status: { $in: ['scheduled', 'live'] },
    type: { $ne: 'instant' },
    startReminderSentAt: null,
    $or: [
      { scheduledAt: { $ne: null, $lte: new Date(now), $gte: earliest } },
      { status: 'live', startedAt: { $ne: null, $lte: new Date(now), $gte: earliest } },
    ],
  })
    .select('_id')
    .lean();

  let sent = 0;
  for (const m of due) {
    const ok = await deliverRemindersForMeeting(String(m._id));
    if (ok) sent += 1;
  }
  return sent;
}

/** Call when a meeting becomes live so invitees get a "starting now" email promptly. */
export async function sendMeetingStartReminderForRoom(roomId: string): Promise<void> {
  const m = await Meeting.findOne({
    roomId,
    status: { $in: ['scheduled', 'live'] },
    type: { $ne: 'instant' },
    startReminderSentAt: null,
  })
    .select('_id type')
    .lean();
  if (!m) return;
  await deliverRemindersForMeeting(String(m._id));
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startMeetingReminderJob(): void {
  if (timer) return;
  const tick = () => {
    void sendDueMeetingStartReminders().catch((err) => {
      logger.warn('sendDueMeetingStartReminders failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  };
  tick();
  timer = setInterval(tick, SWEEP_MS);
  if (typeof timer.unref === 'function') timer.unref();
  logger.info('Meeting start reminder job started', { intervalMs: SWEEP_MS });
}

export function stopMeetingReminderJob(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
