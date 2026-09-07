import { Types } from 'mongoose';
import { Meeting, IMeeting } from '../../../database/models/Meeting.model';
import { User } from '../../../database/models/User.model';
import { ParticipantMinuteLog } from '../../../database/models/ParticipantMinuteLog.model';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../shared/errors/AppError';
import type { WorkspaceRole } from '../../workspace/workspace.types';
import { hasMinRole } from '../../workspace/workspace.types';
import { workspaceRepository } from '../../workspace/workspace.repository';
import { logger } from '../../../infrastructure/logging/logger';
import {
  countMeetingParticipants,
  ensureHostParticipant,
  listMeetingParticipants,
  markParticipantJoined,
  notifyMeetingParticipants,
  registerMeetingParticipants,
  registerSelfForMeeting,
  removeMeetingParticipant,
} from './meeting-participants.service';
import { assertCanAccessMeeting } from './meeting-join-authz.service';

export type MeetingStatusFilter = 'scheduled' | 'upcoming' | 'live' | 'ended' | 'cancelled' | 'all';

export interface ListMeetingsOptions {
  workspaceId: string;
  page?: number;
  limit?: number;
  status?: MeetingStatusFilter;
  q?: string;
  date?: string;
}

function periodBounds(days = 30) {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
  return { now, currentFrom, previousFrom, previousTo: currentFrom };
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface CreateMeetingOptions {
  workspaceId: string;
  userId: string;
  userName: string;
  roomId: string;
  type?: 'instant' | 'scheduled';
  title?: string;
  agenda?: string[];
  scheduledAt?: Date;
  duration?: number;
  settings?: {
    waitingRoom?: boolean;
    autoRecord?: boolean;
    joinBeforeHost?: boolean;
    muteOnEntry?: boolean;
  };
  /** Workspace member userIds to invite/register at create time */
  participantIds?: string[];
  /** External guest invite emails */
  guestEmails?: string[];
}

type MeetingDoc = IMeeting & { _id: Types.ObjectId; createdAt: Date };

/** Flip scheduled meetings to live once their start time has arrived. Never throws. */
export async function promoteDueMeetings(workspaceId?: string): Promise<void> {
  try {
    const now = new Date();
    const filter: Record<string, unknown> = {
      status: 'scheduled',
      scheduledAt: { $lte: now },
    };
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
      filter.workspaceId = new Types.ObjectId(workspaceId);
    }

    const due = await Meeting.find(filter).select('_id workspaceId title roomId').lean();
    if (due.length === 0) return;

    // Set startedAt only when missing (classic update — no aggregation pipeline).
    await Meeting.updateMany(
      { ...filter, $or: [{ startedAt: null }, { startedAt: { $exists: false } }] },
      { $set: { status: 'live', startedAt: now } },
    );
    await Meeting.updateMany(
      { ...filter, startedAt: { $ne: null } },
      { $set: { status: 'live' } },
    );

    for (const m of due) {
      if (!m.workspaceId) continue;
      await notifyMeetingParticipants({
        meetingId: String(m._id),
        workspaceId: String(m.workspaceId),
        title: 'Meeting is live',
        body: `${m.title || 'Your meeting'} has started. Join now.`,
        href: `/app/meeting/${m.roomId}`,
      });
    }
  } catch (err) {
    logger.warn('promoteDueMeetings failed', {
      err: err instanceof Error ? err.message : String(err),
      workspaceId,
    });
  }
}

function toJson(m: MeetingDoc | null) {
  if (!m) return null;
  const peak = Math.max(1, Number(m.peakParticipants ?? m.participantCount ?? 1) || 1);
  const count = Math.max(1, Number(m.participantCount ?? 1) || 1);
  return {
    id: String(m._id),
    roomId: m.roomId,
    workspaceId: m.workspaceId ? String(m.workspaceId) : null,
    createdBy: String(m.createdBy),
    createdByName: m.createdByName,
    createdByAvatarUrl: null as string | null,
    createdByAvatarColor: null as string | null,
    type: m.type,
    status: m.status,
    title: m.title,
    agenda: m.agenda,
    scheduledAt: m.scheduledAt?.toISOString(),
    startedAt: m.startedAt?.toISOString(),
    endedAt: m.endedAt?.toISOString(),
    duration: m.duration,
    participantCount: count,
    peakParticipants: peak,
    participants: peak,
    registeredParticipantCount: count,
    settings: m.settings,
    guestEmails: Array.isArray(m.guestEmails) ? m.guestEmails : [],
    createdAt: m.createdAt.toISOString(),
  };
}

