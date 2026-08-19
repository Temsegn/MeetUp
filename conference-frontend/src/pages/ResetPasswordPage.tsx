import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService, ApiError } from '../services/auth/auth.service';
import { Video, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Status =
  | { kind: 'loading' }
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'form' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ kind: 'error', message: 'Passwords do not match.' });
      return;
    }
    setStatus({ kind: 'submitting' });
    try {
      await authService.resetPassword({ token, newPassword: password, confirmPassword: confirm });
      setStatus({ kind: 'success' });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'INVALID_RESET_TOKEN') {
        setStatus({ kind: 'invalid' });
      } else {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        });
      }
    }
  };

  const card = () => {
    switch (status.kind) {
      case 'success':
        return (
          <div className="text-center py-4">
            <CheckCircle2 size={44} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Password updated</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your password has been changed and all other sessions were signed out.
            </p>
            <Link
              to="/auth"
              className="inline-block mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition"
            >
              Sign in with your new password
            </Link>
          </div>
        );

      case 'invalid':
        return (
          <div className="text-center py-4">
            <XCircle size={44} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Link invalid or expired</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              This reset link is invalid, expired, or has already been used. Request a new one.
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-block mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition"
            >
              Request a new link
            </Link>
          </div>
        );

      case 'error':
      case 'form':
      case 'loading':
      case 'submitting':
      default:
        if (!token) {
          return (
            <div className="text-center py-4">
              <AlertTriangle size={44} className="text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Missing reset token</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Open the link from your password reset email to choose a new password.
              </p>
              <Link
                to="/auth/forgot-password"
                className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Request a reset link
              </Link>
            </div>
          );
        }
        const busy = status.kind === 'submitting' || status.kind === 'loading';
        return (
          <>
            <h1 className="text-2xl font-semibold text-white mb-2">Choose a new password</h1>
            <p className="text-slate-400 text-sm mb-8">
              Your password must be at least 10 characters with upper &amp; lowercase letters and a number.
            </p>

            {status.kind === 'error' && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-12 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  minLength={10}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  minLength={10}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-medium text-sm transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20"
              >
                {busy ? 'Updating...' : 'Set new password'}
              </button>
            </form>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Video size={22} className="text-white" />
        </div>
        <span className="text-2xl font-semibold text-white tracking-tight">MeetSpace</span>
      </div>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {card()}
      </div>
    </div>
  );
};
