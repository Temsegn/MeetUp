import mongoose from 'mongoose';
import { WorkspaceTeam } from '../../database/models/WorkspaceTeam.model';
import { authRepository } from '../auth/auth.repository';
import { ConflictError, ValidationError } from '../../shared/errors/AppError';

const SLUG_RE = /^[a-z0-9_]+$/;
const ACCENTS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#14B8A6', '#EF4444'];

function accentFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function isDuplicateKey(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000,
  );
}

export type WorkspaceTeamDto = {
  id: string;
  workspaceId: string;
  name: string;
  teamId: string;
  description: string;
  department: string;
  visibility: 'workspace' | 'private';
  leadUserId: string | null;
  leadName: string;
  leadEmail: string;
  leadAvatarUrl: string | null;
  leadAvatarColor: string | null;
  memberIds: string[];
  memberCount: number;
  settings: {
    membersCanInvite: boolean;
    requireJoinApproval: boolean;
    notifyOnChanges: boolean;
    canCreateMeetings: boolean;
  };
  status: 'active' | 'inactive' | 'pending';
  accent: string;
  createdBy: string;
  createdAt: string;
};

async function toDto(doc: InstanceType<typeof WorkspaceTeam>): Promise<WorkspaceTeamDto> {
  const leadId = doc.leadUserId ? String(doc.leadUserId) : null;
  const lead = leadId ? await authRepository.findUserById(leadId) : null;
  const memberIds = (doc.memberIds ?? []).map((id) => String(id));
  const uniqueMembers = new Set(memberIds);
  if (leadId) uniqueMembers.add(leadId);

  return {
    id: String(doc._id),
    workspaceId: String(doc.workspaceId),
    name: doc.name,
    teamId: doc.slug,
    description: doc.description ?? '',
    department: doc.department ?? '',
    visibility: doc.visibility ?? 'workspace',
    leadUserId: leadId,
    leadName: lead?.name ?? '—',
    leadEmail: lead?.email ?? '',
    leadAvatarUrl: lead?.avatarUrl ?? null,
    leadAvatarColor: lead?.avatarColor ?? null,
    memberIds,
    memberCount: uniqueMembers.size,
    settings: {
      membersCanInvite: doc.settings?.membersCanInvite ?? true,
      requireJoinApproval: doc.settings?.requireJoinApproval ?? false,
      notifyOnChanges: doc.settings?.notifyOnChanges ?? true,
      canCreateMeetings: doc.settings?.canCreateMeetings ?? true,
    },
    status: doc.status,
    accent: doc.accent || accentFromName(doc.name),
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listWorkspaceTeams(input: {
  workspaceId: string;
  q?: string;
  status?: string;
}): Promise<WorkspaceTeamDto[]> {
  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(input.workspaceId),
  };
  if (input.status && input.status !== 'all') {
    filter.status = input.status;
  }
  if (input.q?.trim()) {
    const q = input.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
      { department: { $regex: q, $options: 'i' } },
    ];
  }
  const rows = await WorkspaceTeam.find(filter).sort({ createdAt: -1 }).exec();
  return Promise.all(rows.map((r) => toDto(r)));
}

export async function createWorkspaceTeam(input: {
  workspaceId: string;
  userId: string;
  name: string;
  teamId: string;
  description?: string;
  department?: string;
  visibility?: 'workspace' | 'private';
  leadUserId?: string | null;
  memberIds?: string[];
  settings?: Partial<WorkspaceTeamDto['settings']>;
}): Promise<WorkspaceTeamDto> {
  const name = input.name.trim();
  const slug = input.teamId.trim().toLowerCase();
  if (!name) throw new ValidationError('Team name is required.');
  if (!slug) throw new ValidationError('Team ID is required.');
  if (!SLUG_RE.test(slug)) {
    throw new ValidationError('Team ID must use lowercase letters, numbers, and underscores only.');
  }

  const leadUserId = input.leadUserId?.trim() || null;
  const memberIds = [...new Set(input.memberIds ?? [])]
    .filter((id) => id && id !== leadUserId)
    .map((id) => new mongoose.Types.ObjectId(id));

  try {
    const doc = await WorkspaceTeam.create({
      workspaceId: new mongoose.Types.ObjectId(input.workspaceId),
      name,
      slug,
      description: (input.description ?? '').trim().slice(0, 150),
      department: (input.department ?? '').trim(),
      visibility: input.visibility === 'private' ? 'private' : 'workspace',
      leadUserId: leadUserId ? new mongoose.Types.ObjectId(leadUserId) : null,
      memberIds,
      settings: {
        membersCanInvite: input.settings?.membersCanInvite ?? true,
        requireJoinApproval: input.settings?.requireJoinApproval ?? false,
        notifyOnChanges: input.settings?.notifyOnChanges ?? true,
        canCreateMeetings: input.settings?.canCreateMeetings ?? true,
      },
      status: 'active',
      accent: accentFromName(name),
      createdBy: new mongoose.Types.ObjectId(input.userId),
    });
    return toDto(doc);
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new ConflictError('A team with this ID already exists in the workspace.');
    }
    throw err;
  }
}
