import { Types } from 'mongoose';
import {
  MeetingAdmission,
  buildAdmissionIdentityKey,
  type MeetingAdmissionStatus,
} from '../../../database/models/MeetingAdmission.model';
import { Meeting } from '../../../database/models/Meeting.model';
import { logger } from '../../../infrastructure/logging/logger';

export type AdmissionDecision =
  | { allow: true; reason: 'host' | 'previously_admitted' | 'no_waiting_required' }
  | { allow: false; code: 'KICKED' | 'DENIED' | 'WAITING_REQUIRED'; reason: string };

export async function getAdmissionRecord(opts: {
  meetingId: string;
  userId: string;
  isGuest?: boolean;
  email?: string | null;
}) {
  if (!Types.ObjectId.isValid(opts.meetingId)) return null;
  const identityKey = buildAdmissionIdentityKey(opts);
  return MeetingAdmission.findOne({
    meetingId: new Types.ObjectId(opts.meetingId),
    identityKey,
  }).lean();
}

export async function evaluateAdmission(opts: {
  meetingId: string;
  roomId: string;
  userId: string;
  isGuest?: boolean;
  email?: string | null;
  isHost: boolean;
  waitingRoomEnabled: boolean;
}): Promise<AdmissionDecision> {
  if (opts.isHost) {
    return { allow: true, reason: 'host' };
  }

  const record = await getAdmissionRecord(opts);
  if (record?.status === 'kicked') {
    return {
      allow: false,
      code: 'KICKED',
      reason: 'You were removed from this meeting by the host.',
    };
  }
  if (record?.status === 'denied') {
    return {
      allow: false,
      code: 'DENIED',
      reason: 'Your request to join this meeting was declined.',
    };
  }
  if (record?.status === 'admitted') {
    return { allow: true, reason: 'previously_admitted' };
  }

  const requiresAdmit = Boolean(opts.isGuest) || opts.waitingRoomEnabled;
  if (requiresAdmit) {
    return {
      allow: false,
      code: 'WAITING_REQUIRED',
      reason: 'Waiting for the host to let you in',
    };
  }
  return { allow: true, reason: 'no_waiting_required' };
}

export async function markAdmitted(opts: {
  meetingId: string;
  roomId: string;
  userId: string;
  isGuest?: boolean;
  email?: string | null;
  displayName?: string | null;
  admittedBy: string;
}): Promise<void> {
  if (!Types.ObjectId.isValid(opts.meetingId)) return;
  const identityKey = buildAdmissionIdentityKey(opts);
  await MeetingAdmission.findOneAndUpdate(
    {
      meetingId: new Types.ObjectId(opts.meetingId),
      identityKey,
    },
    {
      $set: {
        roomId: opts.roomId,
        userId: opts.isGuest ? null : opts.userId,
        email: opts.email ? String(opts.email).trim().toLowerCase() : null,
        displayName: opts.displayName ?? null,
        status: 'admitted' as MeetingAdmissionStatus,
        admittedBy: opts.admittedBy,
        admittedAt: new Date(),
        revokedBy: null,
        revokedAt: null,
      },
      $setOnInsert: {
        meetingId: new Types.ObjectId(opts.meetingId),
        identityKey,
      },
    },
    { upsert: true, new: true },
  );
  logger.info('Meeting admission granted', {
    meetingId: opts.meetingId,
    roomId: opts.roomId,
    identityKey,
    admittedBy: opts.admittedBy,
  });
}

export async function markKicked(opts: {
  meetingId: string;
  roomId: string;
  userId: string;
  isGuest?: boolean;
  email?: string | null;
  revokedBy: string;
}): Promise<void> {
  if (!Types.ObjectId.isValid(opts.meetingId)) {
    // Resolve meetingId from roomId
    const m = await Meeting.findOne({ roomId: opts.roomId }).select('_id').lean();
    if (!m) return;
    opts = { ...opts, meetingId: String(m._id) };
  }
  const identityKey = buildAdmissionIdentityKey(opts);
  await MeetingAdmission.findOneAndUpdate(
    {
      meetingId: new Types.ObjectId(opts.meetingId),
      identityKey,
    },
    {
      $set: {
        roomId: opts.roomId,
        userId: opts.isGuest ? null : opts.userId,
        email: opts.email ? String(opts.email).trim().toLowerCase() : null,
        status: 'kicked' as MeetingAdmissionStatus,
        revokedBy: opts.revokedBy,
        revokedAt: new Date(),
      },
      $setOnInsert: {
        meetingId: new Types.ObjectId(opts.meetingId),
        identityKey,
      },
    },
    { upsert: true, new: true },
  );
  logger.info('Meeting admission revoked (kicked)', {
    meetingId: opts.meetingId,
    roomId: opts.roomId,
    identityKey,
    revokedBy: opts.revokedBy,
  });
}

export async function markDenied(opts: {
  meetingId: string;
  roomId: string;
  userId: string;
  isGuest?: boolean;
  email?: string | null;
  revokedBy: string;
}): Promise<void> {
  if (!Types.ObjectId.isValid(opts.meetingId)) return;
  const identityKey = buildAdmissionIdentityKey(opts);
  await MeetingAdmission.findOneAndUpdate(
    {
      meetingId: new Types.ObjectId(opts.meetingId),
      identityKey,
    },
    {
      $set: {
        roomId: opts.roomId,
        status: 'denied' as MeetingAdmissionStatus,
        revokedBy: opts.revokedBy,
        revokedAt: new Date(),
      },
      $setOnInsert: {
        meetingId: new Types.ObjectId(opts.meetingId),
        identityKey,
        userId: opts.isGuest ? null : opts.userId,
        email: opts.email ? String(opts.email).trim().toLowerCase() : null,
      },
    },
    { upsert: true, new: true },
  );
}
