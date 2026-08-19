import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, SessionInfo } from '../services/auth/auth.service';
import {
  Video, ArrowLeft, Shield, Lock, Eye, EyeOff, MonitorSmartphone, LogOut,
  CheckCircle2, AlertTriangle, RefreshCw, Trash2, Mail,
} from 'lucide-react';

export const SecuritySettingsPage: React.FC = () => {
  const { user, signOutAll, resendVerification } = useAuth();
  const navigate = useNavigate();

  // ── Change password ───────────────────────────────────────────────────
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwOk, setPwOk] = useState(false);
  const [pwError, setPwError] = useState('');

  // ── Sessions ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // ── Verification ──────────────────────────────────────────────────────
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      setSessions(await authService.getSessions());
    } catch (err: unknown) {
      setSessionsError(err instanceof Error ? err.message : 'Could not load sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwOk(false);
    if (next !== confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    if (next.length < 10) {
      setPwError('Password must be at least 10 characters with upper & lowercase letters and a number.');
      return;
    }
    setPwBusy(true);
    try {
      await authService.changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setPwOk(true);
      setCurrent(''); setNext(''); setConfirm('');
      // Other sessions were revoked — refresh the list.
      void loadSessions();
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setPwBusy(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: unknown) {
      setSessionsError(err instanceof Error ? err.message : 'Could not revoke that session.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    setLoggingOutAll(true);
    try {
      await signOutAll();
      navigate('/auth', { replace: true });
    } catch (err: unknown) {
      setSessionsError(err instanceof Error ? err.message : 'Could not sign out all devices.');
      setLoggingOutAll(false);
    }
  };

  const handleResend = async () => {
    setVerifyBusy(true);
    setVerifyMsg('');
    try {
      await resendVerification();
      setVerifyMsg('Verification email sent — check your inbox.');
    } catch (err: unknown) {
      setVerifyMsg(err instanceof Error ? err.message : 'Could not resend the verification email.');
    } finally {
      setVerifyBusy(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-white transition p-1.5 -ml-1.5" title="Back to home">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Video size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MeetSpace</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shield size={15} className="text-blue-400" />
          <span className="hidden sm:inline">Security</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Security settings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Signed in as {user?.email} · manage your password and active sessions.
          </p>
        </div>

        {/* ── Email verification ─────────────────────────────────────────── */}
        {user && !user.emailVerified && (
          <section className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={19} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Email not verified</h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Verify {user.email} to keep your account fully active.
                  </p>
                  {verifyMsg && (
                    <p className="text-xs text-blue-300 mt-2 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> {verifyMsg}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleResend}
                disabled={verifyBusy}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-medium text-amber-300 transition disabled:opacity-60"
              >
                <Mail size={14} /> {verifyBusy ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          </section>
        )}

        {/* ── Change password ────────────────────────────────────────────── */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-blue-600/15 rounded-xl flex items-center justify-center">
              <Lock size={17} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Change password</h2>
              <p className="text-xs text-slate-500">All other devices will be signed out.</p>
            </div>
          </div>

          {pwOk && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={15} /> Password changed successfully.
            </div>
          )}
          {pwError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {(['Current password', 'New password', 'Confirm new password'] as const).map((label, i) => {
              const value = i === 0 ? current : i === 1 ? next : confirm;
              const set = i === 0 ? setCurrent : i === 1 ? setNext : setConfirm;
              return (
                <div key={label} className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder={label}
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required={i === 0 ? false : true}
                    minLength={i === 0 ? 1 : 10}
                  />
                  {i === 1 && (
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="submit"
              disabled={pwBusy}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition"
            >
              {pwBusy ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>

        {/* ── Sessions ───────────────────────────────────────────────────── */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-purple-600/15 rounded-xl flex items-center justify-center">
                <MonitorSmartphone size={17} className="text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold">Active sessions</h2>
                <p className="text-xs text-slate-500">Devices currently signed in to your account.</p>
              </div>
            </div>
            <button
              onClick={handleLogoutAll}
              disabled={loggingOutAll || sessions.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-medium text-red-300 transition disabled:opacity-50"
            >
              <LogOut size={14} />
              {loggingOutAll ? 'Signing out...' : 'Sign out all'}
            </button>
          </div>

          {sessionsError && (
            <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {sessionsError}
            </p>
          )}

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600 text-sm gap-2">
              <RefreshCw size={15} className="animate-spin" /> Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No active sessions.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <MonitorSmartphone size={15} className="text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{s.userAgent}</p>
                      {s.current && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                          This device
                        </span>
                      )}
                      {s.rememberMe && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Remembered
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.ip} · active {formatDate(s.lastUsedAt)} · expires {formatDate(s.expiresAt)}
                    </p>
                  </div>
                  {!s.current && (
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={revokingId === s.id}
                      className="text-slate-500 hover:text-red-400 transition p-2 rounded-lg hover:bg-slate-700 flex-shrink-0"
                      title="Revoke session"
                    >
                      {revokingId === s.id ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-600">
          Access tokens expire every 15 minutes and are restored automatically from your secure session.
        </p>
      </main>
    </div>
  );
};
