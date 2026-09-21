import { Request } from 'express';
import { env } from '../../../config/env';
import { REFRESH_COOKIE_NAME } from '../auth.constants';
import { OAUTH_STATE_TTL_MS } from './oauth-state';

export { REFRESH_COOKIE_NAME };

/** HttpOnly cookie that binds Google `state` to the browser that started OAuth. */
export const OAUTH_STATE_COOKIE_NAME = 'ms_oauth_state';

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
 * Shared cookie policy.
 *
 *  - HttpOnly  — JavaScript can never read it (XSS cannot exfiltrate it).
 *  - SameSite=Lax — sent on top-level GET navigations (Google OAuth return)
 *    but not on cross-site POST CSRF.
 *  - Secure only when the public frontend is HTTPS. NODE_ENV=production on
 *    plain HTTP would otherwise drop cookies (browsers never store Secure
 *    cookies on http://46.246.120.148:8980).
 *  - Optional COOKIE_DOMAIN for frontend/API on sibling subdomains. Leave
 *    unset for this IP:port deployment.
 */
function authCookieOptions(path: string, extra: Record<string, unknown> = {}) {
  const opts: Record<string, unknown> = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path,
    ...extra,
  };
  if (env.COOKIE_DOMAIN) opts['domain'] = env.COOKIE_DOMAIN;
  return opts;
}

/**
 * Cookie policy for the refresh token.
 *
 *  - Path=/ — sent to every API route (the API is the only server).
 */
export interface RefreshCookieOptions {
  maxAgeMs: number;
}

export function refreshCookieOptions({ maxAgeMs }: RefreshCookieOptions) {
  return authCookieOptions('/', { maxAge: maxAgeMs });
}

export const REFRESH_COOKIE_NAME_HEADER = REFRESH_COOKIE_NAME;

/** Express `res.clearCookie` options must match how the cookie was set. */
export function refreshCookieClearOptions() {
  return authCookieOptions('/');
}

function oauthStateCookieOptions(extra: Record<string, unknown> = {}) {
  return authCookieOptions('/auth', extra);
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

export function setOAuthStateCookie(
  res: { cookie: (name: string, value: string, opts: Record<string, unknown>) => void },
  state: string
): void {
  res.cookie(
    OAUTH_STATE_COOKIE_NAME,
    state,
    oauthStateCookieOptions({ maxAge: OAUTH_STATE_TTL_MS })
  );
}

export function clearOAuthStateCookie(res: {
  clearCookie: (name: string, opts: Record<string, unknown>) => void;
}): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, oauthStateCookieOptions());
}
