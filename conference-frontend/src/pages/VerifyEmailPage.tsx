import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth/auth.service';
import { Video, CheckCircle2, XCircle, Mail, AlertTriangle } from 'lucide-react';

type Status = 'verifying' | 'verified' | 'failed' | 'no-token';
type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, refreshUser, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(() => (token ? 'verifying' : 'no-token'));
  const [resend, setResend] = useState<ResendStatus>('idle');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await authService.verifyEmail(token);
        await refreshUser(); // pick up emailVerified in context
        if (!cancelled) setStatus('verified');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshUser]);

  const handleResend = async () => {
    setResend('sending');
    setResendMessage('');
    try {
      await resendVerification();
      setResend('sent');
      setResendMessage('Verification email sent — check your inbox.');
    } catch (err: unknown) {
      setResend('error');
      setResendMessage(err instanceof Error ? err.message : 'Could not resend the verification email.');
    }
  };

  const card = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-4 text-sm text-slate-400">Verifying your email…</p>
          </div>
        );

      case 'verified':
        return (
          <div className="text-center py-4">
            <CheckCircle2 size={44} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Email verified 🎉</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {user?.email ?? 'Your email'} is now verified. You're all set.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-block mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition"
            >
              Go to dashboard
            </button>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-4">
            <XCircle size={44} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Verification link invalid</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              This link is invalid, expired, or has already been used.
            </p>
            {user ? (
              <button
                onClick={handleResend}
                disabled={resend === 'sending' || resend === 'sent'}
                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-white text-sm font-medium transition inline-flex items-center gap-2"
              >
                <Mail size={15} />
                {resend === 'sending' ? 'Sending...' : resend === 'sent' ? 'Sent — check your inbox' : 'Resend verification email'}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Back to sign in
              </Link>
            )}
            {resendMessage && (
              <p className={`mt-3 text-xs ${resend === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {resendMessage}
              </p>
            )}
          </div>
        );

      case 'no-token':
        return (
          <div className="text-center py-4">
            <AlertTriangle size={44} className="text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Missing verification token</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Open the link from your verification email, or request a new one below.
            </p>
            {user && (
              <button
                onClick={handleResend}
                disabled={resend === 'sending' || resend === 'sent'}
                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition inline-flex items-center gap-2"
              >
                <Mail size={15} />
                {resend === 'sending' ? 'Sending...' : resend === 'sent' ? 'Sent — check your inbox' : 'Resend verification email'}
              </button>
            )}
            {resendMessage && (
              <p className={`mt-3 text-xs ${resend === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {resendMessage}
              </p>
            )}
          </div>
        );

      default:
        return null;
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