type MeetingJson = NonNullable<ReturnType<typeof toJson>>;

async function attachHostAvatars<T extends MeetingJson | null>(meetings: T[]): Promise<T[]> {
  const ids = [...new Set(meetings.filter(Boolean).map((m) => (m as MeetingJson).createdBy))];
  if (ids.length === 0) return meetings;
  const users = await User.find({ _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) } })
    .select('avatarUrl avatarColor')
    .lean();
  const map = new Map(users.map((u) => [String(u._id), u]));
  return meetings.map((m) => {
    if (!m) return m;
    const u = map.get(m.createdBy);
    return {
      ...m,
      createdByAvatarUrl: u?.avatarUrl ?? null,
      createdByAvatarColor: u?.avatarColor ?? null,
    };
  });
}

async function attachHostAvatar(m: MeetingJson | null): Promise<MeetingJson | null> {
  const [row] = await attachHostAvatars([m]);
  return row ?? null;
}

async function withRoster(m: MeetingJson | null): Promise<MeetingJson | null> {
  if (!m) return null;
  const roster = await listMeetingParticipants(m.id);
  const registeredCount = Math.max(roster.length, 1);
  return {
    ...m,
    registeredParticipantCount: registeredCount,
    participantCount: Math.max(m.participantCount ?? 1, registeredCount),
    participants: Math.max(m.participants ?? 1, registeredCount),
    participantList: roster,
  };
}

/** Attach host + other participant avatars for list cards (batched). */
async function attachParticipantLists(meetings: MeetingJson[]): Promise<MeetingJson[]> {
  const ids = meetings
    .map((m) => m.id)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return meetings;

  const { MeetingParticipant } = await import('../../../database/models/MeetingParticipant.model');
  const rows = await MeetingParticipant.find({ meetingId: { $in: ids } })
    .sort({ status: -1, registeredAt: 1 })
    .lean();

  const byMeeting = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = String(row.meetingId);
    const list = byMeeting.get(key) ?? [];
    list.push(row);
    byMeeting.set(key, list);
  }

  return meetings.map((m) => {
    const roster = (byMeeting.get(m.id) ?? []).map((r) => ({
      id: String(r._id),
      meetingId: String(r.meetingId),
      userId: String(r.userId),
      name: r.name,
      email: r.email,
      avatarUrl: r.avatarUrl ?? null,
      avatarColor: r.avatarColor ?? null,
      status: r.status as 'invited' | 'registered' | 'joined',
      registeredAt: r.registeredAt.toISOString(),
      joinedAt: r.joinedAt ? r.joinedAt.toISOString() : null,
    }));

    // Ensure host appears first with profile image when roster is empty
    if (roster.length === 0) {
      roster.push({
        id: `host-${m.createdBy}`,
        meetingId: m.id,
        userId: m.createdBy,
        name: m.createdByName,
        email: '',
        avatarUrl: m.createdByAvatarUrl ?? null,
        avatarColor: m.createdByAvatarColor ?? null,
        status: 'joined',
        registeredAt: m.createdAt,
        joinedAt: m.createdAt,
      });
    } else {
      const hostIdx = roster.findIndex((p) => p.userId === m.createdBy);
      if (hostIdx > 0) {
        const [host] = roster.splice(hostIdx, 1);
        roster.unshift(host);
      } else if (hostIdx < 0) {
        roster.unshift({
          id: `host-${m.createdBy}`,
          meetingId: m.id,
          userId: m.createdBy,
          name: m.createdByName,
          email: '',
          avatarUrl: m.createdByAvatarUrl ?? null,
          avatarColor: m.createdByAvatarColor ?? null,
          status: 'joined',
          registeredAt: m.createdAt,
          joinedAt: m.createdAt,
        });
      }
      // Prefer host profile photo from User attach
      if (roster[0]?.userId === m.createdBy) {
        roster[0] = {
          ...roster[0],
          avatarUrl: roster[0].avatarUrl ?? m.createdByAvatarUrl ?? null,
          avatarColor: roster[0].avatarColor ?? m.createdByAvatarColor ?? null,
          name: roster[0].name || m.createdByName,
        };
      }
    }

    const registeredCount = Math.max(roster.length, 1);
    return {
      ...m,
      participantList: roster,
      registeredParticipantCount: registeredCount,
      participantCount: Math.max(m.participantCount ?? 1, registeredCount),
      participants: Math.max(m.participants ?? 1, registeredCount),
    };
  });
}

