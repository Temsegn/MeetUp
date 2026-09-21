import type { Server } from 'socket.io';
import { Meeting } from '../../database/models/Meeting.model';
import { MeetingSession } from '../../database/models/MeetingSession.model';
import { logger } from '../../infrastructure/logging/logger';

const DEFAULT_DURATION_MINUTES = 30;
const SWEEP_MS = 15_000;

type DurationFields = {
  startedAt?: Date | string | null;
  duration?: number | null;
};

/** Live clock start → end instant from meeting length (minutes). */
export function meetingDurationEndsAt(m: DurationFields): Date | null {
  if (!m.startedAt) return null;
  const start = new Date(m.startedAt);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = Math.max(1, Number(m.duration) || DEFAULT_DURATION_MINUTES);
  return new Date(start.getTime() + minutes * 60_000);
}

export function isMeetingDurationExpired(m: DurationFields, now = Date.now()): boolean {
  const endsAt = meetingDurationEndsAt(m);
  return Boolean(endsAt && endsAt.getTime() <= now);
}

async function markMeetingEnded(roomId: string): Promise<boolean> {
  const meeting = await Meeting.findOne({ roomId, status: 'live' });
  if (!meeting) return false;
  meeting.status = 'ended';
  meeting.endedAt = new Date();
  await meeting.save();
  await MeetingSession.updateMany(
    { roomId, endedAt: null },
    { $set: { endedAt: new Date() } },
  );
  return true;
}

async function notifyAndLeaveRoom(io: Server, roomId: string): Promise<void> {
  io.to(roomId).emit('meeting-ended', { roomId, reason: 'duration' });
  const sockets = await io.in(roomId).fetchSockets();
  const { onParticipantLeave } = await import('./meetings.metering');
  for (const remote of sockets) {
    const data = remote.data as {
      currentRoom?: {
        roomId: string;
        participantId: string;
        joinedAt?: Date;
        workspaceId?: string | null;
        sessionId?: string | null;
      };
      user?: { userId: string };
    };
    const current = data.currentRoom;
    if (!current || current.roomId !== roomId) {
      void remote.leave(roomId);
      continue;
    }
    void remote.leave(roomId);
    data.currentRoom = undefined;
    if (current.joinedAt && data.user?.userId) {
      void onParticipantLeave({
        roomId,
        userId: data.user.userId,
        workspaceId: current.workspaceId ?? null,
        joinedAt: current.joinedAt,
        sessionId: current.sessionId ?? null,
        isLastPeer: false,
      });
    }
  }
  try {
    const { mediaEngine } = await import('../../media/media-engine');
    mediaEngine.closeRoom(roomId);
  } catch (err) {
    logger.warn('closeRoom after duration end failed', {
      roomId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * End a single live room if its duration has elapsed.
 * Safe to call from join paths (pass io when available).
 */
export async function endMeetingIfDurationExpired(
  io: Server | null,
  roomId: string,
): Promise<boolean> {
  const meeting = await Meeting.findOne({ roomId, status: 'live' }).lean();
  if (!meeting || !isMeetingDurationExpired(meeting)) return false;

  const ended = await markMeetingEnded(roomId);
  if (!ended) return false;

  logger.info('Meeting auto-ended (duration reached)', {
    roomId,
    durationMinutes: meeting.duration ?? DEFAULT_DURATION_MINUTES,
    startedAt: meeting.startedAt,
  });

  if (io) {
    await notifyAndLeaveRoom(io, roomId);
  }
  return true;
}

/** Sweep all live meetings whose scheduled length has elapsed. */
export async function endExpiredLiveMeetings(io: Server): Promise<number> {
  const live = await Meeting.find({
    status: 'live',
    startedAt: { $ne: null },
  })
    .select('roomId startedAt duration')
    .lean();

  let ended = 0;
  for (const m of live) {
    if (!isMeetingDurationExpired(m)) continue;
    const ok = await markMeetingEnded(m.roomId);
    if (!ok) continue;
    ended += 1;
    logger.info('Meeting auto-ended (duration reached)', {
      roomId: m.roomId,
      durationMinutes: m.duration ?? DEFAULT_DURATION_MINUTES,
      startedAt: m.startedAt,
    });
    await notifyAndLeaveRoom(io, m.roomId);
  }
  return ended;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Start periodic duration enforcement (idempotent). */
export function startMeetingDurationJob(io: Server): void {
  if (timer) return;
  const tick = () => {
    void endExpiredLiveMeetings(io).catch((err) => {
      logger.warn('endExpiredLiveMeetings failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  };
  tick();
  timer = setInterval(tick, SWEEP_MS);
  if (typeof timer.unref === 'function') timer.unref();
  logger.info('Meeting duration auto-end job started', { intervalMs: SWEEP_MS });
}

export function stopMeetingDurationJob(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
