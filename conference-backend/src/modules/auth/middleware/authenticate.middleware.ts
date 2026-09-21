import { NextFunction, Response } from 'express';
import { tokenService } from '../services/token.service';
import { authRepository } from '../auth.repository';
import { AuthRequest } from '../auth.types';

/**
 * Required-auth middleware.
 *
 * Reads `Authorization: Bearer <accessToken>` (never a cookie — access tokens
 * live in memory on the client). On success attaches `req.user` and
 * `req.sessionId`; otherwise responds 401.
 *
 * Rejects access tokens issued BEFORE the user's last password change, so a
 * password change invalidates every outstanding access token immediately
 * (the user re-authenticates via their still-valid refresh cookie).
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    return;
  }

  const token = header.slice(7).trim();
  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.', code: 'INVALID_TOKEN' });
    return;
  }

  const user = await authRepository.findUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Account not found.', code: 'USER_NOT_FOUND' });
    return;
  }

  if (user.passwordChangedAt) {
    const changedAtMs = user.passwordChangedAt.getTime();
    // iatMs has millisecond precision, so every token minted strictly before
    // the change is rejected — including same-second collisions that the
    // second-granular `iat` claim cannot distinguish.
    if (payload.iatMs !== undefined && payload.iatMs < changedAtMs) {
      res.status(401).json({
        error: 'Session expired. Please sign in again.',
        code: 'PASSWORD_CHANGED',
      });
      return;
    }
  }

  req.user = user;
  req.sessionId = payload.sessionId || undefined;
  next();
};
