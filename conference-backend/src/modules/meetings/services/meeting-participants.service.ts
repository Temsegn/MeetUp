import { Types } from 'mongoose';
import { MeetingParticipant } from '../../../database/models/MeetingParticipant.model';
import { AppNotification } from '../../../database/models/AppNotification.model';
import { authRepository } from '../../auth/auth.repository';
import { workspaceRepository } from '../../workspace/workspace.repository';
import { logger } from '../../../infrastructure/logging/logger';

export type ParticipantJson = {
  id: string;
  meetingId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  status: 'invited' | 'registered' | 'joined';
  registeredAt: string;
  joinedAt: string | null;
};

function toParticipantJson(doc: {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  status: 'invited' | 'registered' | 'joined';
  registeredAt: Date;
  joinedAt?: Date | null;
}): ParticipantJson {
  return {
    id: String(doc._id),
    meetingId: String(doc.meetingId),
    userId: String(doc.userId),
    name: doc.name,
    email: doc.email,
    avatarUrl: doc.avatarUrl ?? null,
    avatarColor: doc.avatarColor ?? null,
    status: doc.status,
    registeredAt: doc.registeredAt.toISOString(),
    joinedAt: doc.joinedAt ? doc.joinedAt.toISOString() : null,
  };
}

async function upsertParticipant(input: {
  meetingId: string;
  workspaceId: string;
  userId: string;
  status: 'invited' | 'registered' | 'joined';
  invitedBy?: string | null;
}): Promise<ParticipantJson | null> {
  if (!Types.ObjectId.isValid(input.meetingId) || !Types.ObjectId.isValid(input.userId)) {
    return null;
  }
  const user = await authRepository.findUserById(input.userId);
  if (!user) return null;

  const member = await workspaceRepository.findMember(input.workspaceId, input.userId);
  if (!member) return null;

  const now = new Date();
  const existing = await MeetingParticipant.findOne({
    meetingId: new Types.ObjectId(input.meetingId),
    userId: new Types.ObjectId(input.userId),
  });

  const rank = { invited: 1, registered: 2, joined: 3 } as const;
  const nextStatus =
    existing && rank[existing.status] > rank[input.status] ? existing.status : input.status;

  const doc = await MeetingParticipant.findOneAndUpdate(
    {
      meetingId: new Types.ObjectId(input.meetingId),
      userId: new Types.ObjectId(input.userId),
    },
    {
      $set: {
        workspaceId: new Types.ObjectId(input.workspaceId),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        avatarColor: user.avatarColor ?? null,
        status: nextStatus,
        ...(input.status === 'joined' ? { joinedAt: existing?.joinedAt ?? now } : {}),
        ...(input.invitedBy ? { invitedBy: new Types.ObjectId(input.invitedBy) } : {}),
      },
      $setOnInsert: {
        registeredAt: now,
      },
    },
    { upsert: true, new: true },
  ).lean();

  return doc ? toParticipantJson(doc as never) : null;
}

export async function registerMeetingParticipants(input: {
  meetingId: string;
  workspaceId: string;
  userIds: string[];
  invitedBy: string;
  status?: 'invited' | 'registered';
}): Promise<ParticipantJson[]> {
  const status = input.status ?? 'invited';
  const unique = [...new Set(input.userIds.filter((id) => id && id !== input.invitedBy))];
  const rows: ParticipantJson[] = [];
  for (const userId of unique) {
    const row = await upsertParticipant({
      meetingId: input.meetingId,
      workspaceId: input.workspaceId,
      userId,
      status,
      invitedBy: input.invitedBy,
    });
    if (row) rows.push(row);
  }
  return rows;
}

export async function ensureHostParticipant(input: {
  meetingId: string;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await upsertParticipant({
    meetingId: input.meetingId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: 'registered',
    invitedBy: input.userId,
  });
}

export async function registerSelfForMeeting(input: {
  meetingId: string;
  workspaceId: string;
  userId: string;
}): Promise<ParticipantJson | null> {
  return upsertParticipant({
    meetingId: input.meetingId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: 'registered',
  });
}

export async function markParticipantJoined(input: {
  meetingId: string;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await upsertParticipant({
    meetingId: input.meetingId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: 'joined',
  });
}

export async function listMeetingParticipants(meetingId: string): Promise<ParticipantJson[]> {
  if (!Types.ObjectId.isValid(meetingId)) return [];
  const rows = await MeetingParticipant.find({ meetingId: new Types.ObjectId(meetingId) })
    .sort({ status: -1, registeredAt: 1 })
    .lean();
  return rows.map((r) => toParticipantJson(r as never));
}

export async function countMeetingParticipants(meetingId: string): Promise<number> {
  if (!Types.ObjectId.isValid(meetingId)) return 0;
  return MeetingParticipant.countDocuments({ meetingId: new Types.ObjectId(meetingId) });
}

export async function removeMeetingParticipant(input: {
  meetingId: string;
  userId: string;
}): Promise<boolean> {
  if (!Types.ObjectId.isValid(input.meetingId) || !Types.ObjectId.isValid(input.userId)) {
    return false;
  }
  const result = await MeetingParticipant.deleteOne({
    meetingId: new Types.ObjectId(input.meetingId),
    userId: new Types.ObjectId(input.userId),
  });
  return result.deletedCount > 0;
}

export async function notifyMeetingParticipants(input: {
  meetingId: string;
  workspaceId: string;
  title: string;
  body: string;
  href: string;
  excludeUserId?: string;
}): Promise<void> {
  try {
    const participants = await MeetingParticipant.find({
      meetingId: new Types.ObjectId(input.meetingId),
    })
      .select('userId')
      .lean();

    const userIds = [
      ...new Set(
        participants
          .map((p) => String(p.userId))
          .filter((id) => id && id !== input.excludeUserId),
      ),
    ];
    if (userIds.length === 0) return;

    await AppNotification.insertMany(
      userIds.map((userId) => ({
        userId: new Types.ObjectId(userId),
        workspaceId: new Types.ObjectId(input.workspaceId),
        title: input.title,
        body: input.body,
        kind: 'meeting',
        href: input.href,
        meetingId: new Types.ObjectId(input.meetingId),
      })),
    );
  } catch (err) {
    logger.warn('notifyMeetingParticipants failed', {
      err: err instanceof Error ? err.message : String(err),
      meetingId: input.meetingId,
    });
  }
}

export async function listUserNotifications(userId: string, limit = 100) {
  const rows = await AppNotification.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((n) => ({
    id: String(n._id),
    title: n.title,
    body: n.body,
    kind: n.kind,
    href: n.href ?? undefined,
    meetingId: n.meetingId ? String(n.meetingId) : undefined,
    read: Boolean(n.readAt),
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    readAt: null,
  };
  if (ids?.length) {
    filter._id = { $in: ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) };
  }
  await AppNotification.updateMany(filter, { $set: { readAt: new Date() } });
  return { success: true };
}
