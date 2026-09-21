import { Request } from 'express';
import { env } from '../../../config/env';
import { REFRESH_COOKIE_NAME } from '../auth.constants';

export { REFRESH_COOKIE_NAME };

/**
 * Read a cookie value from the raw Cookie header. Used by controllers so
 * they do not depend on cookie-parser's req.cookies typing (which is not in
 * the project's `types` allowlist).
 */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Cookie policy for the refresh token.
 *
 *  - HttpOnly  — JavaScript can never read it (XSS cannot exfiltrate it).
 *  - SameSite=Lax — blocks cross-site POST CSRF while keeping the cookie
 *    on same-site (cross-origin) fetches between frontend and API.
 *  - Secure in production — only sent over HTTPS.
 *  - Path=/ — sent to every API route (the API is the only server).
 *  - Optional COOKIE_DOMAIN for frontend/API on sibling subdomains.
 */
export interface RefreshCookieOptions {
  maxAgeMs: number;
}

export function refreshCookieOptions({ maxAgeMs }: RefreshCookieOptions) {
  const isProd = env.NODE_ENV === 'production';
  const opts: Record<string, unknown> = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
  if (env.COOKIE_DOMAIN) opts['domain'] = env.COOKIE_DOMAIN;
  return opts;
}

export const REFRESH_COOKIE_NAME_HEADER = REFRESH_COOKIE_NAME;

/** Express `res.clearCookie` options must match how the cookie was set. */
export function refreshCookieClearOptions() {
  const isProd = env.NODE_ENV === 'production';
  const opts: Record<string, unknown> = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
  if (env.COOKIE_DOMAIN) opts['domain'] = env.COOKIE_DOMAIN;
  return opts;
}

/**
 * Attach the refresh cookie to a response.
 * `maxAgeMs` should be the session's REMAINING lifetime so the cookie and
 * the server-side session expire together.
 */
export function setRefreshCookie(
  res: { cookie: (name: string, value: string, opts: Record<string, unknown>) => void },
  token: string,
  maxAgeMs: number
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions({ maxAgeMs }));
}

/** Remove the refresh cookie (logout / logout-all / password reset). */
export function clearRefreshCookie(res: {
  clearCookie: (name: string, opts: Record<string, unknown>) => void;
}): void {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieClearOptions());
}
