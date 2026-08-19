import { Request } from 'express';

/**
 * Plain record shapes produced by the repository and consumed by services.
 * Keeping services free of Mongoose documents makes them trivially testable.
 */

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
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
}

/** Context captured from a request for audit + session metadata. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export function toSafeUser(u: UserRecord): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
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
