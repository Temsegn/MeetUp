import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  setAccessToken,
  refreshSession,
} from '../../../services/auth/auth.service';
import { useAuth } from '../../../contexts/AuthContext';

const OAUTH_HANDOFF_KEY = 'samtal_oauth_access_token';

/**
 * Read the one-time access token from the URL (hash or query) and stash it
 * in sessionStorage so React Strict Mode remounts still find it after the
 * hash is cleared.
 */
function consumeOAuthAccessToken(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  const fromHash = new URLSearchParams(hash).get('access_token');
  const fromQuery = new URLSearchParams(window.location.search).get('access_token');
  const fromStore = sessionStorage.getItem(OAUTH_HANDOFF_KEY);

  const token = fromHash || fromQuery || fromStore;
  if (!token) return null;

  sessionStorage.setItem(OAUTH_HANDOFF_KEY, token);

  // Strip token from the address bar once captured.
  if (fromHash || fromQuery) {
    window.history.replaceState(null, '', '/auth/oauth/callback');
  }

  return token;
}

/**
 * Completes Google OAuth after the API redirects here with
 * `#access_token=...` (refresh cookie already set HttpOnly).
 */
export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = consumeOAuthAccessToken();

        if (token) {
          setAccessToken(token);
        } else {
          // Hash already consumed on a previous Strict Mode pass, or lost —
          // finish via the HttpOnly refresh cookie Google callback just set.
          const ok = await refreshSession();
          if (!ok) {
            if (!cancelled) {
              setError('Missing access token from Google sign-in.');
            }
            return;
          }
        }

        await refreshUser();
        sessionStorage.removeItem(OAUTH_HANDOFF_KEY);
        if (!cancelled) navigate('/app', { replace: true });
      } catch (err) {
        sessionStorage.removeItem(OAUTH_HANDOFF_KEY);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshUser]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f5f7fa] px-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="rounded-full bg-[#016BE6] px-5 py-2 text-sm font-semibold text-white"
          onClick={() => navigate('/auth', { replace: true })}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-sm text-[#64748b]">
      Completing Google sign-in…
    </div>
  );
};