export async function listWorkspaceMeetings(opts: ListMeetingsOptions) {
  await promoteDueMeetings(opts.workspaceId);
  const filter: Record<string, unknown> = {
    workspaceId: new Types.ObjectId(opts.workspaceId),
  };
  const now = new Date();
  const status = opts.status;
  const isUpcomingOnly = status === 'scheduled' || status === 'upcoming';

  // Upcoming = scheduled + future only (never live / ended / cancelled)
  if (isUpcomingOnly) {
    filter.status = 'scheduled';
    filter.scheduledAt = { $gte: now };
  } else if (status && status !== 'all') {
    filter.status = status;
  }

  if (opts.q) filter.title = { $regex: opts.q, $options: 'i' };
  if (opts.date) {
    const start = new Date(opts.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(opts.date);
    end.setHours(23, 59, 59, 999);
    const lower = isUpcomingOnly && start < now ? now : start;
    filter.scheduledAt = { $gte: lower, $lte: end };
  }

  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Meeting.find(filter)
      .sort(isUpcomingOnly ? { scheduledAt: 1 } : { createdAt: -1, scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(filter),
  ]);

  const byRecency = (a: { startedAt?: Date; scheduledAt?: Date; createdAt: Date }, b: typeof a) => {
    const ta = new Date(a.startedAt ?? a.scheduledAt ?? a.createdAt).getTime();
    const tb = new Date(b.startedAt ?? b.scheduledAt ?? b.createdAt).getTime();
    return tb - ta;
  };
  const ordered = isUpcomingOnly
    ? rows
    : [
        ...rows.filter((r) => r.status === 'live').sort(byRecency),
        ...rows.filter((r) => r.status !== 'live').sort(byRecency),
      ];

  const withHosts = await attachHostAvatars(
    await Promise.all(
      ordered.map(async (r) => {
        const json = toJson(r as unknown as MeetingDoc);
        if (!json) return json;
        const registeredCount = await countMeetingParticipants(json.id);
        return {
          ...json,
          registeredParticipantCount: registeredCount,
          participantCount: Math.max(json.participantCount ?? 1, registeredCount),
          participants: Math.max(json.participants ?? 1, registeredCount),
        };
      }),
    ),
  );

  return {
    meetings: await attachParticipantLists(
      withHosts.filter((m): m is MeetingJson => Boolean(m)),
    ),
    total,
    page,
    limit,
  };
}

export async function getMeeting(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  await promoteDueMeetings();
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  return withRoster(await attachHostAvatar(toJson(m as unknown as MeetingDoc)));
}

export async function getMeetingByRoomId(roomId: string) {
  const m = await Meeting.findOne({ roomId });
  if (!m) throw new NotFoundError('Meeting');
  return attachHostAvatar(toJson(m as unknown as MeetingDoc));
}

export async function endMeetingById(
  id: string,
  actor: { id: string; role: WorkspaceRole },
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  if (String(m.createdBy) !== actor.id && !hasMinRole(actor.role, 'admin')) {
    throw new ForbiddenError('Only the host or an admin can end this meeting.');
  }
  m.status = 'ended';
  m.endedAt = new Date();
  await m.save();
  return attachHostAvatar(toJson(m as unknown as MeetingDoc));
}

export async function getMeetingStats(workspaceId: string) {
  await promoteDueMeetings(workspaceId);
  const oid = new Types.ObjectId(workspaceId);
  const { now, currentFrom, previousFrom, previousTo } = periodBounds(30);

  const [
    total,
    live,
    ended,
    upcoming,
    meetingsCurrent,
    meetingsPrevious,
    pmCurrent,
    pmPrevious,
    participantsCurrent,
    participantsPrevious,
  ] = await Promise.all([
    Meeting.countDocuments({ workspaceId: oid, status: { $ne: 'cancelled' } }),
    Meeting.countDocuments({ workspaceId: oid, status: 'live' }),
    Meeting.countDocuments({ workspaceId: oid, status: 'ended' }),
    Meeting.countDocuments({
      workspaceId: oid,
      status: 'scheduled',
      scheduledAt: { $gte: now },
    }),
    Meeting.countDocuments({
      workspaceId: oid,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: currentFrom },
    }),
    Meeting.countDocuments({
      workspaceId: oid,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: previousFrom, $lt: previousTo },
    }),
    ParticipantMinuteLog.aggregate([
      { $match: { workspaceId: oid, createdAt: { $gte: currentFrom } } },
      {
        $group: {
          _id: null,
          participantMinutes: { $sum: '$participantMinutes' },
          durationSeconds: { $sum: '$durationSeconds' },
        },
      },
    ]),
    ParticipantMinuteLog.aggregate([
      { $match: { workspaceId: oid, createdAt: { $gte: previousFrom, $lt: previousTo } } },
      {
        $group: {
          _id: null,
          participantMinutes: { $sum: '$participantMinutes' },
        },
      },
    ]),
    ParticipantMinuteLog.distinct('userId', {
      workspaceId: oid,
      createdAt: { $gte: currentFrom },
    }),
    ParticipantMinuteLog.distinct('userId', {
      workspaceId: oid,
      createdAt: { $gte: previousFrom, $lt: previousTo },
    }),
  ]);

  const participantMinutes = (pmCurrent[0]?.participantMinutes as number | undefined) ?? 0;
  const participantMinutesPrev = (pmPrevious[0]?.participantMinutes as number | undefined) ?? 0;
  const uniqueParticipants = participantsCurrent.length;
  const uniqueParticipantsPrev = participantsPrevious.length;

  return {
    total,
    live,
    ended,
    upcoming,
    participantMinutes,
    uniqueParticipants,
    trends: {
      total: pctChange(meetingsCurrent, meetingsPrevious),
      participantMinutes: pctChange(participantMinutes, participantMinutesPrev),
      participants: pctChange(uniqueParticipants, uniqueParticipantsPrev),
    },
  };
}

