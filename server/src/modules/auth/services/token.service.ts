import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { ACCESS_TOKEN_TTL_SECONDS } from '../auth.constants';
import { AuthError } from '../../../shared/errors/AppError';

/**
 * Access-token (JWT) lifecycle.
 *
 * Access tokens are SHORT-LIVED (15 min) and stateless. They carry the user
 * id and the refresh-session id that minted them. Revocation of a session
 * does not instantly kill outstanding access tokens — the short TTL bounds
 * the damage, and password changes invalidate pre-change tokens via the
 * `passwordChangedAt` check in the authenticate middleware.
 */

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
  type: 'access';
  /** Seconds since epoch (JWT standard claim). */
  iat?: number;
  /**
   * Milliseconds since epoch at issue time. JWT's `iat` is second-granular
   * and JWTs are deterministic within a second, so a token minted right
   * before a password change could share the old token's `iat`. The
   * millisecond claim lets the authenticate middleware reject every token
   * issued strictly before the change, with no same-second ambiguity.
   */
  iatMs?: number;
}

export const tokenService = {
  issueAccessToken(userId: string, sessionId: string): { accessToken: string; expiresIn: number } {
    const payload: AccessTokenPayload = {
      userId,
      sessionId,
      type: 'access',
      iatMs: Date.now(),
    };
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: 'meetspace',
      audience: 'meetspace-app',
    });
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  },

  /** Throws AuthError (401) on any failure — signature, expiry, or shape. */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: 'meetspace',
        audience: 'meetspace-app',
      }) as jwt.JwtPayload & Partial<AccessTokenPayload>;
      if (decoded.type !== 'access' || typeof decoded.userId !== 'string') {
        throw new Error('Unexpected token shape');
      }
      return {
        userId: decoded.userId,
        sessionId: typeof decoded.sessionId === 'string' ? decoded.sessionId : '',
        type: 'access',
        iat: typeof decoded.iat === 'number' ? decoded.iat : undefined,
        iatMs: typeof decoded.iatMs === 'number' ? decoded.iatMs : undefined,
      };
    } catch {
      throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }
  },
};
