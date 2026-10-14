import mongoose, { Document, Schema } from 'mongoose';

export type InviteDeliveryKind = 'invite' | 'update' | 'cancel';
export type InviteDeliveryStatus = 'pending' | 'accepted' | 'failed' | 'skipped';

export interface IMeetingInviteDelivery extends Document {
  meetingId: mongoose.Types.ObjectId;
  email: string;
  kind: InviteDeliveryKind;
  sequence: number;
  /** Unique: meetingId|email|kind|sequence */
  idempotencyKey: string;
  status: InviteDeliveryStatus;
  attempts: number;
  lastError?: string | null;
  messageId?: string | null;
  smtpMode?: 'smtp' | 'console' | null;
  nextAttemptAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const meetingInviteDeliverySchema = new Schema<IMeetingInviteDelivery>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    kind: { type: String, enum: ['invite', 'update', 'cancel'], required: true },
    sequence: { type: Number, required: true, min: 0 },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: null },
    messageId: { type: String, default: null },
    smtpMode: { type: String, enum: ['smtp', 'console'], default: null },
    nextAttemptAt: { type: Date, default: null },
  },
  { timestamps: true },
);

meetingInviteDeliverySchema.index(
  { status: 1, nextAttemptAt: 1 },
  { name: 'meeting_invite_delivery_sweep' },
);

meetingInviteDeliverySchema.index({ meetingId: 1, email: 1, sequence: -1 });

export function buildInviteIdempotencyKey(
  meetingId: string,
  email: string,
  kind: InviteDeliveryKind,
  sequence: number,
): string {
  return `${meetingId}|${email.trim().toLowerCase()}|${kind}|${sequence}`;
}

export const MeetingInviteDelivery = mongoose.model<IMeetingInviteDelivery>(
  'MeetingInviteDelivery',
  meetingInviteDeliverySchema,
);
