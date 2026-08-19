/**
 * Auth API client.
 *
 * Security model:
 *  - The access token (JWT) lives ONLY in memory — never localStorage —
 *    so XSS cannot exfiltrate it and it cannot survive a page reload
 *    without a valid session.
 *  - The refresh token travels in an HttpOnly, SameSite cookie that
 *    JavaScript can never read. On a 401 (or on boot), we call
 *    POST /auth/refresh; the server rotates the cookie and hands back a
 *    fresh access token.
 *  - Every request is sent with `credentials: 'include'` so the refresh
 *    cookie accompanies cross-origin fetches to the API.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

// ── In-memory access token (never persisted) ────────────────────────────────
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (t: string | null): void => {
  accessToken = t;
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface SessionInfo {
  id: string;
  current: boolean;
  rememberMe: boolean;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

/** Error carrying HTTP status + machine-readable code for UI state mapping. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Low-level fetch with automatic refresh ──────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Extract the access token from an auth response.
 *
 * Accepts the current shape (`tokens.accessToken`), the interim shape
 * (`tokens.token`), and the pre-refresh legacy shape (top-level `token`),
 * throwing a readable error — never a cryptic TypeError — if the server
 * response is missing the token entirely.
 */
function extractAccessToken(data: unknown): string {
  const tokens = (data as { tokens?: { accessToken?: unknown; token?: unknown } })?.tokens;
  const raw =
    tokens?.accessToken ??
    tokens?.token ??
    (data as { token?: unknown })?.token;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new ApiError(
      'The server returned an invalid authentication response. Please sign in again.',
      500,
      'INVALID_AUTH_RESPONSE',
    );
  }
  return raw;
}

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 * Deduplicates concurrent refreshes.
 */
export async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          accessToken = null;
          return false;
        }
        const data: unknown = await res.json();
        accessToken = extractAccessToken(data);
        return true;
      } catch {
        accessToken = null;
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the Bearer access token (default true). */
  auth?: boolean;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}, allowRetry = true): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — please check your connection.', 0, 'NETWORK_ERROR');
  }

  // Token expired → refresh once and retry the original request.
  if (res.status === 401 && auth && allowRetry) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, opts, false);
    throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? 'Request failed.';
    throw new ApiError(message, res.status, (data as { code?: string }).code);
  }
  return data as T;
}

// ── Endpoints ───────────────────────────────────────────────────────────────

export const authService = {
  async signUp(input: { name: string; email: string; password: string; rememberMe: boolean }): Promise<User> {
    const data = await apiFetch<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: input,
      auth: false,
    });
    accessToken = extractAccessToken(data);
    return data.user;
  },

  async signIn(input: { email: string; password: string; rememberMe: boolean }): Promise<User> {
    let data: AuthResponse;
    try {
      data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
      });
    } catch (err) {
      // A stale backend (pre-refresh build) only exposes /auth/signin —
      // retry once against the legacy path before surfacing the error.
      if (err instanceof ApiError && err.code === 'NOT_FOUND') {
        data = await apiFetch<AuthResponse>('/auth/signin', {
          method: 'POST',
          body: input,
          auth: false,
        });
      } else {
        throw err;
      }
    }
    accessToken = extractAccessToken(data);
    return data.user;
  },

  async signOut(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST', auth: false });
    } catch {
      // Local sign-out proceeds even if the server is unreachable.
    } finally {
      accessToken = null;
    }
  },

  async signOutAll(): Promise<void> {
    await apiFetch('/auth/logout-all', { method: 'POST' });
    accessToken = null;
  },

  async getCurrentUser(): Promise<User> {
    const data = await apiFetch<User>('/auth/me');
    return data;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiFetch('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
  },

  async resetPassword(input: { token: string; newPassword: string; confirmPassword: string }): Promise<void> {
    await apiFetch('/auth/reset-password', { method: 'POST', body: input, auth: false });
  },

  async changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<AuthTokens> {
    const data = await apiFetch<{ success: boolean; tokens: AuthTokens }>('/auth/change-password', {
      method: 'POST',
      body: input,
    });
    // The old access token was minted before the change — swap in the fresh one.
    accessToken = extractAccessToken(data);
    return data.tokens;
  },

  async verifyEmail(token: string): Promise<User> {
    const data = await apiFetch<{ success: boolean; user: User }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      { auth: false },
    );
    return data.user;
  },

  async resendVerification(): Promise<void> {
    await apiFetch('/auth/resend-verification', { method: 'POST' });
  },

  async getSessions(): Promise<SessionInfo[]> {
    const data = await apiFetch<{ sessions: SessionInfo[] }>('/auth/sessions');
    return data.sessions;
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiFetch(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  },

  generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(4)}-${seg(3)}`;
  },
};

/** Headers helper for non-auth API calls (meetings, recordings, uploads). */
export const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAccessToken() ?? ''}`,
});

/**
 * Authed fetch with automatic one-shot refresh — for the rest of the app
 * (meetings, recordings) so an expired access token never surfaces as a
 * hard failure.
 */
export async function authedFetch<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  return apiFetch<T>(path, {
    method: (opts.method as FetchOptions['method']) ?? 'GET',
    body: opts.body,
  });
}
