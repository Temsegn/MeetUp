import { useEffect, useState } from 'react';
import { authService, ApiError, type User } from '../../../services/auth/auth.service';

export function useVerifyEmail(token: string | null) {
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing verification token.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await authService.verifyEmail(token);
        if (!cancelled) setUser(u);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Verification failed.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { loading, error, user };
}
