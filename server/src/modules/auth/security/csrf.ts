import { Request, Response, NextFunction } from 'express';
import { corsOrigins } from '../../../config/env';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * CSRF defense-in-depth middleware.
 *
 * Primary defenses:
 *  1. Refresh cookie is SameSite=Lax — browsers do not attach it to
 *     cross-site POST/PUT/DELETE requests, so cross-site form posts cannot
 *     act on the victim's session.
 *  2. Origin check below — when a browser sends an Origin header (all
 *     cross-origin requests do), it MUST be an allowed origin. Requests
 *     without an Origin header (curl, native clients, same-origin fetches)
 *     are permitted; those clients cannot be tricked into sending cookies
 *     cross-site by a browser.
 *
 * Apply to cookie-authenticated state-changing routes (refresh, logout,
 * change-password, etc.).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers['origin'];

  if (origin && origin !== 'null' && !corsOrigins.includes(origin)) {
    logger.warn('CSRF: blocked request from disallowed origin', {
      origin,
      path: req.path,
      ip: req.ip,
    });
    res.status(403).json({ error: 'Forbidden', code: 'CSRF_ORIGIN' });
    return;
  }

  next();
}
