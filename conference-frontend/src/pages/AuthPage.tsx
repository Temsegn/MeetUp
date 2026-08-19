import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Video, Mail, Lock, User, Eye, EyeOff, Info } from 'lucide-react';

type Mode = 'signin' | 'signup';

export const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        await signUp(name.trim(), email, password, rememberMe);
      } else {
        await signIn(email, password, rememberMe);
      }
      // PublicRoute redirects to / once the user is set.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      if (message.includes('password') && mode === 'signup') {
        setError('Password must be at least 10 characters with uppercase, lowercase, and a number.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordHint =
    mode === 'signup' ? 'At least 10 characters with upper & lowercase letters and a number.' : '';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Video size={22} className="text-white" />
        </div>
        <span className="text-2xl font-semibold text-white tracking-tight">MeetSpace</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white mb-2">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {mode === 'signin' ? 'Sign in to start or join a meeting.' : 'Sign up to start hosting and joining meetings.'}
        </p>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>
          )}

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

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-12 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
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

          {passwordHint && (
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              {passwordHint}
            </p>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 accent-blue-600"
              />
              Remember me
              <span className="text-xs text-slate-600">(7 days)</span>
            </label>

            {mode === 'signin' && (
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Forgot password?
              </Link>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-medium text-sm transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === 'signin' ? (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium transition">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium transition">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600">Secure authentication powered by MeetSpace</p>
    </div>
  );
};
