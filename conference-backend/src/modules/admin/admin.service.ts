import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { User } from '../../database/models/User.model';
import { Workspace } from '../../database/models/Workspace.model';
import { WorkspaceMember } from '../../database/models/WorkspaceMember.model';
import { Subscription } from '../../database/models/Subscription.model';
import { WorkspaceRoom } from '../../database/models/WorkspaceRoom.model';
import { Recording } from '../../database/models/Recording.model';
import { PlatformAuditLog } from '../../database/models/PlatformAuditLog.model';
import { Plan, DEFAULT_PLANS, type PlanKey } from '../../database/models/Plan.model';
import { SystemSettings } from '../../database/models/SystemSettings.model';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { DEFAULT_WORKSPACE_SETTINGS } from '../workspace/workspace.types';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import { isMongoConnected } from '../../database/db';
import { workerManager } from '../../media/managers/worker-manager';
import type { UserRecord } from '../auth/auth.types';
import { ensureDevPlatformAdmin } from './platform-admin.sync';

const PLAN_MRR: Record<string, number> = { free: 0, pro: 49, enterprise: 299 };

async function audit(
  actor: UserRecord,
  action: string,
  target: { type?: string; id?: string },
  payload: Record<string, unknown> = {},
  ip = '',
) {
  void PlatformAuditLog.create({
    actorUserId: new Types.ObjectId(actor.id),
    actorEmail: actor.email,
    action,
    targetType: target.type ?? '',
    targetId: target.id ?? '',
    result: 'success',
    payload,
    ip,
  }).catch(() => undefined);
}

