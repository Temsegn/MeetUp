import rateLimit from 'express-rate-limit';
import { env } from '../../../config/env';

/**
 * Rate limiting for authentication endpoints.
 *
 *  - authRateLimiter: blanket cap on ALL /auth routes (IP-based).
 *  - loginRateLimiter: stricter cap for /login and /forgot-password
 *    (credential-stuffing defense).
 *  - Per-(email, IP) failed-attempt lockout lives in login.service (DB-backed,
 *    so it scales beyond a single process).
 *
 * NOTE: express-rate-limit's default store is in-memory, which is
 * single-process. Behind multiple replicas, plug in a shared store
 * (e.g. rate-limit-mongo) — see the deployment notes in docs/.
 */

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});

export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  message: { error: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' },
});

/** Light limiter for password-reset / verification-token endpoints. */
export const tokenRequestLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: Math.max(5, Math.min(20, env.LOGIN_RATE_LIMIT_MAX)),
  standardHeaders: true,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});
