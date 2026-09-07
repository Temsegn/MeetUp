import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AuthError, AuthSuccess } from '../components/AuthError';
import { useVerifyEmail } from '../hooks/useVerifyEmail';

/** After verify: invited users go to set-password; others can sign in. */
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const { loading, error, user } = useVerifyEmail(token);

  React.useEffect(() => {
    if (!user) return;
    if (user.mustChangePassword) {
      navigate(`/auth/set-password?email=${encodeURIComponent(user.email)}`, { replace: true });
    }
  }, [user, navigate]);

  return (
    <AuthLayout solo>
      <h1 className="auth-title" style={{ fontSize: 28 }}>
        Email verification
      </h1>
      <p className="auth-subtitle">Confirming your Samtal account.</p>

      <div className="auth-form">
        {loading && <p className="auth-subtitle">Verifying your email…</p>}
        {!loading && error && <AuthError message={error} />}
        {!loading && user && !user.mustChangePassword && (
          <AuthSuccess>
            Email verified for <strong>{user.email}</strong>. You can sign in now.
          </AuthSuccess>
        )}
        {!loading && user?.mustChangePassword && (
          <p className="auth-subtitle">Email verified. Taking you to set a new password…</p>
        )}
        {!loading && (
          <p className="auth-switch">
            <Link className="auth-link" to="/auth">
              Back to Sign In
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
};
