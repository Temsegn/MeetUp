import { Types } from 'mongoose';
import { MeetingSession } from '../../database/models/MeetingSession.model';
import { ParticipantMinuteLog } from '../../database/models/ParticipantMinuteLog.model';
import { Subscription } from '../../database/models/Subscription.model';
import { Meeting } from '../../database/models/Meeting.model';
import { WorkspaceMember } from '../../database/models/WorkspaceMember.model';
import { logger } from '../../infrastructure/logging/logger';
import { ForbiddenError } from '../../shared/errors/AppError';
import { isMeetingJoinable, promoteDueMeetings } from './services/meetings-workspace.service';
import { markParticipantJoined } from './services/meeting-participants.service';

/**
 * Called when a participant joins a mediasoup room.
 * Records join time on the socket, marks meeting as live only when join is allowed.
 * Returns the sessionId for this room session so leave-room can store it.
 */
export async function onParticipantJoin(opts: {
  roomId: string;
  userId: string;
  workspaceId?: string | null;
}): Promise<{ sessionId: string | null }> {
  await promoteDueMeetings(opts.workspaceId ?? undefined);
  const meeting = await Meeting.findOne({ roomId: opts.roomId });
  if (meeting) {
    if (meeting.status === 'cancelled') {
      throw new ForbiddenError('Meeting is cancelled.');
    }
    if (meeting.status === 'ended') {
      throw new ForbiddenError('Meeting has ended.');
    }
    if (!isMeetingJoinable(meeting)) {
      throw new ForbiddenError(
        'Meeting has not started yet. You can join at the scheduled time.',
      );
    }
  }

  try {
    if (meeting) {
      if (meeting.status !== 'live') {
        meeting.status = 'live';
        meeting.startedAt = meeting.startedAt ?? new Date();
      }
      // Host always counts as at least 1; ensure legacy docs are patched
      if (!meeting.participantCount || meeting.participantCount < 1) meeting.participantCount = 1;
      if (!meeting.peakParticipants || meeting.peakParticipants < 1) meeting.peakParticipants = 1;
      await meeting.save();
    }

    if (!opts.workspaceId) {
      return { sessionId: null };
    }

    let session = await MeetingSession.findOne({ roomId: opts.roomId, endedAt: null });
    if (!session) {
      session = await MeetingSession.create({
        workspaceId: new Types.ObjectId(opts.workspaceId),
        meetingId: meeting?._id ?? null,
        roomId: opts.roomId,
        startedAt: new Date(),
        participantCount: 0,
        peakParticipants: 0,
      });
    }
    session.participantCount += 1;
    if (session.participantCount > session.peakParticipants) {
      session.peakParticipants = session.participantCount;
    }
    await session.save();

    if (meeting) {
      const liveCount = Math.max(1, session.participantCount);
      meeting.participantCount = liveCount;
      if (liveCount > (meeting.peakParticipants ?? 1)) {
        meeting.peakParticipants = liveCount;
      }
      await meeting.save();
      await markParticipantJoined({
        meetingId: String(meeting._id),
        workspaceId: opts.workspaceId,
        userId: opts.userId,
      });
    }

    return { sessionId: String(session._id) };
  } catch (err) {
    logger.error('onParticipantJoin metering error', { err: String(err) });
    return { sessionId: null };
  }
}

/**
 * Called when a participant leaves a mediasoup room.
 * Writes a ParticipantMinuteLog entry and increments the subscription counter.
 */
export async function onParticipantLeave(opts: {
  roomId: string;
  userId: string;
  workspaceId?: string | null;
  joinedAt: Date;
  sessionId?: string | null;
  isLastPeer: boolean;
}): Promise<void> {
  try {
    const leftAt = new Date();
    const durationSeconds = Math.max(0, Math.floor((leftAt.getTime() - opts.joinedAt.getTime()) / 1000));
    const participantMinutes = Math.ceil(durationSeconds / 60);

    if (!opts.workspaceId) return;

    const workspaceOid = new Types.ObjectId(opts.workspaceId);

    const meeting = await Meeting.findOne({ roomId: opts.roomId });

    await ParticipantMinuteLog.create({
      workspaceId: workspaceOid,
      meetingId: meeting?._id ?? null,
      sessionId: opts.sessionId ? new Types.ObjectId(opts.sessionId) : null,
      roomId: opts.roomId,
      userId: new Types.ObjectId(opts.userId),
      joinedAt: opts.joinedAt,
      leftAt,
      durationSeconds,
      participantMinutes,
    });

    if (participantMinutes > 0) {
      await Subscription.updateOne(
        { workspaceId: workspaceOid },
        { $inc: { participantMinutesUsed: participantMinutes } },
      );
    }

    if (opts.sessionId) {
      const session = await MeetingSession.findById(opts.sessionId);
      if (session) {
        session.participantCount = Math.max(0, session.participantCount - 1);
        // Closing the metering session when empty does not end the Meeting itself.
        if (opts.isLastPeer) {
          session.endedAt = leftAt;
        }
        await session.save();
      }
    }

    logger.info('Participant minute logged', {
      roomId: opts.roomId,
      userId: opts.userId,
      participantMinutes,
      workspaceId: opts.workspaceId,
    });
  } catch (err) {
    logger.error('onParticipantLeave metering error', { err: String(err) });
  }
}

/**
 * Host/admin ends the live meeting for everyone.
 */
export async function endLiveMeeting(opts: {
  roomId: string;
  userId: string;
  /** When true, only the meeting creator may end (not workspace admins). */
  hostOnly?: boolean;
}): Promise<{ ended: boolean }> {
  const meeting = await Meeting.findOne({ roomId: opts.roomId });
  if (!meeting) return { ended: false };
  if (String(meeting.createdBy) !== opts.userId) {
    if (opts.hostOnly) return { ended: false };
    const member = await WorkspaceMember.findOne({
      workspaceId: meeting.workspaceId,
      userId: new Types.ObjectId(opts.userId),
      status: 'active',
      role: { $in: ['owner', 'admin'] },
    }).lean();
    if (!member) return { ended: false };
  }
  meeting.status = 'ended';
  meeting.endedAt = new Date();
  await meeting.save();
  await MeetingSession.updateMany(
    { roomId: opts.roomId, endedAt: null },
    { $set: { endedAt: new Date() } },
  );
  return { ended: true };
}

/**
 * Resolve the workspaceId for a socket user by looking up their membership.
 */
export async function resolveWorkspaceId(userId: string): Promise<string | null> {
  const member = await WorkspaceMember.findOne({
    userId: new Types.ObjectId(userId),
    status: 'active',
  }).lean();
  return member ? String(member.workspaceId) : null;
}
