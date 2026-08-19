import mongoose, { Document, Schema } from 'mongoose';

/**
 * Single-use email-verification token.
 *
 * Only the SHA-256 HASH of the token is stored. `usedAt` enforces
 * single-use; `expiresAt` drives a TTL index for automatic cleanup.
 */
export interface IEmailVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerificationToken = mongoose.model<IEmailVerificationToken>(
  'EmailVerificationToken',
  emailVerificationTokenSchema
);
