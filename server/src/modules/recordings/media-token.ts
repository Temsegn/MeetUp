import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

/**
 * Short-lived, single-recording, read-only tokens for <video src> / <img src>.
 *
 * Media elements can't send an Authorization header, so the URL must carry a
 * credential. Putting the user's access token there leaked a full-API
 * credential into proxy logs, browser history and Referer headers. This token
 * only allows streaming ONE recording until it expires.
 */
export const MEDIA_TOKEN_TTL_SECONDS = 6 * 60 * 60;

function sign(payload: string): string {
  const key = createHmac('sha256', env.JWT_SECRET).update('samtal:recording-media:v1').digest();
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createMediaToken(input: { recordingId: string; workspaceId: string; userId: string }) {
  const exp = Math.floor(Date.now() / 1000) + MEDIA_TOKEN_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ r: input.recordingId, w: input.workspaceId, u: input.userId, e: exp }),
  ).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyMediaToken(
  token: string,
  recordingId: string,
): { workspaceId: string; userId: string } | null {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      r?: string; w?: string; u?: string; e?: number;
    };
    if (data.r !== recordingId || !data.w || !data.u || !data.e) return null;
    if (data.e * 1000 < Date.now()) return null;
    return { workspaceId: data.w, userId: data.u };
  } catch {
    return null;
  }
}
