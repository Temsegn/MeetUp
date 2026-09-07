import mongoose, { Document, Schema } from 'mongoose';

export type PlanKey = 'free' | 'pro' | 'enterprise';

export interface IPlanFeatures {
  messages: boolean;
  reports: boolean;
  waitingRoom: boolean;
  autoRecord: boolean;
}

export interface IPlan extends Document {
  key: PlanKey;
  name: string;
  includedParticipantMinutes: number;
  overageRatePerMinute: number;
  maxMembers: number;
  maxConcurrentMeetings: number;
  recordingStorageGb: number;
  features: IPlanFeatures;
}

const planSchema = new Schema<IPlan>(
  {
    key: { type: String, enum: ['free', 'pro', 'enterprise'], required: true, unique: true },
    name: { type: String, required: true },
    includedParticipantMinutes: { type: Number, required: true },
    overageRatePerMinute: { type: Number, required: true, default: 0 },
    maxMembers: { type: Number, required: true },
    maxConcurrentMeetings: { type: Number, required: true },
    recordingStorageGb: { type: Number, required: true },
    features: {
      messages: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      waitingRoom: { type: Boolean, default: true },
      autoRecord: { type: Boolean, default: false },
    },
  },
  { timestamps: false },
);

export const Plan = mongoose.model<IPlan>('Plan', planSchema);

export const DEFAULT_PLANS: Array<Omit<IPlan, keyof Document>> = [
  {
    key: 'free',
    name: 'Free',
    includedParticipantMinutes: 500,
    overageRatePerMinute: 0.004,
    maxMembers: 5,
    maxConcurrentMeetings: 1,
    recordingStorageGb: 2,
    features: { messages: true, reports: false, waitingRoom: true, autoRecord: false },
  },
  {
    key: 'pro',
    name: 'Pro',
    includedParticipantMinutes: 10000,
    overageRatePerMinute: 0.002,
    maxMembers: 50,
    maxConcurrentMeetings: 10,
    recordingStorageGb: 50,
    features: { messages: true, reports: true, waitingRoom: true, autoRecord: true },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    includedParticipantMinutes: 100000,
    overageRatePerMinute: 0.001,
    maxMembers: 1000,
    maxConcurrentMeetings: 100,
    recordingStorageGb: 500,
    features: { messages: true, reports: true, waitingRoom: true, autoRecord: true },
  },
];
