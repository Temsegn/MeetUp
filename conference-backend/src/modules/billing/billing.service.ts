import { Types } from 'mongoose';
import { Plan } from '../../database/models/Plan.model';
import { Subscription } from '../../database/models/Subscription.model';
import { ParticipantMinuteLog } from '../../database/models/ParticipantMinuteLog.model';
import { Meeting } from '../../database/models/Meeting.model';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import type { WorkspaceRole } from '../workspace/workspace.types';
import type { PlanKey } from '../../database/models/Plan.model';

export function createBillingService() {
  return {
    async listPlans() {
      const plans = await Plan.find({}).sort({ includedParticipantMinutes: 1 }).lean();
      return plans.map((p) => ({
        key: p.key,
        name: p.name,
        includedParticipantMinutes: p.includedParticipantMinutes,
        overageRatePerMinute: p.overageRatePerMinute,
        maxMembers: p.maxMembers,
        maxConcurrentMeetings: p.maxConcurrentMeetings,
        recordingStorageGb: p.recordingStorageGb,
        features: p.features,
      }));
    },

    async getPlan(workspaceId: string) {
      const sub = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
      if (!sub) throw new NotFoundError('Subscription');
      const plan = await Plan.findOne({ key: sub.planKey }).lean();
      return {
        subscription: {
          id: String(sub._id),
          workspaceId: String(sub.workspaceId),
          planKey: sub.planKey,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          participantMinutesUsed: sub.participantMinutesUsed,
          participantMinutesIncluded: sub.participantMinutesIncluded,
        },
        plan: plan
          ? {
              key: plan.key,
              name: plan.name,
              includedParticipantMinutes: plan.includedParticipantMinutes,
              overageRatePerMinute: plan.overageRatePerMinute,
              maxMembers: plan.maxMembers,
              maxConcurrentMeetings: plan.maxConcurrentMeetings,
              recordingStorageGb: plan.recordingStorageGb,
              features: plan.features,
            }
          : null,
      };
    },

    async getUsage(workspaceId: string) {
      const sub = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
      if (!sub) throw new NotFoundError('Subscription');
      const included = sub.participantMinutesIncluded;
      const used = sub.participantMinutesUsed;
      const overage = Math.max(0, used - included);

      const logs = await ParticipantMinuteLog.aggregate([
        {
          $match: {
            workspaceId: new Types.ObjectId(workspaceId),
            createdAt: { $gte: sub.currentPeriodStart, $lte: sub.currentPeriodEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            participantMinutes: { $sum: '$participantMinutes' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        planKey: sub.planKey,
        included,
        used,
        remaining: Math.max(0, included - used),
        overage,
        byDay: logs.map((d) => ({ date: d._id as string, participantMinutes: d.participantMinutes as number })),
      };
    },

    async getUsageByMeeting(workspaceId: string) {
      const sub = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
      if (!sub) throw new NotFoundError('Subscription');
      const rows = await ParticipantMinuteLog.aggregate([
        {
          $match: {
            workspaceId: new Types.ObjectId(workspaceId),
            createdAt: { $gte: sub.currentPeriodStart, $lte: sub.currentPeriodEnd },
          },
        },
        {
          $group: {
            _id: '$meetingId',
            participantMinutes: { $sum: '$participantMinutes' },
            durationSeconds: { $sum: '$durationSeconds' },
          },
        },
        { $sort: { participantMinutes: -1 } },
        { $limit: 50 },
      ]);

      const ids = rows.map((r) => r._id).filter(Boolean);
      const meetings = await Meeting.find({ _id: { $in: ids } }).lean();
      const byId = new Map(meetings.map((m) => [String(m._id), m]));

      return rows.map((r) => {
        const m = r._id ? byId.get(String(r._id)) : undefined;
        return {
          meetingId: r._id ? String(r._id) : null,
          title: m?.title || m?.roomId || 'Meeting',
          participantMinutes: r.participantMinutes as number,
          durationSeconds: r.durationSeconds as number,
        };
      });
    },

    async changePlan(workspaceId: string, actorRole: WorkspaceRole, planKey: PlanKey) {
      if (actorRole !== 'owner') throw new ForbiddenError('Only the owner can change the plan.');
      const plan = await Plan.findOne({ key: planKey }).lean();
      if (!plan) throw new ValidationError('Unknown plan.');
      const sub = await Subscription.findOneAndUpdate(
        { workspaceId: new Types.ObjectId(workspaceId) },
        {
          $set: {
            planKey,
            participantMinutesIncluded: plan.includedParticipantMinutes,
          },
        },
        { new: true },
      ).lean();
      if (!sub) throw new NotFoundError('Subscription');
      return { subscription: sub, plan };
    },

    async addMinutes(workspaceId: string, minutes: number): Promise<void> {
      if (minutes <= 0) return;
      await Subscription.updateOne(
        { workspaceId: new Types.ObjectId(workspaceId) },
        { $inc: { participantMinutesUsed: minutes } },
      );
    },
  };
}

export const billingService = createBillingService();
