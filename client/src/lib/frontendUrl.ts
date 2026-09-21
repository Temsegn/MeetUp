/** Public site origin for invitation, join, and share links — not the API. */

function stripTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export const FRONTEND_URL = stripTrailingSlash(
  String(import.meta.env.VITE_FRONTEND_URL ?? ''),
);

/** Absolute frontend URL. `path` may include a query string. Never emits `//` after the origin. */
export function frontendUrl(path = ''): string {
  const suffix = !path ? '' : path.startsWith('/') ? path : `/${path}`;
  if (!FRONTEND_URL) return suffix || '/';
  return `${FRONTEND_URL}${suffix}`;
}

export function workspaceInviteUrl(token: string): string {
  return frontendUrl(`/auth/invite?token=${encodeURIComponent(token)}`);
}

export function guestJoinUrl(roomId: string, email?: string): string {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return frontendUrl(`/join/${encodeURIComponent(roomId)}${query}`);
}

export function meetingRoomUrl(roomId: string): string {
  return frontendUrl(`/app/meeting/${encodeURIComponent(roomId)}`);
}

export function recordingShareUrl(recordingId: string): string {
  return frontendUrl(`/app/recordings/${encodeURIComponent(recordingId)}`);
}
