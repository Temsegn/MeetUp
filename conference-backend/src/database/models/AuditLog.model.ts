import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only security/audit event log.
 *
 * Never mutate documents — write new events only. Keep metadata small and
 * free of secrets (no tokens, no password hashes, no reset links).
 * Retention/purging is an ops concern (TTL index or scheduled job).
 */
export type AuditAction =
  | 'SIGNUP'
  | 'SIGNUP_DUPLICATE'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_LOCKED'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'SESSION_REVOKED'
  | 'TOKEN_REFRESHED'
  | 'REFRESH_REUSE_DETECTED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_RESET_TOKEN_INVALID'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFICATION_SENT'
  | 'EMAIL_VERIFIED'
  | 'EMAIL_VERIFICATION_INVALID'
  | 'ACCESS_DENIED';

export interface IAuditLog extends Document {
  action: AuditAction;
  /** userId when the event relates to an account, otherwise undefined. */
  userId?: mongoose.Types.ObjectId;
  /** Normalized email when known (helps correlate without an account id). */
  email?: string;
  ip?: string;
  userAgent?: string;
  /** Small structured context — never secrets. */
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined, index: true },
    email: { type: String, default: undefined, index: true },
    ip: { type: String, default: undefined },
    userAgent: { type: String, default: undefined },
    metadata: { type: Schema.Types.Mixed, default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Typical audit queries: "everything for this user" or "this action recently".
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
