import { Types } from 'mongoose';
import { Invoice, type IInvoice } from '../../database/models/Invoice.model';
import { Plan, type PlanKey } from '../../database/models/Plan.model';
import { Subscription } from '../../database/models/Subscription.model';
import { Workspace } from '../../database/models/Workspace.model';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';

export const PLAN_MONTHLY: Record<string, number> = { free: 0, pro: 49, enterprise: 299 };

export function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function planMonthlyPrice(key: string, stored?: number | null): number {
  if (typeof stored === 'number' && Number.isFinite(stored)) return stored;
  return PLAN_MONTHLY[key] ?? 0;
}

export type InvoiceDto = {
  id: string;
  number: string;
  workspaceId: string;
  organization: string;
  email: string;
  status: string;
  planKey: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  periodStart: Date;
  periodEnd: Date;
  lineItems: Array<{ description: string; quantity: number; unitAmount: number; amount: number }>;
  issuedAt: Date;
  paidAt: Date | null;
  dueAt: Date;
  notes: string;
};

export async function toInvoiceDto(inv: IInvoice): Promise<InvoiceDto> {
  const w = await Workspace.findById(inv.workspaceId).lean();
  return {
    id: String(inv._id),
    number: inv.number,
    workspaceId: String(inv.workspaceId),
    organization: w?.name ?? '—',
    email: w?.email || '',
    status: inv.status,
    planKey: inv.planKey,
    currency: inv.currency,
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    lineItems: inv.lineItems.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitAmount: i.unitAmount,
      amount: i.amount,
    })),
    issuedAt: inv.issuedAt,
    paidAt: inv.paidAt,
    dueAt: inv.dueAt,
    notes: inv.notes,
  };
}

export async function syncInvoiceForWorkspace(workspaceId: string): Promise<IInvoice | null> {
  if (!Types.ObjectId.isValid(workspaceId)) return null;
  const sub = await Subscription.findOne({ workspaceId: new Types.ObjectId(workspaceId) });
  if (!sub) return null;

  const plan = await Plan.findOne({ key: sub.planKey }).lean();
  const base = planMonthlyPrice(sub.planKey, plan?.monthlyPrice);
  const overageMin = Math.max(0, sub.participantMinutesUsed - sub.participantMinutesIncluded);
  const overageRate = plan?.overageRatePerMinute ?? 0;
  const overageAmt = money(overageMin * overageRate);
  const lineItems = [
    {
      description: `${plan?.name ?? sub.planKey} plan · monthly`,
      quantity: 1,
      unitAmount: base,
      amount: base,
    },
  ];
  if (overageMin > 0) {
    lineItems.push({
      description: `Participant-minute overage`,
      quantity: overageMin,
      unitAmount: overageRate,
      amount: overageAmt,
    });
  }
  const subtotal = money(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const tax = 0;
  const total = money(subtotal + tax);
  const autoPaid = total <= 0;

  const existing = await Invoice.findOne({
    workspaceId: sub.workspaceId,
    periodStart: sub.currentPeriodStart,
  });
  if (existing) {
    if (existing.status === 'issued') {
      existing.lineItems = lineItems;
      existing.subtotal = subtotal;
      existing.tax = tax;
      existing.total = total;
      existing.planKey = sub.planKey as PlanKey;
      existing.periodEnd = sub.currentPeriodEnd;
      existing.dueAt = sub.currentPeriodEnd;
      if (autoPaid) {
        existing.status = 'paid';
        existing.paidAt = existing.paidAt ?? new Date();
      }
      await existing.save();
    }
    return existing;
  }

  const y = sub.currentPeriodStart.getUTCFullYear();
  const m = String(sub.currentPeriodStart.getUTCMonth() + 1).padStart(2, '0');
  const suffix = String(sub.workspaceId).slice(-6).toUpperCase();
  const number = `INV-${y}${m}-${suffix}`;

  try {
    return await Invoice.create({
      workspaceId: sub.workspaceId,
      number,
      status: autoPaid ? 'paid' : 'issued',
      planKey: sub.planKey,
      currency: 'USD',
      subtotal,
      tax,
      total,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      lineItems,
      issuedAt: new Date(),
      paidAt: autoPaid ? new Date() : null,
      dueAt: sub.currentPeriodEnd,
      notes: 'Generated from workspace plan and participant-minute usage.',
    });
  } catch (err) {
    const dup = await Invoice.findOne({
      workspaceId: sub.workspaceId,
      periodStart: sub.currentPeriodStart,
    });
    if (dup) return dup;
    throw err;
  }
}

export async function syncAllInvoices(): Promise<void> {
  const subs = await Subscription.find().select('workspaceId').lean();
  for (const s of subs) {
    await syncInvoiceForWorkspace(String(s.workspaceId));
  }
}

export async function getInvoiceForWorkspace(workspaceId: string, invoiceId: string): Promise<IInvoice> {
  if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundError('Invoice');
  const inv = await Invoice.findOne({
    _id: invoiceId,
    workspaceId: new Types.ObjectId(workspaceId),
  });
  if (!inv) throw new NotFoundError('Invoice');
  return inv;
}

export async function markInvoicePaid(invoiceId: string): Promise<IInvoice> {
  if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundError('Invoice');
  const inv = await Invoice.findById(invoiceId);
  if (!inv) throw new NotFoundError('Invoice');
  if (inv.status === 'void') throw new ValidationError('Void invoices cannot be paid.');
  if (inv.status === 'paid') return inv;
  inv.status = 'paid';
  inv.paidAt = new Date();
  await inv.save();
  return inv;
}
