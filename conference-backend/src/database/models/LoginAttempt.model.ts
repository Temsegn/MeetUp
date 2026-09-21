import mongoose, { Document, Schema } from 'mongoose';

/**
 * Failed-login attempt record, used for per-account + per-IP lockout.
 *
 * Records are written for BOTH existing and non-existing emails so the
 * lockout response cannot be used as an account-enumeration oracle
 * (an attacker probing random emails hits the same threshold and gets the
 * same generic response as a real account under attack).
 *
 * A TTL index on `createdAt` keeps only a recent window of attempts.
 */
export interface ILoginAttempt extends Document {
  /** Normalized (lowercased, trimmed) email — may not correspond to a user. */
  email: string;
  ip: string;
  succeeded: boolean;
  createdAt: Date;
}

const loginAttemptSchema = new Schema<ILoginAttempt>(
  {
    email: { type: String, required: true, index: true },
    ip: { type: String, required: true, index: true },
    succeeded: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Lockout query: recent failures for (email, ip).
loginAttemptSchema.index({ email: 1, ip: 1, createdAt: -1 });
// Auto-purge attempts older than the lockout window (keep a little slack).
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export const LoginAttempt = mongoose.model<ILoginAttempt>(
  'LoginAttempt',
  loginAttemptSchema
);
