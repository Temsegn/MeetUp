import { Types } from 'mongoose';
import { Plan } from '../../database/models/Plan.model';
import { Subscription } from '../../database/models/Subscription.model';
import { Invoice } from '../../database/models/Invoice.model';
import { ParticipantMinuteLog } from '../../database/models/ParticipantMinuteLog.model';
import { Meeting } from '../../database/models/Meeting.model';
import { PaymentMethod } from '../../database/models/PaymentMethod.model';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import type { WorkspaceRole } from '../workspace/workspace.types';
import type { PlanKey } from '../../database/models/Plan.model';
import { logger } from '../../infrastructure/logging/logger';
import {
  getInvoiceForWorkspace,
  markInvoicePaid,
  planMonthlyPrice,
  syncInvoiceForWorkspace,
  toInvoiceDto,
} from './invoice.helpers';
import { chargeCard, formatExp, parseCardInput, type ChargedCard } from './card.helpers';

function toPaymentMethodDto(row: {
  _id: unknown;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName?: string;
  isDefault?: boolean;
}) {
  return {
    id: String(row._id),
    brand: row.brand,
    last4: row.last4,
    exp: formatExp(row.expMonth, row.expYear),
    holderName: row.holderName ?? '',
    isDefault: Boolean(row.isDefault),
  };
}

async function savePaymentMethod(workspaceId: string, charged: ChargedCard) {
  const ws = new Types.ObjectId(workspaceId);
  const existing = await PaymentMethod.findOne({
    workspaceId: ws,
    last4: charged.last4,
    brand: charged.brand,
    expMonth: charged.expMonth,
    expYear: charged.expYear,
  });
  if (existing) {
    existing.holderName = charged.holderName;
    existing.isDefault = true;
    await existing.save();
    await PaymentMethod.updateMany(
      { workspaceId: ws, _id: { $ne: existing._id } },
      { $set: { isDefault: false } },
    );
    return existing;
  }
  await PaymentMethod.updateMany({ workspaceId: ws }, { $set: { isDefault: false } });
  return PaymentMethod.create({
    workspaceId: ws,
    brand: charged.brand,
    last4: charged.last4,
    expMonth: charged.expMonth,
    expYear: charged.expYear,
    holderName: charged.holderName,
    isDefault: true,
  });
}

async function chargeOrUseSavedCard(workspaceId: string, cardRaw: unknown, amount: number) {
  const hasCardFields =
    cardRaw &&
    typeof cardRaw === 'object' &&
    (Boolean((cardRaw as { number?: string }).number) ||
      Boolean((cardRaw as { cvc?: string }).cvc));
  if (hasCardFields) {
    const charged = chargeCard(parseCardInput(cardRaw), amount);
    await savePaymentMethod(workspaceId, charged);
    return charged;
  }
  const saved = await PaymentMethod.findOne({
    workspaceId: new Types.ObjectId(workspaceId),
    isDefault: true,
  }).lean();
  if (!saved) {
    throw new ValidationError('Add a card to pay for this plan.');
  }
  return {
    brand: saved.brand,
    last4: saved.last4,
    expMonth: saved.expMonth,
    expYear: saved.expYear,
    holderName: saved.holderName,
  };
}

async function applyPlanChange(workspaceId: string, planKey: PlanKey, opts: { resetPeriod: boolean }) {
  const plan = await Plan.findOne({ key: planKey }).lean();
  if (!plan) throw new ValidationError('Unknown plan.');
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const sub = await Subscription.findOneAndUpdate(
    { workspaceId: new Types.ObjectId(workspaceId) },
    {
      $set: {
        planKey,
        status: 'active',
        participantMinutesIncluded: plan.includedParticipantMinutes,
        ...(opts.resetPeriod
          ? {
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              participantMinutesUsed: 0,
            }
          : {}),
      },
    },
    { returnDocument: 'after' },
  ).lean();
  if (!sub) throw new NotFoundError('Subscription');
  await syncInvoiceForWorkspace(workspaceId);
  return { subscription: sub, plan };
}

