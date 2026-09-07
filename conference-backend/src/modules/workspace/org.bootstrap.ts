import { Types } from 'mongoose';
import { Plan, DEFAULT_PLANS } from '../../database/models/Plan.model';
import { Workspace } from '../../database/models/Workspace.model';
import { WorkspaceMember } from '../../database/models/WorkspaceMember.model';
import { Subscription } from '../../database/models/Subscription.model';
import { DEFAULT_WORKSPACE_SETTINGS } from './workspace.types';
import { logger } from '../../infrastructure/logging/logger';

function slugify(name: string, userId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'org'}-${userId.slice(-6)}`;
}

export async function seedPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await Plan.updateOne({ key: plan.key }, { $set: plan }, { upsert: true });
  }
}

export async function ensureWorkspaceForUser(user: {
  id: string;
  name: string;
  department?: string;
}): Promise<{ workspaceId: string; role: import('./workspace.types').WorkspaceRole }> {
  const existing = await WorkspaceMember.findOne({
    userId: new Types.ObjectId(user.id),
    status: 'active',
  }).lean();

  if (existing) {
    return { workspaceId: String(existing.workspaceId), role: existing.role };
  }

  const orgName = user.department?.trim() || `${user.name}'s workspace`;
  const slug = slugify(orgName, user.id);
  const workspace = await Workspace.create({
    name: orgName.slice(0, 120),
    slug,
    ownerId: new Types.ObjectId(user.id),
    settings: DEFAULT_WORKSPACE_SETTINGS,
  });

  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId: new Types.ObjectId(user.id),
    role: 'owner',
    status: 'active',
  });

  const free = await Plan.findOne({ key: 'free' }).lean();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await Subscription.create({
    workspaceId: workspace._id,
    planKey: 'free',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    participantMinutesUsed: 0,
    participantMinutesIncluded: free?.includedParticipantMinutes ?? 500,
  });

  logger.info('Workspace bootstrapped', { userId: user.id, workspaceId: String(workspace._id) });
  return { workspaceId: String(workspace._id), role: 'owner' };
}
