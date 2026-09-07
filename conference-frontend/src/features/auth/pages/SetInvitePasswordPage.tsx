import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AuthError, AuthSuccess } from '../components/AuthError';
import { apiFetch } from '../../../services/auth/auth.service';

/**
 * After email verification: invited users set a new password using their temporary password.
 */
export function SetInvitePasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = params.get('email') ?? '';

  const [email, setEmail] = useState(emailFromQuery);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  const submit = async () => {
    if (!email.trim() || !temporaryPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/workspaces/invites/complete-password', {
        method: 'POST',
        auth: false,
        body: {
          email: email.trim(),
          temporaryPassword,
          newPassword,
        },
      });
      setDone(true);
      window.setTimeout(() => {
        navigate('/auth', {
          replace: true,
          state: { message: 'Password updated. Sign in with your new password.' },
        });
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    Boolean(email.trim()) &&
    Boolean(temporaryPassword) &&
    Boolean(newPassword) &&
    Boolean(confirmPassword);

  return (
    <AuthLayout solo>
      <h1 className="auth-title" style={{ fontSize: 28 }}>
        Set a new password
      </h1>
      <p className="auth-subtitle">
        Enter the temporary password from your invitation email, then choose a new password to finish
        joining.
      </p>

      <div className="auth-form space-y-3">
        {done ? (
          <AuthSuccess>Password updated. Redirecting to sign in…</AuthSuccess>
        ) : (
          <>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[13px] outline-none"
                autoComplete="email"
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Temporary password
              <input
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[13px] outline-none"
                autoComplete="off"
                placeholder="From your invitation email"
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[13px] outline-none"
                autoComplete="new-password"
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[13px] outline-none"
                autoComplete="new-password"
              />
            </label>
            <p className="text-[11px] text-[#8A94A6]">
              Use at least 10 characters with upper and lowercase letters and a number.
            </p>
            {error ? <AuthError message={error} /> : null}
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() => void submit()}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Set password & join'}
            </button>
          </>
        )}
        <p className="auth-switch">
          <Link className="auth-link" to="/auth">
            Back to Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