export const adminService = {
  async claimDevAccess(user: UserRecord) {
    const promoted = await ensureDevPlatformAdmin(user);
    return { promoted, platformRole: user.platformRole };
  },

  async overview() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      orgTotal,
      orgSuspended,
      userTotal,
      userActive,
      roomTotal,
      recordingsTotal,
      meetingsToday,
      subs,
      storageAgg,
    ] = await Promise.all([
      Workspace.countDocuments(),
      Workspace.countDocuments({ status: 'suspended' }),
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'active' }),
      WorkspaceRoom.countDocuments(),
      Recording.countDocuments(),
      // Meetings started today — approximate via recordings/created workspaces if Meeting model varies
      WorkspaceRoom.countDocuments({ updatedAt: { $gte: startOfDay } }).catch(() => 0),
      Subscription.find({ status: 'active' }).select('planKey').lean(),
      Recording.aggregate([
        { $group: { _id: null, bytes: { $sum: { $ifNull: ['$bytes', 0] } } } },
      ]).catch(() => [] as Array<{ bytes?: number }>),
    ]);

    const mrr = subs.reduce((sum, s) => sum + (PLAN_MRR[s.planKey] ?? 0), 0);
    const liveMeetings = metrics.activeRooms.get();
    const storageBytes = storageAgg[0]?.bytes ?? 0;
    const storageGb = Math.round((storageBytes / (1024 * 1024 * 1024)) * 10) / 10;

    const topRooms = await WorkspaceRoom.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()
      .catch(() => []);

    const topActiveRooms = await Promise.all(
      topRooms.map(async (r) => {
        const members = await WorkspaceMember.countDocuments({
          workspaceId: r.workspaceId,
          status: 'active',
        }).catch(() => 0);
        return {
          id: String(r._id),
          name: r.name,
          members,
          meetings: liveMeetings || 0,
          lastActivity: r.updatedAt,
          status: 'active' as const,
        };
      }),
    );

    const recentOrgs = await Workspace.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('ownerId', 'name email')
      .lean();

    const recent = await Promise.all(
      recentOrgs.map(async (w) => {
        const members = await WorkspaceMember.countDocuments({
          workspaceId: w._id,
          status: 'active',
        });
        const sub = await Subscription.findOne({ workspaceId: w._id }).lean();
        const owner = w.ownerId as unknown as { name?: string; email?: string } | null;
        return {
          id: String(w._id),
          name: w.name,
          slug: w.slug,
          status: w.status ?? 'active',
          plan: sub?.planKey ?? 'free',
          members,
          ownerName: owner?.name ?? '—',
          ownerEmail: owner?.email ?? '',
          createdAt: w.createdAt,
        };
      }),
    );

    const auditRows = await PlatformAuditLog.find()
      .sort({ at: -1 })
      .limit(8)
      .lean();

    const recentActivity = [
      ...auditRows.map((a) => ({
        id: String(a._id),
        title: a.action.replace(/\./g, ' '),
        subtitle: a.targetType ? `${a.targetType} ${a.targetId}`.trim() : a.actorEmail,
        at: a.at,
        kind: 'audit' as const,
      })),
      ...recent.slice(0, 4).map((o) => ({
        id: `org-${o.id}`,
        title: 'New organization created',
        subtitle: o.name,
        at: o.createdAt,
        kind: 'org' as const,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);

    const mongoOk = isMongoConnected();
    const workersOk = workerManager.hasHealthyWorkers();

    // Synthetic but stable 30-day series anchored to live totals (for chart UI).
    const labels = ['Apr 1', 'Apr 8', 'Apr 15', 'Apr 22', 'Apr 28'];
    const baseMeetings = Math.max(meetingsToday || liveMeetings || 20, 20);
    const baseUsers = Math.max(userActive, 10);

    return {
      kpis: {
        totalOrganizations: orgTotal,
        suspendedOrganizations: orgSuspended,
        totalRooms: roomTotal,
        activeUsers: userActive,
        totalUsers: userTotal,
        meetingsToday: meetingsToday || liveMeetings,
        totalRecordings: recordingsTotal,
        storageUsedGb: storageGb,
        storageLimitGb: 1024,
        monthlyRevenue: mrr,
        activeMeetings: liveMeetings,
      },
      growth: {
        labels,
        meetings: labels.map((_, i) => Math.round(baseMeetings * (0.55 + i * 0.12))),
        users: labels.map((_, i) => Math.round(baseUsers * (0.45 + i * 0.14))),
        organizations: [2, 3, 4, 5, orgTotal],
      },
      recentOrganizations: recent,
      topActiveRooms,
      recentActivity,
      subscriptionOverview: {
        planName: mrr >= 299 ? 'Enterprise' : mrr >= 49 ? 'Pro' : 'Free',
        priceMonthly: mrr >= 299 ? 299 : mrr >= 49 ? 49 : 0,
        status: 'active' as const,
        roomsUsed: roomTotal,
        roomsLimit: Math.max(200, roomTotal),
        storageUsedGb: storageGb,
        storageLimitGb: 1024,
        membersUsed: userActive,
        membersLimit: Math.max(50, userActive),
      },
      systemHealth: {
        api: 'healthy' as const,
        database: mongoOk ? ('healthy' as const) : ('degraded' as const),
        mediaServers: workersOk ? ('healthy' as const) : ('degraded' as const),
        storage: 'healthy' as const,
      },
    };
  },

  async listWorkspaces(q: { search?: string; status?: string; plan?: string; page?: number; limit?: number }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const filter: Record<string, unknown> = {};
    if (q.status === 'active' || q.status === 'suspended') filter.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { name: new RegExp(s, 'i') },
        { slug: new RegExp(s, 'i') },
        { email: new RegExp(s, 'i') },
      ];
    }

    const [rows, total] = await Promise.all([
      Workspace.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('ownerId', 'name email')
        .lean(),
      Workspace.countDocuments(filter),
    ]);

    const items = await Promise.all(
      rows.map(async (w) => {
        const members = await WorkspaceMember.countDocuments({
          workspaceId: w._id,
          status: 'active',
        });
        const sub = await Subscription.findOne({ workspaceId: w._id }).lean();
        if (q.plan && sub?.planKey !== q.plan) return null;
        const owner = w.ownerId as unknown as { name?: string; email?: string } | null;
        return {
          id: String(w._id),
          name: w.name,
          slug: w.slug,
          email: w.email ?? '',
          status: w.status ?? 'active',
          plan: sub?.planKey ?? 'free',
          subscriptionStatus: sub?.status ?? 'active',
          members,
          mrr: PLAN_MRR[sub?.planKey ?? 'free'] ?? 0,
          ownerName: owner?.name ?? '—',
          ownerEmail: owner?.email ?? '',
          createdAt: w.createdAt,
        };
      }),
    );

    return { items: items.filter(Boolean), total, page, limit };
  },

  async getWorkspace(id: string) {
    const w = await Workspace.findById(id).populate('ownerId', 'name email').lean();
    if (!w) throw new NotFoundError('Workspace');
    const members = await WorkspaceMember.find({ workspaceId: w._id })
      .populate('userId', 'name email avatarColor accountStatus')
      .lean();
    const sub = await Subscription.findOne({ workspaceId: w._id }).lean();
    const owner = w.ownerId as unknown as { name?: string; email?: string; _id?: Types.ObjectId } | null;
    return {
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      email: w.email ?? '',
      phone: (w as { phone?: string }).phone ?? '',
      description: (w as { description?: string }).description ?? '',
      industry: (w as { industry?: string }).industry ?? '',
      organizationSize: (w as { organizationSize?: string }).organizationSize ?? '',
      status: w.status ?? 'active',
      logoUrl: w.logoUrl,
      settings: w.settings,
      createdAt: w.createdAt,
      owner: owner
        ? { id: String(owner._id), name: owner.name ?? '', email: owner.email ?? '' }
        : null,
      subscription: sub
        ? {
            planKey: sub.planKey,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            participantMinutesUsed: sub.participantMinutesUsed,
            participantMinutesIncluded: sub.participantMinutesIncluded,
            mrr: PLAN_MRR[sub.planKey] ?? 0,
          }
        : null,
      members: members.map((m) => {
        const u = m.userId as unknown as {
          _id?: Types.ObjectId;
          name?: string;
          email?: string;
          avatarColor?: string;
          accountStatus?: string;
        } | null;
        return {
          userId: u?._id ? String(u._id) : String(m.userId),
          name: u?.name ?? '—',
          email: u?.email ?? '',
          avatarColor: u?.avatarColor ?? '#016BE6',
          accountStatus: u?.accountStatus ?? 'active',
          role: m.role,
          status: m.status,
        };
      }),
    };
  },

  async createWorkspace(
    actor: UserRecord,
    input: {
      name: string;
      slug: string;
      email?: string;
      phone?: string;
      description?: string;
      industry?: string;
      organizationSize?: string;
      logoUrl?: string | null;
      ownerName?: string;
      ownerEmail: string;
      planKey?: PlanKey;
    },
    ip = '',
  ) {
    const name = input.name?.trim();
    const slug = input.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const ownerEmail = input.ownerEmail?.trim().toLowerCase();
    const ownerName = input.ownerName?.trim();
    if (!name) throw new ValidationError('Organization name is required.');
    if (!slug || slug.length < 2) throw new ValidationError('Valid slug is required.');
    if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      throw new ValidationError('Valid owner email is required.');
    }

    const existingSlug = await Workspace.findOne({ slug }).lean();
    if (existingSlug) throw new ConflictError('That organization slug is already taken.');

    let owner = await User.findOne({ email: ownerEmail });
    if (!owner) {
      const passwordHash = await bcrypt.hash(`Temp${Date.now()}!a`, 10);
      owner = await User.create({
        name: (ownerName || ownerEmail.split('@')[0]).slice(0, 120),
        email: ownerEmail,
        passwordHash,
        mustChangePassword: true,
        emailVerifiedAt: new Date(),
        phone: input.phone?.trim() ?? '',
      });
    } else if (ownerName && owner.name !== ownerName) {
      owner.name = ownerName.slice(0, 120);
      if (input.phone?.trim()) owner.phone = input.phone.trim();
      await owner.save();
    }

    const planKey: PlanKey =
      input.planKey === 'pro' || input.planKey === 'enterprise' ? input.planKey : 'free';
    const plan = await Plan.findOne({ key: planKey }).lean();

    const workspace = await Workspace.create({
      name: name.slice(0, 120),
      slug,
      email: input.email?.trim().toLowerCase() ?? ownerEmail,
      phone: input.phone?.trim() ?? '',
      description: (input.description ?? '').trim().slice(0, 200),
      industry: (input.industry ?? '').trim().slice(0, 80),
      organizationSize: (input.organizationSize ?? '').trim().slice(0, 40),
      logoUrl: input.logoUrl?.trim() || null,
      ownerId: owner._id,
      status: 'active',
      settings: DEFAULT_WORKSPACE_SETTINGS,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: owner._id,
      role: 'owner',
      status: 'active',
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await Subscription.create({
      workspaceId: workspace._id,
      planKey,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      participantMinutesUsed: 0,
      participantMinutesIncluded: plan?.includedParticipantMinutes ?? 500,
    });

    await audit(actor, 'workspace.create', { type: 'workspace', id: String(workspace._id) }, { name, slug }, ip);
    return this.getWorkspace(String(workspace._id));
  },

  async setWorkspaceStatus(actor: UserRecord, id: string, status: 'active' | 'suspended', ip = '') {
    const w = await Workspace.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!w) throw new NotFoundError('Workspace');
    await audit(actor, status === 'suspended' ? 'workspace.suspend' : 'workspace.reactivate', {
      type: 'workspace',
      id,
    }, {}, ip);
    return this.getWorkspace(id);
  },

  async listUsers(q: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const filter: Record<string, unknown> = {};
    if (q.status === 'active' || q.status === 'suspended' || q.status === 'banned') {
      filter.accountStatus = q.status;
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [{ name: new RegExp(s, 'i') }, { email: new RegExp(s, 'i') }];
    }
    const [rows, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-passwordHash')
        .lean(),
      User.countDocuments(filter),
    ]);
    return {
      items: rows.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl ?? null,
        jobTitle: u.jobTitle ?? '',
        platformRole: u.platformRole ?? 'none',
        accountStatus: u.accountStatus ?? 'active',
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
    };
  },

  async getUser(id: string) {
    const u = await User.findById(id).select('-passwordHash').lean();
    if (!u) throw new NotFoundError('User');
    const memberships = await WorkspaceMember.find({ userId: u._id })
      .populate('workspaceId', 'name slug status')
      .lean();
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      jobTitle: u.jobTitle ?? '',
      department: u.department ?? '',
      avatarColor: u.avatarColor,
      avatarUrl: u.avatarUrl ?? null,
      platformRole: u.platformRole ?? 'none',
      accountStatus: u.accountStatus ?? 'active',
      emailVerifiedAt: u.emailVerifiedAt,
      createdAt: u.createdAt,
      workspaces: memberships.map((m) => {
        const w = m.workspaceId as unknown as {
          _id?: Types.ObjectId;
          name?: string;
          slug?: string;
          status?: string;
        } | null;
        return {
          workspaceId: w?._id ? String(w._id) : String(m.workspaceId),
          name: w?.name ?? '—',
          slug: w?.slug ?? '',
          status: w?.status ?? 'active',
          role: m.role,
        };
      }),
    };
  },

  async createUser(
    actor: UserRecord,
    input: {
      name: string;
      email: string;
      phone?: string;
      jobTitle?: string;
      platformRole?: 'none' | 'admin' | 'super_admin';
      temporaryPassword?: string;
      forcePasswordChange?: boolean;
    },
    ip = '',
  ) {
    const email = input.email?.trim().toLowerCase();
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Name is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Valid email is required.');
    }
    const exists = await User.findOne({ email }).lean();
    if (exists) throw new ConflictError('A user with that email already exists.');

    const temp = input.temporaryPassword?.trim() || `Welcome${Math.floor(1000 + Math.random() * 9000)}!`;
    const passwordHash = await bcrypt.hash(temp, 10);
    const platformRole =
      input.platformRole === 'admin' || input.platformRole === 'super_admin'
        ? input.platformRole
        : 'none';

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone: input.phone?.trim() ?? '',
      jobTitle: input.jobTitle?.trim() ?? '',
      platformRole,
      accountStatus: 'active',
      mustChangePassword: input.forcePasswordChange !== false,
      emailVerifiedAt: new Date(),
    });

    await audit(actor, 'user.create', { type: 'user', id: String(user._id) }, { email, platformRole }, ip);
    return {
      ...(await this.getUser(String(user._id))),
      temporaryPassword: temp,
    };
  },

  async setUserStatus(
    actor: UserRecord,
    id: string,
    accountStatus: 'active' | 'suspended' | 'banned',
    ip = '',
  ) {
    if (id === actor.id) throw new ValidationError('You cannot change your own account status.');
    const u = await User.findByIdAndUpdate(id, { $set: { accountStatus } }, { new: true });
    if (!u) throw new NotFoundError('User');
    await audit(actor, `user.${accountStatus}`, { type: 'user', id }, {}, ip);
    return this.getUser(id);
  },

  async listPlans() {
    const plans = await Plan.find().lean();
    const byKey = new Map(plans.map((p) => [p.key, p]));
    for (const d of DEFAULT_PLANS) {
      if (!byKey.has(d.key)) byKey.set(d.key, d as never);
    }
    const keys = ['free', 'pro', 'enterprise'] as const;
    const items = await Promise.all(
      keys.map(async (key) => {
        const p = byKey.get(key)!;
        const subscribers = await Subscription.countDocuments({ planKey: key, status: 'active' });
        return {
          key,
          name: p.name,
          includedParticipantMinutes: p.includedParticipantMinutes,
          overageRatePerMinute: p.overageRatePerMinute,
          maxMembers: p.maxMembers,
          maxConcurrentMeetings: p.maxConcurrentMeetings,
          recordingStorageGb: p.recordingStorageGb,
          features: p.features,
          priceMonthly: PLAN_MRR[key] ?? 0,
          subscribers,
        };
      }),
    );
    return { items };
  },

  async updatePlan(
    actor: UserRecord,
    key: PlanKey,
    patch: Partial<{
      name: string;
      includedParticipantMinutes: number;
      overageRatePerMinute: number;
      maxMembers: number;
      maxConcurrentMeetings: number;
      recordingStorageGb: number;
      features: Partial<{ messages: boolean; reports: boolean; waitingRoom: boolean; autoRecord: boolean }>;
    }>,
    ip = '',
  ) {
    const updated = await Plan.findOneAndUpdate(
      { key },
      {
        $set: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.includedParticipantMinutes !== undefined
            ? { includedParticipantMinutes: patch.includedParticipantMinutes }
            : {}),
          ...(patch.overageRatePerMinute !== undefined
            ? { overageRatePerMinute: patch.overageRatePerMinute }
            : {}),
          ...(patch.maxMembers !== undefined ? { maxMembers: patch.maxMembers } : {}),
          ...(patch.maxConcurrentMeetings !== undefined
            ? { maxConcurrentMeetings: patch.maxConcurrentMeetings }
            : {}),
          ...(patch.recordingStorageGb !== undefined
            ? { recordingStorageGb: patch.recordingStorageGb }
            : {}),
          ...(patch.features ? Object.fromEntries(
            Object.entries(patch.features).map(([k, v]) => [`features.${k}`, v]),
          ) : {}),
        },
      },
      { new: true, upsert: true },
    ).lean();
    if (!updated) throw new NotFoundError('Plan');
    await audit(actor, 'plan.update', { type: 'plan', id: key }, patch as Record<string, unknown>, ip);
    return this.listPlans();
  },

  async listSubscriptions(q: {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const filter: Record<string, unknown> = {};
    if (q.status === 'active' || q.status === 'past_due' || q.status === 'cancelled') {
      filter.status = q.status;
    }
    if (q.plan === 'free' || q.plan === 'pro' || q.plan === 'enterprise') {
      filter.planKey = q.plan;
    }
    const [rows, total, workspaceTotal] = await Promise.all([
      Subscription.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(filter),
      Workspace.countDocuments(),
    ]);

    const items = await Promise.all(
      rows.map(async (s) => {
        const w = await Workspace.findById(s.workspaceId).lean();
        if (q.search?.trim()) {
          const term = q.search.trim().toLowerCase();
          if (
            !w?.name?.toLowerCase().includes(term) &&
            !w?.slug?.toLowerCase().includes(term) &&
            !w?.email?.toLowerCase().includes(term)
          ) {
            return null;
          }
        }
        const members = await WorkspaceMember.countDocuments({
          workspaceId: s.workspaceId,
          status: 'active',
        });
        const planLabel =
          s.planKey === 'enterprise' ? 'Business' : s.planKey === 'pro' ? 'Pro' : 'Free';
        return {
          id: String(s._id),
          workspaceId: String(s.workspaceId),
          organization: w?.name ?? '—',
          email: w?.email || '',
          slug: w?.slug ?? '',
          plan: s.planKey,
          planLabel,
          status: s.status,
          amount: PLAN_MRR[s.planKey] ?? 0,
          billingPeriod: 'Monthly',
          nextBilling: s.currentPeriodEnd,
          paymentMethod: s.stripeCustomerId ? 'VISA •••• 4242' : '—',
          invoiceEmail: w?.email || '',
          members,
          minutesUsed: s.participantMinutesUsed,
          minutesIncluded: s.participantMinutesIncluded,
          createdAt: w?.createdAt ?? s.createdAt,
        };
      }),
    );

    const active = await Subscription.countDocuments({ status: 'active' });
    const pastDue = await Subscription.countDocuments({ status: 'past_due' });
    const cancelled = await Subscription.countDocuments({ status: 'cancelled' });
    const mrrSubs = await Subscription.find({ status: 'active' }).select('planKey').lean();
    const mrr = mrrSubs.reduce((sum, s) => sum + (PLAN_MRR[s.planKey] ?? 0), 0);

    return {
      kpis: {
        totalWorkspaces: workspaceTotal,
        active,
        pastDue,
        cancelled,
        mrr,
        arr: mrr * 12,
      },
      items: items.filter(Boolean),
      total,
      page,
      limit,
    };
  },

  async billingOverview() {
    const subs = await Subscription.find().lean();
    const mrr = subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (PLAN_MRR[s.planKey] ?? 0), 0);
    const pastDue = subs.filter((s) => s.status === 'past_due');
    const byPlan = {
      free: subs.filter((s) => s.planKey === 'free' && s.status === 'active').length,
      pro: subs.filter((s) => s.planKey === 'pro' && s.status === 'active').length,
      enterprise: subs.filter((s) => s.planKey === 'enterprise' && s.status === 'active').length,
    };
    return {
      mrr,
      arr: mrr * 12,
      activeSubscriptions: subs.filter((s) => s.status === 'active').length,
      pastDueCount: pastDue.length,
      pastDueAmount: pastDue.reduce((sum, s) => sum + (PLAN_MRR[s.planKey] ?? 0), 0),
      byPlan,
    };
  },

  async listInvoices(q: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const subs = await Subscription.find().sort({ updatedAt: -1 }).lean();
    const all = await Promise.all(
      subs.map(async (s, idx) => {
        const w = await Workspace.findById(s.workspaceId).lean();
        const amount = PLAN_MRR[s.planKey] ?? 0;
        const number = `INV-${String(1000 + idx).padStart(4, '0')}`;
        const row = {
          id: String(s._id),
          number,
          workspaceId: String(s.workspaceId),
          organization: w?.name ?? '—',
          email: w?.email || '',
          amount,
          status: s.status === 'active' ? 'paid' : s.status === 'past_due' ? 'overdue' : 'void',
          issuedAt: s.currentPeriodStart,
          dueAt: s.currentPeriodEnd,
          plan: s.planKey,
        };
        if (q.search?.trim()) {
          const term = q.search.trim().toLowerCase();
          if (
            !row.organization.toLowerCase().includes(term) &&
            !row.number.toLowerCase().includes(term)
          ) {
            return null;
          }
        }
        return row;
      }),
    );
    const filtered = all.filter(Boolean) as NonNullable<(typeof all)[number]>[];
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  },

  async listAuditLogs(q: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 50));
    const filter: Record<string, unknown> = {};
    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { action: new RegExp(s, 'i') },
        { actorEmail: new RegExp(s, 'i') },
        { targetId: new RegExp(s, 'i') },
      ];
    }
    const [rows, total] = await Promise.all([
      PlatformAuditLog.find(filter)
        .sort({ at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlatformAuditLog.countDocuments(filter),
    ]);
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        at: r.at,
        actorEmail: r.actorEmail,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        result: r.result,
        payload: r.payload,
        ip: r.ip,
      })),
      total,
      page,
      limit,
    };
  },

  async getSystemSettings() {
    let doc = await SystemSettings.findOne({ key: 'default' }).lean();
    if (!doc) {
      await SystemSettings.create({ key: 'default' });
      doc = await SystemSettings.findOne({ key: 'default' }).lean();
    }
    return doc;
  },

  async updateSystemSettings(actor: UserRecord, patch: Record<string, unknown>, ip = '') {
    const doc = await SystemSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: patch },
      { new: true, upsert: true },
    ).lean();
    await audit(actor, 'system.settings.update', { type: 'system', id: 'default' }, patch, ip);
    return doc;
  },
};
