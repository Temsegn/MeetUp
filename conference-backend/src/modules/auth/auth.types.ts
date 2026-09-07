import { Request } from 'express';
import { DEFAULT_USER_SETTINGS, type IUserSettings } from '../../database/models/User.model';
import type { WorkspaceRole } from '../workspace/workspace.types';

/**
 * Plain record shapes produced by the repository and consumed by services.
 * Keeping services free of Mongoose documents makes them trivially testable.
 */

export type UserSettings = IUserSettings;

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  authProvider: 'local' | 'google';
  googleId: string | null;
  avatarColor: string;
  avatarUrl: string | null;
  jobTitle: string;
  department: string;
  phone: string;
  mustChangePassword: boolean;
  settings: UserSettings;
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  previousTokenHash?: string;
  familyId: string;
  rememberMe: boolean;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

/** Public user shape — never exposes passwordHash or internal flags. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl: string | null;
  jobTitle: string;
  department: string;
  phone: string;
  mustChangePassword: boolean;
  settings: UserSettings;
  authProvider: 'local' | 'google';
  emailVerified: boolean;
  createdAt: string;
}

/** Access token payload returned to the client (never the refresh token). */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

/** One entry of the sessions list endpoint. */
export interface SessionInfo {
  id: string;
  current: boolean;
  rememberMe: boolean;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

/** Express request that has gone through authenticate / optional-auth. */
export interface AuthRequest extends Request {
  user?: UserRecord;
  /** Refresh-session id that minted the current access token (authenticated flows). */
  sessionId?: string;
  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
}

/** Context captured from a request for audit + session metadata. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

function mergeSettings(raw: unknown): UserSettings {
  const base = structuredClone(DEFAULT_USER_SETTINGS);
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<UserSettings>;
  return {
    notifications: { ...base.notifications, ...(s.notifications ?? {}) },
    audioVideo: { ...base.audioVideo, ...(s.audioVideo ?? {}) },
    recording: { ...base.recording, ...(s.recording ?? {}) },
    security: { ...base.security, ...(s.security ?? {}) },
    integrations: { ...base.integrations, ...(s.integrations ?? {}) },
    language: s.language ?? base.language,
    appearance: s.appearance ?? base.appearance,
    account: { ...base.account, ...(s.account ?? {}) },
  };
}

export function toSafeUser(u: UserRecord): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    avatarUrl: u.avatarUrl ?? null,
    jobTitle: u.jobTitle ?? '',
    department: u.department ?? '',
    phone: u.phone ?? '',
    mustChangePassword: Boolean(u.mustChangePassword),
    settings: mergeSettings(u.settings),
    authProvider: u.authProvider ?? 'local',
    emailVerified: Boolean(u.emailVerifiedAt),
    createdAt: u.createdAt.toISOString(),
  };
}

/** Extract IP + user agent from an Express request for audit/session metadata. */
export function getRequestContext(req: Request): RequestContext {
  return {
    ip: req.ip ?? undefined,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

export { mergeSettings, DEFAULT_USER_SETTINGS };
