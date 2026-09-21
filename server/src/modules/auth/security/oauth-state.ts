import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { env } from '../../../config/env';

/** Google OAuth state lifetime — long enough for the consent screen, short enough to limit replay. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function sign(body: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(body).digest('base64url');
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Issue a one-time Google OAuth `state` value.
 *
 * Format: `<nonce>.<expiryMs>.<hmac>` — the HMAC is bound to JWT_SECRET so any
 * backend instance can validate it (in-memory maps are not shared across
 * processes or restarts).
 */
export function createOAuthState(now = Date.now(), ttlMs = OAUTH_STATE_TTL_MS): string {
  const nonce = randomBytes(24).toString('hex');
  const body = `${nonce}.${now + ttlMs}`;
  return `${body}.${sign(body)}`;
}

/** True when `state` was issued by this app and has not expired. */
export function verifyOAuthState(state: string, now = Date.now()): boolean {
  if (!state) return false;
  const lastDot = state.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const body = state.slice(0, lastDot);
  const sig = state.slice(lastDot + 1);
  if (!body || !sig) return false;
  const expected = sign(body);
  if (!equal(sig, expected)) return false;
  const expStr = body.slice(body.lastIndexOf('.') + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  return true;
}

/** Bind the Google `state` query param to the browser that started the flow. */
export function oauthStatesMatch(queryState: string, cookieState: string | undefined): boolean {
  if (!queryState || !cookieState) return false;
  return equal(queryState, cookieState);
}
