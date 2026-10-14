import { AppError } from '../../shared/errors/AppError';
import {
  DEFAULT_DURATION_MINUTES,
  isMeetingDurationExpired,
  meetingDurationEndsAt,
} from './meeting-duration.job';

export { DEFAULT_DURATION_MINUTES };

export type MeetingJoinFields = {
  status: string;
  scheduledAt?: Date | string | null;
  startedAt?: Date | string | null;
  duration?: number | null;
  endedAt?: Date | string | null;
};

export type MeetingJoinBlock = {
  code: 'MEETING_CANCELLED' | 'MEETING_ENDED' | 'MEETING_NOT_STARTED';
  message: string;
  /** Caller should persist status=ended when true. */
  shouldMarkEnded?: boolean;
};

function asDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** End of the scheduled window: scheduledAt + duration (minutes). */
export function scheduleWindowEndsAt(m: MeetingJoinFields): Date | null {
  const start = asDate(m.scheduledAt ?? null);
  if (!start) return null;
  const minutes = Math.max(1, Number(m.duration) || DEFAULT_DURATION_MINUTES);
  return new Date(start.getTime() + minutes * 60_000);
}

/**
 * Whether a meeting may accept new joins right now.
 * Ended / cancelled / past schedule window / not-yet-started → blocked.
 */
export function getMeetingJoinBlock(
  m: MeetingJoinFields,
  now = Date.now(),
): MeetingJoinBlock | null {
  if (m.status === 'cancelled') {
    return {
      code: 'MEETING_CANCELLED',
      message: 'This meeting was cancelled.',
    };
  }

  if (m.status === 'ended') {
    return {
      code: 'MEETING_ENDED',
      message: 'This meeting has ended.',
    };
  }

  if (m.status === 'live' && isMeetingDurationExpired(m, now)) {
    return {
      code: 'MEETING_ENDED',
      message: 'This meeting has ended. The scheduled time has passed.',
      shouldMarkEnded: true,
    };
  }

  const scheduledAt = asDate(m.scheduledAt ?? null);
  if (m.status === 'scheduled' && scheduledAt && scheduledAt.getTime() > now) {
    return {
      code: 'MEETING_NOT_STARTED',
      message: 'Meeting has not started yet. You can join at the scheduled time.',
    };
  }

  // Scheduled meeting whose invite window is fully over.
  const windowEnd = scheduleWindowEndsAt(m);
  if (m.status === 'scheduled' && windowEnd && windowEnd.getTime() <= now) {
    return {
      code: 'MEETING_ENDED',
      message: 'This meeting has ended. The scheduled time has passed.',
      shouldMarkEnded: true,
    };
  }

  // Auto-promoted live meetings that outlived both schedule window and live duration.
  if (m.status === 'live' && windowEnd && windowEnd.getTime() <= now) {
    const liveEnds = meetingDurationEndsAt(m);
    if (!liveEnds || liveEnds.getTime() <= now) {
      return {
        code: 'MEETING_ENDED',
        message: 'This meeting has ended. The scheduled time has passed.',
        shouldMarkEnded: true,
      };
    }
  }

  return null;
}

export function isMeetingJoinable(m: MeetingJoinFields, now = Date.now()): boolean {
  return getMeetingJoinBlock(m, now) === null;
}

/** Throw when join is not allowed. */
export function assertMeetingJoinable(m: MeetingJoinFields, now = Date.now()): void {
  const block = getMeetingJoinBlock(m, now);
  if (!block) return;
  throw new AppError(block.message, block.code, 403);
}