export function createBillingService() {
  return {
    async listPlans() {
      const plans = await Plan.find({}).sort({ includedParticipantMinutes: 1 }).lean();
      return plans.map((p) => ({
        key: p.key,
        name: p.name,
        monthlyPrice: p.monthlyPrice ?? 0,
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
              monthlyPrice: plan.monthlyPrice ?? 0,
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
      const current = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
      if (!current) throw new NotFoundError('Subscription');
      const currentPlan = await Plan.findOne({ key: current.planKey }).lean();
      const currentPrice = planMonthlyPrice(current.planKey, currentPlan?.monthlyPrice);
      const nextPrice = planMonthlyPrice(planKey, plan.monthlyPrice);
      if (nextPrice > currentPrice) {
        throw new ValidationError('Paid upgrades require a card. Use checkout to pay and upgrade.');
      }
      return applyPlanChange(workspaceId, planKey, { resetPeriod: false });
    },

    async addMinutes(workspaceId: string, minutes: number): Promise<void> {
      if (minutes <= 0) return;
      await Subscription.updateOne(
        { workspaceId: new Types.ObjectId(workspaceId) },
        { $inc: { participantMinutesUsed: minutes } },
      );
    },

    async listInvoices(workspaceId: string) {
      await syncInvoiceForWorkspace(workspaceId);
      const rows = await Invoice.find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ issuedAt: -1 })
        .exec();
      const invoices = await Promise.all(rows.map((row) => toInvoiceDto(row)));
      return { invoices };
    },

    async getInvoice(workspaceId: string, invoiceId: string) {
      await syncInvoiceForWorkspace(workspaceId);
      const inv = await getInvoiceForWorkspace(workspaceId, invoiceId);
      return toInvoiceDto(inv);
    },

    async payInvoice(
      workspaceId: string,
      invoiceId: string,
      actorRole: WorkspaceRole,
      cardRaw?: unknown,
    ) {
      if (actorRole !== 'owner' && actorRole !== 'admin') {
        throw new ForbiddenError('Only an owner or admin can pay an invoice.');
      }
      const inv = await getInvoiceForWorkspace(workspaceId, invoiceId);
      if (inv.status === 'paid') return toInvoiceDto(inv);
      if (inv.total > 0) {
        await chargeOrUseSavedCard(workspaceId, cardRaw, inv.total);
      }
      const paid = await markInvoicePaid(String(inv._id));
      return toInvoiceDto(paid);
    },

    async listPaymentMethods(workspaceId: string) {
      const rows = await PaymentMethod.find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();
      return { paymentMethods: rows.map(toPaymentMethodDto) };
    },

    async addPaymentMethod(workspaceId: string, actorRole: WorkspaceRole, cardRaw: unknown) {
      if (actorRole !== 'owner' && actorRole !== 'admin') {
        throw new ForbiddenError('Only an owner or admin can add a payment method.');
      }
      const charged = chargeCard(parseCardInput(cardRaw), 0);
      await savePaymentMethod(workspaceId, charged);
      return this.listPaymentMethods(workspaceId);
    },

    async upgradePlan(workspaceId: string, actorRole: WorkspaceRole, planKey: PlanKey, cardRaw?: unknown) {
      if (actorRole !== 'owner') throw new ForbiddenError('Only the owner can change the plan.');
      const plan = await Plan.findOne({ key: planKey }).lean();
      if (!plan) throw new ValidationError('Unknown plan.');
      const current = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
      if (!current) throw new NotFoundError('Subscription');
      const currentPlan = await Plan.findOne({ key: current.planKey }).lean();
      const currentPrice = planMonthlyPrice(current.planKey, currentPlan?.monthlyPrice);
      const nextPrice = planMonthlyPrice(planKey, plan.monthlyPrice);

      if (nextPrice > currentPrice) {
        await chargeOrUseSavedCard(workspaceId, cardRaw, nextPrice);
      }

      const changed = await applyPlanChange(workspaceId, planKey, { resetPeriod: nextPrice > currentPrice });
      const invoiceDoc = await syncInvoiceForWorkspace(workspaceId);
      if (invoiceDoc && invoiceDoc.total > 0 && invoiceDoc.status === 'issued') {
        await markInvoicePaid(String(invoiceDoc._id));
      }
      const invoice = invoiceDoc ? await toInvoiceDto(await getInvoiceForWorkspace(workspaceId, String(invoiceDoc._id))) : null;
      const methods = await this.listPaymentMethods(workspaceId);
      logger.info('Workspace plan upgraded', { workspaceId, planKey, charged: nextPrice > currentPrice });
      return { ...changed, invoice, paymentMethods: methods.paymentMethods };
    },
  };
}

export const billingService = createBillingService();
