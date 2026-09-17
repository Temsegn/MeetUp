import { Types } from 'mongoose';
import { WorkspaceTeam } from '../../../database/models/WorkspaceTeam.model';
import { MeetingParticipant } from '../../../database/models/MeetingParticipant.model';
import { Meeting } from '../../../database/models/Meeting.model';
import { ForbiddenError, ValidationError } from '../../../shared/errors/AppError';
import type { WorkspaceRole } from '../../workspace/workspace.types';
import { hasMinRole } from '../../workspace/workspace.types';

export type MeetingAccessDoc = {
  _id: Types.ObjectId | string;
  workspaceId?: Types.ObjectId | string | null;
  createdBy: Types.ObjectId | string;
  guestEmails?: string[] | null;
};

export function isWorkspaceStaffRole(role?: WorkspaceRole | null): boolean {
  return Boolean(role && hasMinRole(role, 'admin'));
}

/** Teams where the user is lead or listed in memberIds. */
export async function listActiveTeamsForUser(
  workspaceId: string,
  userId: string,
): Promise<Array<{ id: string }>> {
  if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(userId)) return [];
  const rows = await WorkspaceTeam.find({
    workspaceId: new Types.ObjectId(workspaceId),
    status: 'active',
    $or: [
      { leadUserId: new Types.ObjectId(userId) },
      { memberIds: new Types.ObjectId(userId) },
    ],
  })
    .select('_id')
    .lean();
  return rows.map((r) => ({ id: String(r._id) }));
}

/** User ids that share at least one active team with the viewer (includes viewer). */
export async function listTeammateUserIds(
  workspaceId: string,
  userId: string,
): Promise<string[]> {
  if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(userId)) {
    return [userId];
  }
  const teams = await WorkspaceTeam.find({
    workspaceId: new Types.ObjectId(workspaceId),
    status: 'active',
    $or: [
      { leadUserId: new Types.ObjectId(userId) },
      { memberIds: new Types.ObjectId(userId) },
    ],
  })
    .select('leadUserId memberIds')
    .lean();

  const ids = new Set<string>([userId]);
  for (const t of teams) {
    if (t.leadUserId) ids.add(String(t.leadUserId));
    for (const mid of t.memberIds ?? []) ids.add(String(mid));
  }
  return [...ids];
}

/**
 * Mongo filter: meetings the user may see.
 * - Owner / admin: all workspace meetings
 * - Member: host · invited · teammates of the host (0-team hosts stay invite-only)
 */
export async function buildMeetingVisibilityFilter(opts: {
  workspaceId: string;
  userId: string;
  email?: string | null;
  role?: WorkspaceRole | null;
}): Promise<Record<string, unknown>> {
  const wsOid = new Types.ObjectId(opts.workspaceId);

  if (isWorkspaceStaffRole(opts.role)) {
    return { workspaceId: wsOid };
  }

  const { workspaceId, userId } = opts;
  const email = opts.email?.trim().toLowerCase() || null;
  const userOid = new Types.ObjectId(userId);

  const [teammateIds, invitedByUser, invitedByEmail] = await Promise.all([
    listTeammateUserIds(workspaceId, userId),
    MeetingParticipant.find({ userId: userOid }).select('meetingId').lean(),
    email
      ? MeetingParticipant.find({ email }).select('meetingId').lean()
      : Promise.resolve([] as { meetingId: Types.ObjectId }[]),
  ]);

  const invitedMeetingIds = [
    ...new Set(
      [...invitedByUser, ...invitedByEmail].map((r) => String(r.meetingId)),
    ),
  ]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const teammateOids = teammateIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const or: Record<string, unknown>[] = [
    { createdBy: userOid },
    { createdBy: { $in: teammateOids } },
  ];
  if (invitedMeetingIds.length > 0) {
    or.push({ _id: { $in: invitedMeetingIds } });
  }
  if (email) {
    or.push({ guestEmails: email });
  }

  return {
    workspaceId: wsOid,
    $or: or,
  };
}

