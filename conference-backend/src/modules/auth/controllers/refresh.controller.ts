import { Response } from 'express';
import { AuthError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { createSessionService } from '../services/session.service';
import { tokenService } from '../services/token.service';
import { AuthRequest, toSafeUser, getRequestContext } from '../auth.types';
import {
  REFRESH_COOKIE_NAME,
  readCookie,
  setRefreshCookie,
} from '../security/cookie-config';

/**
 * POST /auth/refresh
 *
 * Rotates the refresh token from the HttpOnly cookie and issues a new
 * access token. The refresh token is NEVER returned in the body — it is
 * written back into the same HttpOnly cookie.
 */
export function createRefreshController(deps: AuthDeps = authRepository) {
  const sessions = createSessionService(deps);

  return {
    async refresh(req: AuthRequest, res: Response): Promise<void> {
      const refreshToken = readCookie(req, REFRESH_COOKIE_NAME);
      if (!refreshToken) {
        throw new AuthError('No active session. Please sign in.', 'SESSION_MISSING');
      }

      const ctx = getRequestContext(req);
      const { session, refreshToken: newToken, user } = await sessions.rotateSession({
        refreshToken,
        ctx,
      });

      const tokens = tokenService.issueAccessToken(user.id, session.id);
      const remainingMs = session.expiresAt.getTime() - Date.now();
      setRefreshCookie(res, newToken, Math.max(remainingMs, 1));

      res.json({ user: toSafeUser(user), tokens });
    },
  };
}
