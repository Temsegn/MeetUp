import mongoose, { Document, Schema } from 'mongoose';
import type { PlanKey } from './Plan.model';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled';

export interface ISubscription extends Document {
  workspaceId: mongoose.Types.ObjectId;
  planKey: PlanKey;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  participantMinutesUsed: number;
  participantMinutesIncluded: number;
  stripeCustomerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    planKey: { type: String, enum: ['free', 'pro', 'enterprise'], required: true },
    status: { type: String, enum: ['active', 'past_due', 'cancelled'], default: 'active' },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    participantMinutesUsed: { type: Number, default: 0 },
    participantMinutesIncluded: { type: Number, required: true },
    stripeCustomerId: { type: String, default: null },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