export async function usersShareCreatorTeam(
  workspaceId: string,
  creatorId: string,
  joinerId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(workspaceId)) return false;
  if (!Types.ObjectId.isValid(creatorId) || !Types.ObjectId.isValid(joinerId)) return false;
  if (creatorId === joinerId) return true;

  const count = await WorkspaceTeam.countDocuments({
    workspaceId: new Types.ObjectId(workspaceId),
    status: 'active',
    $and: [
      {
        $or: [
          { leadUserId: new Types.ObjectId(creatorId) },
          { memberIds: new Types.ObjectId(creatorId) },
        ],
      },
      {
        $or: [
          { leadUserId: new Types.ObjectId(joinerId) },
          { memberIds: new Types.ObjectId(joinerId) },
        ],
      },
    ],
  });
  return count > 0;
}

export async function isUserInvitedToMeeting(
  meetingId: string,
  userId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(meetingId) || !Types.ObjectId.isValid(userId)) return false;
  const row = await MeetingParticipant.findOne({
    meetingId: new Types.ObjectId(meetingId),
    userId: new Types.ObjectId(userId),
  })
    .select('_id')
    .lean();
  return Boolean(row);
}

export async function isEmailInvitedToMeeting(
  meetingId: string,
  email: string,
  guestEmails?: string[] | null,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  if ((guestEmails ?? []).some((e) => e.trim().toLowerCase() === normalized)) {
    return true;
  }

  if (!Types.ObjectId.isValid(meetingId)) return false;
  const row = await MeetingParticipant.findOne({
    meetingId: new Types.ObjectId(meetingId),
    email: normalized,
  })
    .select('_id')
    .lean();
  return Boolean(row);
}

/**
 * Access to join / view a meeting:
 * - Owner / admin: all workspace meetings
 * - Member: host, invite, or shared team with host (invite-only if host has 0 teams)
 * - Guests: invite-only via matching email
 */
export async function assertCanAccessMeeting(input: {
  meeting: MeetingAccessDoc;
  joinerUserId: string;
  isGuest?: boolean;
  guestEmail?: string | null;
  /** Workspace role of the joiner (owner/admin bypass member rules). */
  workspaceRole?: WorkspaceRole | null;
}): Promise<void> {
  const meetingId = String(input.meeting._id);
  const creatorId = String(input.meeting.createdBy);
  const workspaceId = input.meeting.workspaceId ? String(input.meeting.workspaceId) : null;

  let guestEmails = input.meeting.guestEmails ?? null;
  if (!guestEmails && Types.ObjectId.isValid(meetingId)) {
    const lean = await Meeting.findById(meetingId).select('guestEmails').lean();
    guestEmails = lean?.guestEmails ?? [];
  }

  if (input.isGuest || input.joinerUserId.startsWith('guest_')) {
    const email = input.guestEmail?.trim().toLowerCase() ?? '';
    if (!email) {
      throw new ForbiddenError(
        'Guests need an invitation. Enter the email you were invited with.',
      );
    }
    const invited = await isEmailInvitedToMeeting(meetingId, email, guestEmails);
    if (!invited) {
      throw new ForbiddenError(
        'You are not invited to this meeting. Ask the host to invite you.',
      );
    }
    return;
  }

  if (input.joinerUserId === creatorId) return;

  if (isWorkspaceStaffRole(input.workspaceRole)) return;

  const invited = await isUserInvitedToMeeting(meetingId, input.joinerUserId);
  if (invited) return;

  if (!workspaceId) {
    throw new ForbiddenError('You are not invited to this meeting.');
  }

  const creatorTeams = await listActiveTeamsForUser(workspaceId, creatorId);
  if (creatorTeams.length === 0) {
    throw new ForbiddenError(
      'This meeting is invite-only. Ask the host to invite you.',
    );
  }

  const sharesTeam = await usersShareCreatorTeam(
    workspaceId,
    creatorId,
    input.joinerUserId,
  );
  if (sharesTeam) return;

  throw new ForbiddenError(
    'Only teammates of the host or invited people can join this meeting.',
  );
}

export function requireGuestEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new ValidationError('Email is required for guest access to this meeting.');
  }
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError('Enter a valid invitation email.');
  }
  return normalized;
}
