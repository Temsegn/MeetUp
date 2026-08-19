import { Types } from 'mongoose';
import { User } from '../../database/models/User.model';
import { RefreshSession } from '../../database/models/RefreshSession.model';
import { PasswordResetToken } from '../../database/models/PasswordResetToken.model';
import { EmailVerificationToken } from '../../database/models/EmailVerificationToken.model';
import { LoginAttempt } from '../../database/models/LoginAttempt.model';
import { AuditLog, AuditAction } from '../../database/models/AuditLog.model';
import {
  UserRecord,
  SessionRecord,
  PasswordResetTokenRecord,
  EmailVerificationTokenRecord,
} from './auth.types';

/**
 * Data-access layer for the auth module.
 *
 * Services depend on this interface (via AuthDeps) and NEVER touch Mongoose
 * directly. Tests inject in-memory stubs; production uses the real repo.
 * All functions return plain records — no Mongoose documents leak upward.
 */

export interface NewSessionData {
  userId: string;
  tokenHash: string;
  familyId: string;
  rememberMe: boolean;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
}

export interface AuditEntry {
  action: AuditAction;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthDeps {
  // ── Users ──────────────────────────────────────────────────────────────
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  updateUserPassword(userId: string, passwordHash: string, changedAt: Date): Promise<void>;
  markEmailVerified(userId: string, at: Date): Promise<void>;

  // ── Refresh sessions ───────────────────────────────────────────────────
  createSession(data: NewSessionData): Promise<SessionRecord>;
  findSessionByTokenHash(hash: string): Promise<SessionRecord | null>;
  /** Looks up a rotated-out token hash — presence means token reuse. */
  findSessionByPreviousHash(hash: string): Promise<SessionRecord | null>;
  rotateSession(
    sessionId: string,
    newHash: string,
    previousHash: string,
    at: Date
  ): Promise<void>;
  revokeSession(sessionId: string, reason: string, at: Date): Promise<void>;
  revokeSessionFamily(familyId: string, reason: string, at: Date): Promise<number>;
  revokeUserSessions(
    userId: string,
    opts: { exceptSessionId?: string; reason: string; at: Date }
  ): Promise<number>;
  findUserSessions(userId: string): Promise<SessionRecord[]>;
  /** Ownership-scoped lookup for DELETE /sessions/:id. */
  findSessionByIdForUser(sessionId: string, userId: string): Promise<SessionRecord | null>;

  // ── Password-reset tokens ──────────────────────────────────────────────
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord>;
  findPasswordResetTokenByHash(hash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(id: string, at: Date): Promise<void>;
  /** Invalidate all outstanding reset tokens for a user (e.g. before issuing a new one). */
  revokeUserPasswordResetTokens(userId: string): Promise<number>;

  // ── Email-verification tokens ──────────────────────────────────────────
  createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenRecord>;
  findEmailVerificationTokenByHash(
    hash: string
  ): Promise<EmailVerificationTokenRecord | null>;
  markEmailVerificationTokenUsed(id: string, at: Date): Promise<void>;
  revokeUserEmailVerificationTokens(userId: string): Promise<number>;

  // ── Login attempts (brute-force lockout) ───────────────────────────────
  countRecentLoginFailures(email: string, ip: string, windowMs: number): Promise<number>;
  recordLoginAttempt(data: { email: string; ip: string; succeeded: boolean }): Promise<void>;

  // ── Audit logging (fire-and-forget) ────────────────────────────────────
  audit(entry: AuditEntry): void;
}

const toObjectId = (id: string) => new Types.ObjectId(id);

// ── Document → record mappers ───────────────────────────────────────────────

const toUserRecord = (u: any): UserRecord => ({
  id: u.id ?? String(u._id),
  name: u.name,
  email: u.email,
  passwordHash: u.passwordHash,
  avatarColor: u.avatarColor,
  emailVerifiedAt: u.emailVerifiedAt ?? null,
  passwordChangedAt: u.passwordChangedAt ?? null,
  createdAt: u.createdAt,
});

const toSessionRecord = (s: any): SessionRecord => ({
  id: s.id ?? String(s._id),
  userId: String(s.userId),
  tokenHash: s.tokenHash,
  previousTokenHash: s.previousTokenHash,
  familyId: s.familyId,
  rememberMe: s.rememberMe,
  userAgent: s.userAgent,
  ip: s.ip,
  createdAt: s.createdAt,
  lastUsedAt: s.lastUsedAt,
  expiresAt: s.expiresAt,
  revokedAt: s.revokedAt ?? null,
});

const toResetTokenRecord = (t: any): PasswordResetTokenRecord => ({
  id: t.id ?? String(t._id),
  userId: String(t.userId),
  tokenHash: t.tokenHash,
  createdAt: t.createdAt,
  expiresAt: t.expiresAt,
  usedAt: t.usedAt ?? null,
});

const toVerificationTokenRecord = (t: any): EmailVerificationTokenRecord => ({
  id: t.id ?? String(t._id),
  userId: String(t.userId),
  tokenHash: t.tokenHash,
  createdAt: t.createdAt,
  expiresAt: t.expiresAt,
  usedAt: t.usedAt ?? null,
});

/** Production implementation backed by Mongoose models. */
export const authRepository: AuthDeps = {
  // ── Users ──────────────────────────────────────────────────────────────
  findUserByEmail: async (email) => {
    const u = await User.findOne({ email }).exec();
    return u ? toUserRecord(u) : null;
  },
  findUserById: async (id) => {
    const u = await User.findById(id).exec();
    return u ? toUserRecord(u) : null;
  },
  createUser: async (data) => {
    const u = await User.create(data);
    return toUserRecord(u);
  },
  updateUserPassword: async (userId, passwordHash, changedAt) => {
    await User.updateOne(
      { _id: toObjectId(userId) },
      { $set: { passwordHash, passwordChangedAt: changedAt } }
    );
  },
  markEmailVerified: async (userId, at) => {
    await User.updateOne({ _id: toObjectId(userId) }, { $set: { emailVerifiedAt: at } });
  },

  // ── Refresh sessions ───────────────────────────────────────────────────
  createSession: async (data) => {
    const s = await RefreshSession.create({
      ...data,
      userId: toObjectId(data.userId),
      lastUsedAt: new Date(),
    });
    return toSessionRecord(s);
  },
  findSessionByTokenHash: async (hash) => {
    const s = await RefreshSession.findOne({ tokenHash: hash }).exec();
    return s ? toSessionRecord(s) : null;
  },
  findSessionByPreviousHash: async (hash) => {
    const s = await RefreshSession.findOne({ previousTokenHash: hash }).exec();
    return s ? toSessionRecord(s) : null;
  },
  rotateSession: async (sessionId, newHash, previousHash, at) => {
    await RefreshSession.updateOne(
      { _id: toObjectId(sessionId) },
      { $set: { tokenHash: newHash, previousTokenHash: previousHash, lastUsedAt: at } }
    );
  },
  revokeSession: async (sessionId, reason, at) => {
    await RefreshSession.updateOne(
      { _id: toObjectId(sessionId) },
      { $set: { revokedAt: at, revokedReason: reason } }
    );
  },
  revokeSessionFamily: async (familyId, reason, at) => {
    const res = await RefreshSession.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } }
    );
    return res.modifiedCount ?? 0;
  },
  revokeUserSessions: async (userId, { exceptSessionId, reason, at }) => {
    const query: Record<string, unknown> = { userId: toObjectId(userId), revokedAt: null };
    if (exceptSessionId) query['_id'] = { $ne: toObjectId(exceptSessionId) };
    const res = await RefreshSession.updateMany(query, {
      $set: { revokedAt: at, revokedReason: reason },
    });
    return res.modifiedCount ?? 0;
  },
  findUserSessions: async (userId) => {
    const sessions = await RefreshSession.find({
      userId: toObjectId(userId),
      revokedAt: null,
    })
      .sort({ lastUsedAt: -1 })
      .exec();
    return sessions.map(toSessionRecord);
  },
  findSessionByIdForUser: async (sessionId, userId) => {
    const s = await RefreshSession.findOne({
      _id: toObjectId(sessionId),
      userId: toObjectId(userId),
    }).exec();
    return s ? toSessionRecord(s) : null;
  },

  // ── Password-reset tokens ──────────────────────────────────────────────
  createPasswordResetToken: async (data) => {
    const t = await PasswordResetToken.create({
      ...data,
      userId: toObjectId(data.userId),
    });
    return toResetTokenRecord(t);
  },
  findPasswordResetTokenByHash: async (hash) => {
    const t = await PasswordResetToken.findOne({ tokenHash: hash }).exec();
    return t ? toResetTokenRecord(t) : null;
  },
  markPasswordResetTokenUsed: async (id, at) => {
    await PasswordResetToken.updateOne({ _id: toObjectId(id) }, { $set: { usedAt: at } });
  },
  revokeUserPasswordResetTokens: async (userId) => {
    const res = await PasswordResetToken.deleteMany({
      userId: toObjectId(userId),
      usedAt: null,
    });
    return res.deletedCount ?? 0;
  },

  // ── Email-verification tokens ──────────────────────────────────────────
  createEmailVerificationToken: async (data) => {
    const t = await EmailVerificationToken.create({
      ...data,
      userId: toObjectId(data.userId),
    });
    return toVerificationTokenRecord(t);
  },
  findEmailVerificationTokenByHash: async (hash) => {
    const t = await EmailVerificationToken.findOne({ tokenHash: hash }).exec();
    return t ? toVerificationTokenRecord(t) : null;
  },
  markEmailVerificationTokenUsed: async (id, at) => {
    await EmailVerificationToken.updateOne({ _id: toObjectId(id) }, { $set: { usedAt: at } });
  },
  revokeUserEmailVerificationTokens: async (userId) => {
    const res = await EmailVerificationToken.deleteMany({
      userId: toObjectId(userId),
      usedAt: null,
    });
    return res.deletedCount ?? 0;
  },

  // ── Login attempts ─────────────────────────────────────────────────────
  countRecentLoginFailures: async (email, ip, windowMs) => {
    const since = new Date(Date.now() - windowMs);
    return LoginAttempt.countDocuments({
      email,
      ip,
      succeeded: false,
      createdAt: { $gte: since },
    });
  },
  recordLoginAttempt: async (data) => {
    await LoginAttempt.create({ ...data, createdAt: new Date() });
  },

  // ── Audit logging ──────────────────────────────────────────────────────
  audit: (entry) => {
    const { userId, ...rest } = entry;
    AuditLog.create({
      ...rest,
      userId: userId ? toObjectId(userId) : undefined,
    }).catch((err: unknown) => {
      // Audit must never break the request path.
      console.error(
        'Audit log write failed',
        { err: err instanceof Error ? err.message : String(err) }
      );
    });
  },
};
