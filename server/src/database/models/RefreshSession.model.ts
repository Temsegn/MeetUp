import mongoose, { Document, Schema } from 'mongoose';

/**
 * Server-side refresh-token session.
 *
 * Security model:
 *  - Only a SHA-256 HASH of the refresh token is stored (token-hasher),
 *    never the token itself. A DB leak does not expose usable tokens.
 *  - `familyId` groups rotations of the same login so refresh-token REUSE
 *    (a rotated-out token presented again) revokes the whole family.
 *  - `previousTokenHash` retains the last rotated-out hash so a single
 *    replay of the immediately-previous token is detectable.
 *  - `expiresAt` drives a MongoDB TTL index that auto-deletes expired
 *    sessions, so expired sessions cannot be refreshed.
 */
export interface IRefreshSession extends Document {
  userId: mongoose.Types.ObjectId;
  /** SHA-256 hash of the CURRENT valid refresh token. */
  tokenHash: string;
  /** SHA-256 hash of the previously-rotated-out refresh token (reuse detection). */
  previousTokenHash?: string;
  /** Stable id shared by every rotation of one login (device session family). */
  familyId: string;
  rememberMe: boolean;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt: Date;
  /** Absolute expiry — rotations NEVER extend it. */
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string;
}

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String },
    familyId: { type: String, required: true, index: true },
    rememberMe: { type: Boolean, required: true, default: false },
    userAgent: { type: String, default: undefined },
    ip: { type: String, default: undefined },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: undefined },
  },
  { versionKey: false }
);

// Auto-expire sessions — MongoDB TTL monitor sweeps ~every 60s.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup of all live sessions for a user (sessions page, logout-all).
refreshSessionSchema.index({ userId: 1, revokedAt: 1 });

export const RefreshSession = mongoose.model<IRefreshSession>(
  'RefreshSession',
  refreshSessionSchema
);
