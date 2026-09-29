/** Public site origin for invitation, join, and share links — not the API. */

import { API_URL } from './apiUrl';

function stripTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const CANONICAL_FRONTEND_URL = 'https://meet.samtal.cc:8981';

export const FRONTEND_URL = stripTrailingSlash(
  String(import.meta.env.VITE_FRONTEND_URL || CANONICAL_FRONTEND_URL),
) || CANONICAL_FRONTEND_URL;

/** Absolute frontend URL. `path` may include a query string. Never emits `//` after the origin. */
export function frontendUrl(path = ''): string {
  const suffix = !path ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${FRONTEND_URL}${suffix}`;
}

export function frontendOrigin(): string {
  try {
    return new URL(FRONTEND_URL).origin;
  } catch {
    return CANONICAL_FRONTEND_URL;
  }
}

export function isLocalViteDev(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port } = window.location;
  return (hostname === 'localhost' || hostname === '127.0.0.1') && (port === '5173' || port === '4173');
}

export function isOnFrontendOrigin(): boolean {
  if (typeof window === 'undefined') return true;
  return window.location.origin === frontendOrigin();
}

/**
 * Only pull users off local/docker hosts onto the public FRONTEND_URL.
 * Never redirect an alternate public host (e.g. meet.samtal.cc) to a baked IP —
 * that causes Chrome about:blank#blocked (especially https → http).
 */
function isLocalOrDockerHost(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  );
}

export function goToFrontend(path?: string): void {
  if (typeof window === 'undefined' || isLocalViteDev() || isOnFrontendOrigin()) return;
  if (!isLocalOrDockerHost()) return;
  // Never downgrade HTTPS browsing to an HTTP canonical URL.
  if (window.location.protocol === 'https:' && FRONTEND_URL.startsWith('http:')) return;
  const nextPath =
    path ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(frontendUrl(nextPath || '/app'));
}

export function assignFrontend(path: string): void {
  if (typeof window === 'undefined') return;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  // Prefer same-origin navigation so a wrong VITE_FRONTEND_URL cannot blank the tab.
  if (isLocalViteDev() || isOnFrontendOrigin() || !isLocalOrDockerHost()) {
    window.location.assign(suffix);
    return;
  }
  window.location.assign(frontendUrl(suffix));
}

export function enterApp(): void {
  if (typeof window === 'undefined') return;
  // Stay on the current origin — absolute VITE_FRONTEND_URL jumps cause about:blank#blocked
  // when the baked URL does not match the live HTTPS host.
  window.location.assign('/app');
}

/** Full-page Google OAuth start. Production always uses the public SPA origin (nginx proxies /auth/google). */
export function googleAuthStartUrl(): string {
  if (isLocalViteDev()) {
    return `${API_URL || 'http://localhost:4001'}/auth/google`;
  }
  return frontendUrl('/auth/google');
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
