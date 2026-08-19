import { AuthError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { hashToken } from '../security/token-hasher';
import { generateSecureToken, generateHexId } from '../security/token-generator';
import {
  REMEMBER_ME_TTL_SECONDS,
  REFRESH_SESSION_TTL_SECONDS,
} from '../auth.constants';
import { RequestContext, SessionRecord, UserRecord } from '../auth.types';

/**
 * Refresh-session lifecycle: creation, rotation, reuse detection, revocation.
 *
 * Rotation model (per OWASP / Auth0 guidance):
 *   - Every refresh issues a NEW opaque token and stores only its hash.
 *   - The previous token's hash is kept in `previousTokenHash` so a replay
 *     of the immediately-rotated-out token is detected as REUSE, which
 *     revokes the ENTIRE session family (the token may be stolen).
 *   - Sessions have an absolute `expiresAt` — rotation never extends it, so
 *     Remember Me (7 days) is a hard cap, not a rolling window.
 */

export interface CreatedSession {
  session: SessionRecord;
  /** The raw refresh token — returned ONCE, to be placed in an HttpOnly cookie. */
  refreshToken: string;
}

const ttlSecondsFor = (rememberMe: boolean) =>
  rememberMe ? REMEMBER_ME_TTL_SECONDS : REFRESH_SESSION_TTL_SECONDS;

export function createSessionService(deps: AuthDeps = authRepository) {
  return {
    async createSession(opts: {
      userId: string;
      rememberMe: boolean;
      ctx?: RequestContext;
    }): Promise<CreatedSession> {
      const rawToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + ttlSecondsFor(opts.rememberMe) * 1000);
      const session = await deps.createSession({
        userId: opts.userId,
        tokenHash: hashToken(rawToken),
        familyId: generateHexId(),
        rememberMe: opts.rememberMe,
        userAgent: opts.ctx?.userAgent,
        ip: opts.ctx?.ip,
        expiresAt,
      });
      return { session, refreshToken: rawToken };
    },

    /**
     * Rotate a refresh token. Returns a new refresh token + the owning user.
     * Throws on revoked / expired / reused / unknown sessions.
     */
    async rotateSession(opts: {
      refreshToken: string;
      ctx?: RequestContext;
    }): Promise<{ session: SessionRecord; refreshToken: string; user: UserRecord }> {
      const presentedHash = hashToken(opts.refreshToken);
      const now = new Date();

      let session = await deps.findSessionByTokenHash(presentedHash);

      // Reuse detection: token matches the ROTATED-OUT hash → someone is
      // replaying a token that should be dead. Revoke the whole family.
      if (!session) {
        const reused = await deps.findSessionByPreviousHash(presentedHash);
        if (reused) {
          await deps.revokeSessionFamily(reused.familyId, 'refresh_token_reuse', now);
          deps.audit({
            action: 'REFRESH_REUSE_DETECTED',
            userId: reused.userId,
            ip: opts.ctx?.ip,
            userAgent: opts.ctx?.userAgent,
            metadata: { familyId: reused.familyId },
          });
          throw new AuthError(
            'Session has been revoked. Please sign in again.',
            'SESSION_REUSE_DETECTED'
          );
        }
        throw new AuthError(
          'Session expired or revoked. Please sign in again.',
          'SESSION_INVALID'
        );
      }

      if (session.revokedAt) {
        throw new AuthError('Session revoked. Please sign in again.', 'SESSION_REVOKED');
      }
      if (session.expiresAt.getTime() <= now.getTime()) {
        throw new AuthError('Session expired. Please sign in again.', 'SESSION_EXPIRED');
      }

      const user = await deps.findUserById(session.userId);
      if (!user) {
        throw new AuthError('Account no longer exists.', 'USER_NOT_FOUND');
      }

      // Rotate: new token, previous hash retained for reuse detection.
      const newRaw = generateSecureToken();
      const newHash = hashToken(newRaw);
      await deps.rotateSession(session.id, newHash, presentedHash, now);

      deps.audit({
        action: 'TOKEN_REFRESHED',
        userId: user.id,
        ip: opts.ctx?.ip,
        userAgent: opts.ctx?.userAgent,
        metadata: { sessionId: session.id, rememberMe: session.rememberMe },
      });

      return {
        session: { ...session, tokenHash: newHash, previousTokenHash: presentedHash, lastUsedAt: now },
        refreshToken: newRaw,
        user,
      };
    },

    async revokeSession(sessionId: string, reason: string): Promise<void> {
      await deps.revokeSession(sessionId, reason, new Date());
    },

    async listUserSessions(userId: string): Promise<SessionRecord[]> {
      return deps.findUserSessions(userId);
    },
  };
}
