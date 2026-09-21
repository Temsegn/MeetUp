import { NextFunction, Response } from 'express';
import { tokenService } from '../services/token.service';
import { authRepository } from '../auth.repository';
import { AuthRequest } from '../auth.types';

/**
 * Optional-auth middleware: attach req.user when a VALID access token is
 * present, but never reject the request. Used by endpoints that behave
 * differently for signed-in users (e.g. personalized landing content).
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(header.slice(7).trim());
    const user = await authRepository.findUserById(payload.userId);
    if (user) {
      req.user = user;
      req.sessionId = payload.sessionId || undefined;
    }
  } catch {
    // Invalid token → treat as anonymous; the request proceeds.
  }
  next();
};
