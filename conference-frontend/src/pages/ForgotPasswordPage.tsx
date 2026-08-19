import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth/auth.service';
import { Video, Mail, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setState('loading');
    try {
      // The API always responds generically — no account-enumeration signal.
      await authService.forgotPassword(email);
      setState('sent');
    } catch (err: unknown) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
        {state === 'sent' ? (
          <div className="text-center py-4">
            <CheckCircle2 size={44} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              If an account exists for <span className="text-slate-200">{email}</span>, a password
              reset link has been sent. It expires in 30 minutes.
            </p>
            <Link
              to="/auth"
              className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium transition"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-white mb-2">Reset your password</h1>
            <p className="text-slate-400 text-sm mb-8">
              Enter the email address you signed up with and we'll send you a reset link.
            </p>

            {state === 'error' && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={state === 'loading'}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-medium text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {state === 'loading' ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
