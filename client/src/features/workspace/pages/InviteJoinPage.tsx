import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, authService } from '../../../services/auth/auth.service';
import { workspaceService } from '../../../services/workspace/workspace.service';

type Preview = {
  email: string;
  name: string;
  phone: string;
  role: string;
  expiresAt: string;
  workspaceId: string;
  accountExists: boolean;
  mustChangePassword: boolean;
  emailVerified?: boolean;
};

/**
 * Combined invite link: optional ?verify= token verifies email, then user
 * sets password (temp → new) and joins the workspace on Samhal.
 */
export function InviteJoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const verifyToken = params.get('verify') ?? '';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(verifyToken));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invite token.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (verifyToken) {
          setVerifying(true);
          try {
            await authService.verifyEmail(verifyToken.trim());
            if (!cancelled) {
              setInfo('Email verified. Enter your temporary password and choose a new one to join.');
            }
          } catch (err) {
            // Token may already be used if they reopened the link — still try preview.
            if (!cancelled) {
              setInfo(
                err instanceof Error
                  ? err.message
                  : 'Could not verify from this link. If you already verified, continue below.',
              );
            }
          } finally {
            if (!cancelled) setVerifying(false);
          }
        }

        const p = await apiFetch<Preview>(
          `/workspaces/invites/preview?token=${encodeURIComponent(token.trim())}`,
          { auth: false },
        );
        if (!cancelled) setPreview(p);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid invite.');
          setVerifying(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, verifyToken]);

  const needsVerify = Boolean(preview && preview.emailVerified === false);
  const needsNewPassword = Boolean(preview && (!preview.accountExists || preview.mustChangePassword));

  const submit = async () => {
    if (!token || !preview) return;

    if (needsVerify) {
      setError(
        'Please open the Accept invitation link from your Samhal invite email so we can verify your email.',
      );
      return;
    }

    if (needsNewPassword) {
      if (!temporaryPassword.trim()) {
        setError('Enter the temporary password from your invitation email.');
        return;
      }
      if (!password || password !== confirmPassword) {
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
            email: preview.email,
            temporaryPassword,
            newPassword: password,
          },
        });
        navigate('/auth', {
          replace: true,
          state: { message: 'Invite accepted. Sign in with your new password.' },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not join workspace.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.joinInvite({ token, password });
      navigate('/auth', {
        replace: true,
        state: { message: 'Invite accepted. Sign in with your email and password.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join workspace.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    Boolean(preview) &&
    !needsVerify &&
    !verifying &&
    (needsNewPassword
      ? Boolean(temporaryPassword && password && confirmPassword)
      : Boolean(password));

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-6 shadow-sm">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A94A6]">
          Samhal
        </p>
        <h1 className="mt-1 text-[20px] font-bold text-[#151D2B]">Accept invitation</h1>
        <p className="mt-1 text-[13px] text-[#6F7B8C]">
          {verifying
            ? 'Verifying your email…'
            : preview
              ? needsVerify
                ? 'Open the Accept invitation button from your invite email to verify and continue.'
                : needsNewPassword
                  ? 'Enter the temporary password from your invite email, then set a new password.'
                  : 'Confirm your password to join this workspace.'
              : 'Loading invite…'}
        </p>

        {info ? (
          <p className="mt-3 rounded-lg border border-[#C7E7D4] bg-[#ECFDF3] px-3 py-2 text-[12px] text-[#027A48]">
            {info}
          </p>
        ) : null}

        {preview ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2 text-[12px]">
              <p className="font-semibold text-[#151D2B]">{preview.name || preview.email}</p>
              <p className="text-[#8A94A6]">{preview.email}</p>
              <p className="text-[#8A94A6]">Role: {preview.role}</p>
              {needsVerify ? (
                <p className="mt-1 text-[#B45309]">
                  Email not verified yet — use the latest Accept invitation link from your email.
                </p>
              ) : (
                <p className="mt-1 text-[#027A48]">Email verified</p>
              )}
            </div>

            {!needsVerify && needsNewPassword ? (
              <>
                <label className="block text-[12px] font-semibold text-[#475569]">
                  Temporary password
                  <input
                    type="text"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                    placeholder="From your invitation email"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-[12px] font-semibold text-[#475569]">
                  New password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                    autoComplete="new-password"
                  />
                </label>
                <label className="block text-[12px] font-semibold text-[#475569]">
                  Confirm new password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                    autoComplete="new-password"
                  />
                </label>
                <p className="text-[11px] text-[#8A94A6]">
                  Use at least 10 characters with upper and lowercase letters and a number.
                </p>
              </>
            ) : null}

            {!needsVerify && !needsNewPassword ? (
              <label className="block text-[12px] font-semibold text-[#475569]">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                  autoComplete="current-password"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-[12px] text-[#DC2626]">{error}</p> : null}

        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={() => void submit()}
          className="mt-5 h-11 w-full rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
        >
          {busy || verifying
            ? verifying
              ? 'Verifying…'
              : 'Joining…'
            : needsNewPassword
              ? 'Set password & join'
              : 'Accept invite'}
        </button>
      </div>
    </div>
  );
}
