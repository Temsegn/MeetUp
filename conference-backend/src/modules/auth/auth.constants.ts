import { env } from '../../config/env';

/**
 * Central place for authentication constants. Every lifetime below is
 * env-driven so a deployment can tune policy without touching code.
 */

/** Access token (JWT) lifetime — kept SHORT; the refresh cookie restores it. */
export const ACCESS_TOKEN_TTL_SECONDS = env.ACCESS_TOKEN_TTL_SECONDS;

/** Refresh-session lifetime when Remember Me is unchecked. */
export const REFRESH_SESSION_TTL_SECONDS = env.REFRESH_SESSION_TTL_SECONDS;

/** Refresh-session lifetime when Remember Me is checked (7 days by default). */
export const REMEMBER_ME_TTL_SECONDS = env.REMEMBER_ME_TTL_SECONDS;

/** Password-reset token lifetime. */
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = env.PASSWORD_RESET_TOKEN_TTL_SECONDS;

/** Email-verification token lifetime. */
export const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = env.EMAIL_VERIFICATION_TOKEN_TTL_SECONDS;

/** Login lockout policy. */
export const LOGIN_MAX_FAILED_ATTEMPTS = env.LOGIN_MAX_FAILED_ATTEMPTS;
export const LOGIN_LOCKOUT_WINDOW_MS = env.LOGIN_LOCKOUT_WINDOW_MS;

/** Bcrypt work factor for password hashing. */
export const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS;

/** Cookie name carrying the (HttpOnly) refresh token. */
export const REFRESH_COOKIE_NAME = 'ms_refresh';

/** Password policy shared by validators and tests. */
export const PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 128,
  // At least one of each — enforced by the password schema refinement.
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
} as const;

/** Normalize a raw email before any comparison or storage. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
