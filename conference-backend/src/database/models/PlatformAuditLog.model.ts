import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformAuditLog extends Document {
  at: Date;
  actorUserId: mongoose.Types.ObjectId | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  result: 'success' | 'failure';
  payload: Record<string, unknown>;
  ip: string;
}

const schema = new Schema<IPlatformAuditLog>(
  {
    at: { type: Date, default: () => new Date(), index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    payload: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: false },
);

export const PlatformAuditLog = mongoose.model<IPlatformAuditLog>('PlatformAuditLog', schema);