export async function createWorkspaceMeeting(opts: CreateMeetingOptions) {
  const existing = await Meeting.findOne({ roomId: opts.roomId });
  if (existing) return withRoster(await attachHostAvatar(toJson(existing)));
  const title = (opts.title ?? '').trim();
  if (!title) throw new ValidationError('Meeting title is required.');
  const isInstant = (opts.type ?? 'instant') === 'instant';

  const workspace = await workspaceRepository.findById(opts.workspaceId);
  const wsSettings = workspace?.settings;
  const inherited = {
    waitingRoom: wsSettings?.waitingRoom ?? false,
    autoRecord: wsSettings?.autoRecord ?? false,
    joinBeforeHost: wsSettings?.joinBeforeHost ?? false,
    muteOnEntry: wsSettings?.muteOnEntry ?? false,
  };
  const settings = {
    waitingRoom: opts.settings?.waitingRoom ?? inherited.waitingRoom,
    autoRecord: opts.settings?.autoRecord ?? inherited.autoRecord,
    joinBeforeHost: opts.settings?.joinBeforeHost ?? inherited.joinBeforeHost,
    muteOnEntry: opts.settings?.muteOnEntry ?? inherited.muteOnEntry,
  };
  const duration =
    opts.duration ??
    wsSettings?.maxMeetingDurationMinutes ??
    30;

  const guestEmails = [...new Set(
    (opts.guestEmails ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  )].slice(0, 50);

  const m = (await Meeting.create({
    workspaceId: new Types.ObjectId(opts.workspaceId),
    createdBy: new Types.ObjectId(opts.userId),
    createdByName: opts.userName,
    roomId: opts.roomId,
    type: opts.type ?? 'instant',
    status: isInstant ? 'live' : 'scheduled',
    title,
    agenda: opts.agenda,
    scheduledAt: opts.scheduledAt ?? (isInstant ? new Date() : undefined),
    startedAt: isInstant ? new Date() : undefined,
    duration,
    // Host is a participant from the moment the meeting is created
    participantCount: 1,
    peakParticipants: 1,
    settings,
    guestEmails,
  })) as unknown as MeetingDoc;

  const meetingId = String(m._id);
  await ensureHostParticipant({
    meetingId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
  });

  const inviteIds = (opts.participantIds ?? []).filter((id) => id && id !== opts.userId);
  if (inviteIds.length > 0) {
    await registerMeetingParticipants({
      meetingId,
      workspaceId: opts.workspaceId,
      userIds: inviteIds,
      invitedBy: opts.userId,
      status: 'invited',
    });
    await notifyMeetingParticipants({
      meetingId,
      workspaceId: opts.workspaceId,
      title: isInstant ? 'You were added to a live meeting' : 'You were invited to a meeting',
      body: isInstant
        ? `${opts.userName} added you to “${title}”. Join now.`
        : `${opts.userName} invited you to “${title}”.`,
      href: isInstant ? `/app/meeting/${opts.roomId}` : `/app/meetings/${meetingId}`,
      excludeUserId: opts.userId,
    });
  }

  const registeredCount = await countMeetingParticipants(meetingId);
  if (registeredCount > 1) {
    m.participantCount = registeredCount;
    m.peakParticipants = Math.max(m.peakParticipants ?? 1, registeredCount);
    await m.save();
  }

  return withRoster(await attachHostAvatar(toJson(m)));
}

export async function cancelMeeting(
  id: string,
  actor: { id: string; role: WorkspaceRole },
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  if (m.status === 'cancelled') return attachHostAvatar(toJson(m as unknown as MeetingDoc));
  if (m.status === 'ended') throw new ForbiddenError('Meeting already ended.');
  if (String(m.createdBy) !== actor.id && !hasMinRole(actor.role, 'admin')) {
    throw new ForbiddenError('Only the host or an admin can cancel this meeting.');
  }
  m.status = 'cancelled';
  if (!m.endedAt) m.endedAt = new Date();
  await m.save();
  return attachHostAvatar(toJson(m as unknown as MeetingDoc));
}

export async function patchMeeting(
  id: string,
  actor: { id: string; role: WorkspaceRole },
  patch: {
    title?: string;
    agenda?: string[];
    scheduledAt?: string;
    duration?: number;
    settings?: {
      waitingRoom?: boolean;
      autoRecord?: boolean;
      joinBeforeHost?: boolean;
      muteOnEntry?: boolean;
    };
  },
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  if (String(m.createdBy) !== actor.id && !hasMinRole(actor.role, 'admin')) {
    throw new ForbiddenError('Only the host or an admin can edit this meeting.');
  }
  if (patch.title !== undefined) m.title = patch.title;
  if (patch.agenda !== undefined) m.agenda = patch.agenda;
  if (patch.scheduledAt) m.scheduledAt = new Date(patch.scheduledAt);
  if (patch.duration !== undefined) m.duration = patch.duration;
  if (patch.settings?.waitingRoom !== undefined) m.settings.waitingRoom = patch.settings.waitingRoom;
  if (patch.settings?.autoRecord !== undefined) m.settings.autoRecord = patch.settings.autoRecord;
  if (patch.settings?.joinBeforeHost !== undefined) {
    m.settings.joinBeforeHost = patch.settings.joinBeforeHost;
  }
  if (patch.settings?.muteOnEntry !== undefined) m.settings.muteOnEntry = patch.settings.muteOnEntry;
  await m.save();
  return attachHostAvatar(toJson(m as unknown as MeetingDoc));
}

export async function joinMeeting(id: string, userId: string): Promise<{ roomId: string }> {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  await promoteDueMeetings();
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  if (m.status === 'cancelled') throw new ForbiddenError('Meeting is cancelled.');
  if (m.status === 'ended') throw new ForbiddenError('Meeting has ended.');
  // Scheduled meetings stay upcoming until date/time is reached
  if (m.status === 'scheduled' && m.scheduledAt && m.scheduledAt.getTime() > Date.now()) {
    throw new ForbiddenError('Meeting has not started yet. You can join at the scheduled time.');
  }
  await assertCanAccessMeeting({
    meeting: m,
    joinerUserId: userId,
  });
  if (m.workspaceId) {
    await registerSelfForMeeting({
      meetingId: String(m._id),
      workspaceId: String(m.workspaceId),
      userId,
    });
  }
  return { roomId: m.roomId };
}

export async function registerForMeeting(
  id: string,
  userId: string,
  workspaceId: string,
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  if (m.status === 'cancelled') throw new ForbiddenError('Meeting is cancelled.');
  if (m.status === 'ended') throw new ForbiddenError('Meeting has ended.');
  await assertCanAccessMeeting({
    meeting: m,
    joinerUserId: userId,
  });
  const row = await registerSelfForMeeting({
    meetingId: String(m._id),
    workspaceId,
    userId,
  });
  if (!row) throw new ForbiddenError('You must be a workspace member to register.');
  const registeredCount = await countMeetingParticipants(String(m._id));
  if (registeredCount > (m.participantCount ?? 1)) {
    m.participantCount = registeredCount;
    m.peakParticipants = Math.max(m.peakParticipants ?? 1, registeredCount);
    await m.save();
  }
  return withRoster(await attachHostAvatar(toJson(m as unknown as MeetingDoc)));
}

function assertCanManageInvites(
  m: { createdBy: Types.ObjectId; status: string },
  actor: { id: string; role: WorkspaceRole },
) {
  if (m.status === 'cancelled') throw new ForbiddenError('Meeting is cancelled.');
  if (m.status === 'ended') throw new ForbiddenError('Meeting has ended.');
  if (String(m.createdBy) !== actor.id && !hasMinRole(actor.role, 'admin')) {
    throw new ForbiddenError('Only the host or an admin can manage invitations.');
  }
}

export async function addMeetingInvites(
  id: string,
  actor: { id: string; role: WorkspaceRole; name: string },
  input: { userIds?: string[]; guestEmails?: string[] },
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  assertCanManageInvites(m, actor);
  if (!m.workspaceId) throw new ValidationError('Meeting has no workspace.');

  const workspaceId = String(m.workspaceId);
  const meetingId = String(m._id);
  const inviteIds = [...new Set((input.userIds ?? []).filter((uid) => uid && uid !== actor.id))];

  if (inviteIds.length > 0) {
    await registerMeetingParticipants({
      meetingId,
      workspaceId,
      userIds: inviteIds,
      invitedBy: actor.id,
      status: 'invited',
    });
    const isLive = m.status === 'live';
    await notifyMeetingParticipants({
      meetingId,
      workspaceId,
      title: isLive ? 'You were added to a live meeting' : 'You were invited to a meeting',
      body: isLive
        ? `${actor.name} added you to “${m.title}”. Join now.`
        : `${actor.name} invited you to “${m.title}”.`,
      href: isLive ? `/app/meeting/${m.roomId}` : `/app/meetings/${meetingId}`,
      excludeUserId: actor.id,
    });
  }

  const newGuestEmails = [...new Set(
    (input.guestEmails ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  )];
  if (newGuestEmails.length > 0) {
    const existing = new Set((m.guestEmails ?? []).map((e) => e.toLowerCase()));
    for (const email of newGuestEmails) existing.add(email);
    m.guestEmails = [...existing].slice(0, 50);
  }

  const registeredCount = await countMeetingParticipants(meetingId);
  m.participantCount = Math.max(1, registeredCount);
  m.peakParticipants = Math.max(m.peakParticipants ?? 1, registeredCount);
  await m.save();

  return withRoster(await attachHostAvatar(toJson(m as unknown as MeetingDoc)));
}

export async function removeMeetingInvite(
  id: string,
  actor: { id: string; role: WorkspaceRole },
  target: { userId?: string; guestEmail?: string },
) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Meeting');
  const m = await Meeting.findById(id);
  if (!m) throw new NotFoundError('Meeting');
  assertCanManageInvites(m, actor);

  const meetingId = String(m._id);

  if (target.userId) {
    if (target.userId === String(m.createdBy)) {
      throw new ForbiddenError('Cannot remove the meeting host.');
    }
    const removed = await removeMeetingParticipant({
      meetingId,
      userId: target.userId,
    });
    if (!removed) throw new NotFoundError('Participant');
  }

  if (target.guestEmail) {
    const email = target.guestEmail.trim().toLowerCase();
    m.guestEmails = (m.guestEmails ?? []).filter((e) => e.toLowerCase() !== email);
  }

  if (!target.userId && !target.guestEmail) {
    throw new ValidationError('Provide userId or guestEmail to remove.');
  }

  const registeredCount = await countMeetingParticipants(meetingId);
  m.participantCount = Math.max(1, registeredCount);
  await m.save();

  return withRoster(await attachHostAvatar(toJson(m as unknown as MeetingDoc)));
}

/** True when a scheduled meeting may go live / accept joins. */
export function isMeetingJoinable(m: {
  status: string;
  scheduledAt?: Date | string | null;
}): boolean {
  if (m.status === 'cancelled' || m.status === 'ended') return false;
  if (m.status === 'live') return true;
  if (m.status === 'scheduled' && m.scheduledAt) {
    return new Date(m.scheduledAt).getTime() <= Date.now();
  }
  return true;
}
