import { Types } from 'mongoose';
import { WorkspaceTeam } from '../../../database/models/WorkspaceTeam.model';
import { MeetingParticipant } from '../../../database/models/MeetingParticipant.model';
import { Meeting } from '../../../database/models/Meeting.model';
import { ForbiddenError, ValidationError } from '../../../shared/errors/AppError';

export type MeetingAccessDoc = {
  _id: Types.ObjectId | string;
  workspaceId?: Types.ObjectId | string | null;
  createdBy: Types.ObjectId | string;
  guestEmails?: string[] | null;
};

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
 * Case A — creator is on ≥1 team: allow if joiner shares any of those teams OR is invited.
 * Case B — creator is on 0 teams: invite-only (creator + invited).
 * Guests: invite-only via matching invited email / guestEmails.
 */
export async function assertCanAccessMeeting(input: {
  meeting: MeetingAccessDoc;
  joinerUserId: string;
  isGuest?: boolean;
  guestEmail?: string | null;
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
