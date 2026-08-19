/**
 * In-memory AuthDeps implementation for unit tests.
 *
 * Services are tested against this stub (no MongoDB, no network, no mail
 * server). State is exposed so tests can inspect sessions/tokens/audits and
 * mutate fields (e.g. force-expire a session).
 */
import { AuthDeps, AuditEntry } from '../auth.repository';
import { hashPassword } from '../security/password-hasher';
import {
  UserRecord,
  SessionRecord,
  PasswordResetTokenRecord,
  EmailVerificationTokenRecord,
} from '../auth.types';

export interface StubState {
  users: Map<string, UserRecord>;
  sessions: Map<string, SessionRecord>;
  resetTokens: Map<string, PasswordResetTokenRecord>;
  verifyTokens: Map<string, EmailVerificationTokenRecord>;
  attempts: { email: string; ip: string; succeeded: boolean; createdAt: Date }[];
  audits: AuditEntry[];
}

export function makeStubDeps(overrides: Partial<AuthDeps> = {}) {
  const state: StubState = {
    users: new Map(),
    sessions: new Map(),
    resetTokens: new Map(),
    verifyTokens: new Map(),
    attempts: [],
    audits: [],
  };

  let userSeq = 0;
  let sessionSeq = 0;
  let tokenSeq = 0;

  const deps: AuthDeps = {
    // ── Users ──────────────────────────────────────────────────────────
    findUserByEmail: async (email) =>
      [...state.users.values()].find((u) => u.email === email) ?? null,
    findUserById: async (id) => state.users.get(id) ?? null,
    createUser: async (data) => {
      const user: UserRecord = {
        id: `u${++userSeq}`,
        ...data,
        avatarColor: 'hsl(210, 60%, 50%)',
        emailVerifiedAt: null,
        passwordChangedAt: null,
        createdAt: new Date(),
      };
      state.users.set(user.id, user);
      return user;
    },
    updateUserPassword: async (userId, passwordHash, changedAt) => {
      const u = state.users.get(userId);
      if (u) {
        u.passwordHash = passwordHash;
        u.passwordChangedAt = changedAt;
      }
    },
    markEmailVerified: async (userId, at) => {
      const u = state.users.get(userId);
      if (u) u.emailVerifiedAt = at;
    },

    // ── Sessions ───────────────────────────────────────────────────────
    createSession: async (data) => {
      const s: SessionRecord = {
        id: `s${++sessionSeq}`,
        ...data,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };
      state.sessions.set(s.id, s);
      return s;
    },
    findSessionByTokenHash: async (hash) =>
      [...state.sessions.values()].find((s) => s.tokenHash === hash) ?? null,
    findSessionByPreviousHash: async (hash) =>
      [...state.sessions.values()].find((s) => s.previousTokenHash === hash) ?? null,
    rotateSession: async (sessionId, newHash, previousHash, at) => {
      const s = state.sessions.get(sessionId);
      if (s) {
        s.tokenHash = newHash;
        s.previousTokenHash = previousHash;
        s.lastUsedAt = at;
      }
    },
    revokeSession: async (sessionId, reason, at) => {
      const s = state.sessions.get(sessionId);
      if (s) {
        s.revokedAt = at;
        s.revokedReason = reason;
      }
    },
    revokeSessionFamily: async (familyId, reason, at) => {
      let n = 0;
      for (const s of state.sessions.values()) {
        if (s.familyId === familyId && !s.revokedAt) {
          s.revokedAt = at;
          s.revokedReason = reason;
          n++;
        }
      }
      return n;
    },
    revokeUserSessions: async (userId, { exceptSessionId, reason, at }) => {
      let n = 0;
      for (const s of state.sessions.values()) {
        if (s.userId === userId && !s.revokedAt && s.id !== exceptSessionId) {
          s.revokedAt = at;
          s.revokedReason = reason;
          n++;
        }
      }
      return n;
    },
    findUserSessions: async (userId) =>
      [...state.sessions.values()]
        .filter((s) => s.userId === userId && !s.revokedAt)
        .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()),
    findSessionByIdForUser: async (sessionId, userId) => {
      const s = state.sessions.get(sessionId);
      return s && s.userId === userId ? s : null;
    },

    // ── Password-reset tokens ───────────────────────────────────────────
    createPasswordResetToken: async (data) => {
      const t: PasswordResetTokenRecord = {
        id: `rt${++tokenSeq}`,
        ...data,
        createdAt: new Date(),
      };
      state.resetTokens.set(t.id, t);
      return t;
    },
    findPasswordResetTokenByHash: async (hash) =>
      [...state.resetTokens.values()].find((t) => t.tokenHash === hash) ?? null,
    markPasswordResetTokenUsed: async (id, at) => {
      const t = state.resetTokens.get(id);
      if (t) t.usedAt = at;
    },
    revokeUserPasswordResetTokens: async (userId) => {
      let n = 0;
      for (const [id, t] of state.resetTokens) {
        if (t.userId === userId && !t.usedAt) {
          state.resetTokens.delete(id);
          n++;
        }
      }
      return n;
    },

    // ── Email-verification tokens ───────────────────────────────────────
    createEmailVerificationToken: async (data) => {
      const t: EmailVerificationTokenRecord = {
        id: `vt${++tokenSeq}`,
        ...data,
        createdAt: new Date(),
      };
      state.verifyTokens.set(t.id, t);
      return t;
    },
    findEmailVerificationTokenByHash: async (hash) =>
      [...state.verifyTokens.values()].find((t) => t.tokenHash === hash) ?? null,
    markEmailVerificationTokenUsed: async (id, at) => {
      const t = state.verifyTokens.get(id);
      if (t) t.usedAt = at;
    },
    revokeUserEmailVerificationTokens: async (userId) => {
      let n = 0;
      for (const [id, t] of state.verifyTokens) {
        if (t.userId === userId && !t.usedAt) {
          state.verifyTokens.delete(id);
          n++;
        }
      }
      return n;
    },

    // ── Login attempts ──────────────────────────────────────────────────
    countRecentLoginFailures: async (email, ip, windowMs) =>
      state.attempts.filter(
        (a) =>
          a.email === email &&
          a.ip === ip &&
          !a.succeeded &&
          a.createdAt.getTime() > Date.now() - windowMs
      ).length,
    recordLoginAttempt: async (data) => {
      state.attempts.push({ ...data, createdAt: new Date() });
    },

    // ── Audit ───────────────────────────────────────────────────────────
    audit: (entry) => {
      state.audits.push(entry);
    },
  };

  return { deps: { ...deps, ...overrides }, state };
}

/** Seed a user whose passwordHash matches `password` (real bcrypt, fast cost in tests). */
export async function seedUser(
  deps: AuthDeps,
  opts: { email?: string; password?: string; name?: string; verified?: boolean } = {}
): Promise<{ user: UserRecord; password: string }> {
  const password = opts.password ?? 'StrongPass123';
  const passwordHash = await hashPassword(password);
  const user = await deps.createUser({
    name: opts.name ?? 'Test User',
    email: opts.email ?? 'test@example.com',
    passwordHash,
  });
  if (opts.verified) await deps.markEmailVerified(user.id, new Date());
  return { user, password };
}

export const IP = '203.0.113.7';
export const UA = 'test-agent/1.0';
