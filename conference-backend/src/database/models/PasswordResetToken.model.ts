import mongoose, { Document, Schema } from 'mongoose';

/**
 * Single-use password-reset token.
 *
 * Only the SHA-256 HASH of the token is stored (never the token itself).
 * `usedAt` enforces single-use; `expiresAt` drives a TTL index so stale
 * tokens are deleted automatically.
 */
export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>(
  'PasswordResetToken',
  passwordResetTokenSchema
);
