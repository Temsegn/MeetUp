import { AuthDeps, authRepository } from '../auth.repository';
import { hashToken } from '../security/token-hasher';
import { RequestContext } from '../auth.types';

/**
 * Logout: revoke the refresh session that owns the presented cookie, so a
 * stolen cookie cannot be replayed after logout. Logout-all revokes every
 * session for the user.
 */

export function createLogoutService(deps: AuthDeps = authRepository) {
  return {
    /** Revoke the session matching the presented refresh token (if any). */
    async logout(opts: { refreshToken?: string; ctx?: RequestContext }): Promise<void> {
      if (!opts.refreshToken) return;
      const session = await deps.findSessionByTokenHash(hashToken(opts.refreshToken));
      if (session) {
        await deps.revokeSession(session.id, 'logout', new Date());
        deps.audit({
          action: 'LOGOUT',
          userId: session.userId,
          ip: opts.ctx?.ip,
          userAgent: opts.ctx?.userAgent,
          metadata: { sessionId: session.id },
        });
      }
      // Unknown/expired cookie → nothing to revoke; clearing the cookie is enough.
    },

    /** Revoke every session for the user, optionally keeping the current one. */
    async logoutAll(opts: {
      userId: string;
      exceptSessionId?: string;
      ctx?: RequestContext;
    }): Promise<number> {
      const count = await deps.revokeUserSessions(opts.userId, {
        exceptSessionId: opts.exceptSessionId,
        reason: 'logout_all',
        at: new Date(),
      });
      deps.audit({
        action: 'LOGOUT_ALL',
        userId: opts.userId,
        ip: opts.ctx?.ip,
        userAgent: opts.ctx?.userAgent,
        metadata: { revoked: count },
      });
      return count;
    },
  };
}
