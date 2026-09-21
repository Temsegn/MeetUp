import { Types } from 'mongoose';
import { Workspace } from '../../database/models/Workspace.model';
import { WorkspaceMember } from '../../database/models/WorkspaceMember.model';
import { WorkspaceInvite } from '../../database/models/WorkspaceInvite.model';
import type {
  InviteRecord,
  MemberRecord,
  MembershipSummary,
  WorkspaceRecord,
  WorkspaceRole,
  WorkspaceSettings,
} from './workspace.types';
import { DEFAULT_WORKSPACE_SETTINGS } from './workspace.types';

function toWorkspace(doc: {
  _id: unknown;
  name: string;
  slug: string;
  email?: string;
  logoUrl?: string | null;
  ownerId: unknown;
  settings?: Partial<WorkspaceSettings>;
  createdAt: Date;
}): WorkspaceRecord {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    email: doc.email ?? '',
    logoUrl: doc.logoUrl ?? null,
    ownerId: String(doc.ownerId),
    settings: { ...DEFAULT_WORKSPACE_SETTINGS, ...(doc.settings ?? {}) },
    createdAt: doc.createdAt,
  };
}

function toMember(doc: {
  _id: unknown;
  workspaceId: unknown;
  userId: unknown;
  role: WorkspaceRole;
  status: MemberRecord['status'];
  createdAt: Date;
}): MemberRecord {
  return {
    id: String(doc._id),
    workspaceId: String(doc.workspaceId),
    userId: String(doc.userId),
    role: doc.role,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export const workspaceRepository = {
  async findById(id: string): Promise<WorkspaceRecord | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await Workspace.findById(id).lean();
    return doc ? toWorkspace(doc) : null;
  },

  async listForUser(userId: string): Promise<MembershipSummary[]> {
    const rows = await WorkspaceMember.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
    }).lean();
    const ids = rows.map((r) => r.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: ids } }).lean();
    const byId = new Map(workspaces.map((w) => [String(w._id), w]));
    return rows
      .map((r) => {
        const w = byId.get(String(r.workspaceId));
        if (!w) return null;
        return {
          workspaceId: String(r.workspaceId),
          workspaceName: w.name,
          slug: w.slug,
          role: r.role as WorkspaceRole,
        };
      })
      .filter((x): x is MembershipSummary => Boolean(x));
  },

  async findMember(workspaceId: string, userId: string): Promise<MemberRecord | null> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(userId)) return null;
    const doc = await WorkspaceMember.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      status: 'active',
    }).lean();
    return doc ? toMember(doc) : null;
  },

  /** Active or inactive (not removed) — for admin member management. */
  async findManagedMember(workspaceId: string, userId: string): Promise<MemberRecord | null> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(userId)) return null;
    const doc = await WorkspaceMember.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      status: { $in: ['active', 'inactive'] },
    }).lean();
    return doc ? toMember(doc) : null;
  },

  async listMembers(workspaceId: string): Promise<MemberRecord[]> {
    const rows = await WorkspaceMember.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: { $in: ['active', 'inactive'] },
    }).lean();
    return rows.map(toMember);
  },

  async listActiveMembers(workspaceId: string): Promise<MemberRecord[]> {
    const rows = await WorkspaceMember.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: 'active',
    }).lean();
    return rows.map(toMember);
  },

  async updateMemberStatus(
    workspaceId: string,
    userId: string,
    status: 'active' | 'inactive',
  ): Promise<MemberRecord | null> {
    const doc = await WorkspaceMember.findOneAndUpdate(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        status: { $in: ['active', 'inactive'] },
      },
      { $set: { status } },
      { new: true },
    ).lean();
    return doc ? toMember(doc) : null;
  },

  async updateSettings(id: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceRecord | null> {
    const $set: Record<string, unknown> = {};
    if (settings.waitingRoom !== undefined) $set['settings.waitingRoom'] = settings.waitingRoom;
    if (settings.autoRecord !== undefined) $set['settings.autoRecord'] = settings.autoRecord;
    if (settings.joinBeforeHost !== undefined) $set['settings.joinBeforeHost'] = settings.joinBeforeHost;
    if (settings.muteOnEntry !== undefined) $set['settings.muteOnEntry'] = settings.muteOnEntry;
    if (settings.maxMeetingDurationMinutes !== undefined) {
      $set['settings.maxMeetingDurationMinutes'] = settings.maxMeetingDurationMinutes;
    }
    if (settings.language !== undefined) $set['settings.language'] = settings.language;
    if (Object.keys($set).length === 0) return this.findById(id);
    const doc = await Workspace.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    return doc ? toWorkspace(doc) : null;
  },

  async updateName(id: string, name: string): Promise<WorkspaceRecord | null> {
    const doc = await Workspace.findByIdAndUpdate(id, { $set: { name } }, { new: true }).lean();
    return doc ? toWorkspace(doc) : null;
  },

  async updateProfile(
    id: string,
    patch: { name?: string; slug?: string; email?: string; logoUrl?: string | null },
  ): Promise<WorkspaceRecord | null> {
    const $set: Record<string, unknown> = {};
    if (patch.name !== undefined) $set.name = patch.name;
    if (patch.slug !== undefined) $set.slug = patch.slug;
    if (patch.email !== undefined) $set.email = patch.email;
    if (patch.logoUrl !== undefined) $set.logoUrl = patch.logoUrl;
    if (Object.keys($set).length === 0) return this.findById(id);
    const doc = await Workspace.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    return doc ? toWorkspace(doc) : null;
  },

  async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    const doc = await Workspace.findOne({ slug: slug.toLowerCase() }).lean();
    return doc ? toWorkspace(doc) : null;
  },

  async createInvite(input: {
    workspaceId: string;
    email: string;
    name?: string;
    phone?: string;
    role: Exclude<WorkspaceRole, 'owner'>;
    tokenHash: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<InviteRecord> {
    const doc = await WorkspaceInvite.create({
      workspaceId: new Types.ObjectId(input.workspaceId),
      email: input.email,
      name: input.name ?? '',
      phone: input.phone ?? '',
      role: input.role,
      tokenHash: input.tokenHash,
      invitedBy: new Types.ObjectId(input.invitedBy),
      expiresAt: input.expiresAt,
    });
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  async listPendingInvites(workspaceId: string): Promise<InviteRecord[]> {
    const rows = await WorkspaceInvite.find({
      workspaceId: new Types.ObjectId(workspaceId),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((doc) => ({
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    }));
  },

  async listPendingInvitesByEmail(email: string): Promise<InviteRecord[]> {
    const rows = await WorkspaceInvite.find({
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((doc) => ({
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    }));
  },

  async findInviteByHash(tokenHash: string): Promise<InviteRecord | null> {
    const doc = await WorkspaceInvite.findOne({ tokenHash, revokedAt: null }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  /** Includes revoked invites — used for clearer error messages. */
  async findInviteByHashAny(tokenHash: string): Promise<InviteRecord | null> {
    const doc = await WorkspaceInvite.findOne({ tokenHash }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  async revokeInvite(workspaceId: string, inviteId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(inviteId)) return false;
    const doc = await WorkspaceInvite.findOneAndUpdate(
      {
        _id: new Types.ObjectId(inviteId),
        workspaceId: new Types.ObjectId(workspaceId),
        acceptedAt: null,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } },
    );
    return Boolean(doc);
  },

  async findPendingInvite(workspaceId: string, inviteId: string): Promise<InviteRecord | null> {
    if (!Types.ObjectId.isValid(inviteId)) return null;
    const doc = await WorkspaceInvite.findOne({
      _id: new Types.ObjectId(inviteId),
      workspaceId: new Types.ObjectId(workspaceId),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  async updateInvite(
    inviteId: string,
    patch: { email?: string; name?: string; phone?: string; role?: Exclude<WorkspaceRole, 'owner'> },
  ): Promise<InviteRecord | null> {
    const $set: Record<string, unknown> = {};
    if (patch.email !== undefined) $set.email = patch.email;
    if (patch.name !== undefined) $set.name = patch.name;
    if (patch.phone !== undefined) $set.phone = patch.phone;
    if (patch.role !== undefined) $set.role = patch.role;
    if (Object.keys($set).length === 0) return null;
    const doc = await WorkspaceInvite.findOneAndUpdate(
      { _id: new Types.ObjectId(inviteId), acceptedAt: null, revokedAt: null },
      { $set },
      { new: true },
    ).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  async rotateInviteToken(
    inviteId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<InviteRecord | null> {
    const doc = await WorkspaceInvite.findOneAndUpdate(
      { _id: new Types.ObjectId(inviteId), acceptedAt: null, revokedAt: null },
      { $set: { tokenHash, expiresAt } },
      { new: true },
    ).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      email: doc.email,
      name: doc.name ?? '',
      phone: doc.phone ?? '',
      role: doc.role,
      tokenHash: doc.tokenHash,
      invitedBy: String(doc.invitedBy),
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    };
  },

  async acceptInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await WorkspaceInvite.findById(inviteId);
    if (!invite || invite.revokedAt) return;
    invite.acceptedAt = new Date();
    await invite.save();
    await WorkspaceMember.findOneAndUpdate(
      { workspaceId: invite.workspaceId, userId: new Types.ObjectId(userId) },
      {
        $set: { role: invite.role, status: 'active' },
        $setOnInsert: { workspaceId: invite.workspaceId, userId: new Types.ObjectId(userId) },
      },
      { upsert: true },
    );
  },

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<MemberRecord | null> {
    const doc = await WorkspaceMember.findOneAndUpdate(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        status: { $in: ['active', 'inactive'] },
      },
      { $set: { role } },
      { new: true },
    ).lean();
    return doc ? toMember(doc) : null;
  },

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const doc = await WorkspaceMember.findOneAndUpdate(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        status: { $in: ['active', 'inactive'] },
      },
      { $set: { status: 'removed' } },
    );
    return Boolean(doc);
  },
};
