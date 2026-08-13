import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, authHeaders } from '../services/auth/auth.service';
import { Video, Link2, LogOut, Copy, Check, Users, Clock, ExternalLink, RefreshCw, Calendar, X, Zap, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

interface Meeting {
  _id: string;
  roomId: string;
  createdByName: string;
  type?: 'instant' | 'scheduled';
  title?: string;
  scheduledAt?: string;
  duration?: number;
  createdAt: string;
}

export const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [newRoomId] = useState(() => authService.generateRoomId());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'instant' | 'scheduled'>('all');

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('30');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    setListError(null);
    try {
      const res = await fetch(`${API_URL}/meetings`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMeetings(Array.isArray(data) ? data : data.meetings || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setListError(data.error || 'Failed to load meetings. Try signing in again.');
      }
    } catch (e) {
      console.error('Failed to fetch meetings', e);
      setListError('Failed to load meetings.');
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleNewInstantMeeting = async () => {
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ roomId: newRoomId, type: 'instant', title: 'Instant Meeting' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to save instant meeting', data);
      }
    } catch (e) {
      console.error('Failed to save instant meeting', e);
    }
    navigate(`/room/${newRoomId}`);
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) return;

    setIsScheduling(true);
    setScheduleError(null);
    const scheduledRoomId = authService.generateRoomId();
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    try {
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          roomId: scheduledRoomId,
          type: 'scheduled',
          title: scheduleTitle.trim() || 'Scheduled Meeting',
          scheduledAt: scheduledDateTime,
          duration: parseInt(scheduleDuration, 10),
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setScheduleTitle('');
        setScheduleDate('');
        setScheduleTime('');
        await fetchMeetings();
      } else {
        const data = await res.json().catch(() => ({}));
        setScheduleError(data.error || 'Failed to schedule meeting.');
      }
    } catch (e) {
      console.error('Failed to schedule meeting', e);
      setScheduleError('Failed to schedule meeting.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    if (!window.confirm(`Delete "${meeting.title || meeting.roomId}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/meetings/${meeting._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m._id !== meeting._id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete meeting.');
      }
    } catch (e) {
      console.error('Failed to delete meeting', e);
      alert('Failed to delete meeting.');
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomId.trim().replace(/^.*\/room\//, '');
    if (clean) navigate(`/room/${clean}`);
  };

  const copyLink = (roomId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(roomId);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredMeetings = meetings.filter(m => {
    if (activeTab === 'instant') return m.type === 'instant' || !m.type;
    if (activeTab === 'scheduled') return m.type === 'scheduled';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Video size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MeetSpace</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: user?.avatarColor ?? '#3b82f6' }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-8 overflow-y-auto">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Welcome back, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Start an instant meeting, schedule one for later, or join an existing call.</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instant Meeting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold">Instant Meeting</h2>
                <p className="text-slate-400 text-xs mt-0.5">Start now & share link</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 mt-auto">
              <span className="text-xs text-slate-500 font-mono flex-1 truncate">{newRoomId}</span>
              <button
                onClick={() => copyLink(newRoomId)}
                className="text-slate-400 hover:text-white transition flex-shrink-0"
                title="Copy link"
              >
                {copied === newRoomId ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
            <button
              onClick={handleNewInstantMeeting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition shadow-lg shadow-blue-500/20"
            >
              Start now
            </button>
          </div>

          {/* Schedule Meeting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold">Schedule Meeting</h2>
                <p className="text-slate-400 text-xs mt-0.5">Plan for upcoming time</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-auto">Create a room link in advance and send invitations to your team.</p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              Schedule for later
            </button>
          </div>

          {/* Join Meeting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Link2 size={20} className="text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold">Join Meeting</h2>
                <p className="text-slate-400 text-xs mt-0.5">Enter room ID or link</p>
              </div>
            </div>
            <form onSubmit={handleJoin} className="flex flex-col gap-2 mt-auto">
              <input
                type="text"
                placeholder="e.g. abc-defg-hij"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={!joinRoomId.trim()}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition"
              >
                Join meeting
              </button>
            </form>
          </div>
        </div>

        {/* Meetings List with Tabs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock size={16} />
              <h2 className="text-base font-medium">Your Meetings</h2>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-1 border border-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                All ({meetings.length})
              </button>
              <button
                onClick={() => setActiveTab('instant')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'instant' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                Instant ({meetings.filter(m => m.type === 'instant' || !m.type).length})
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'scheduled' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
              >
                Scheduled ({meetings.filter(m => m.type === 'scheduled').length})
              </button>
              <button
                onClick={fetchMeetings}
                className="text-slate-500 hover:text-slate-300 transition px-2"
                title="Refresh meetings"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {listError && (
            <p className="text-sm text-red-400 mb-3">{listError}</p>
          )}

          {meetingsLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-600 text-sm gap-2 bg-slate-900/50 rounded-2xl border border-slate-800">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Users size={32} className="text-slate-700" />
              <p className="text-sm">No {activeTab !== 'all' ? activeTab : ''} meetings found.</p>
              <p className="text-xs text-slate-500">Start or schedule a meeting — it stays here until you delete it.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredMeetings.map(m => {
                const isScheduled = m.type === 'scheduled';
                return (
                  <div
                    key={m._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isScheduled ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {isScheduled ? <Calendar size={18} /> : <Zap size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {m.title || (isScheduled ? 'Scheduled Meeting' : 'Instant Meeting')}
                          </h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isScheduled ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {isScheduled ? 'Scheduled' : 'Instant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                          <span>ID: {m.roomId}</span>
                          {isScheduled && m.scheduledAt && (
                            <span className="text-purple-300 font-sans">
                              {formatDate(m.scheduledAt)} ({m.duration || 30} mins)
                            </span>
                          )}
                          {!isScheduled && (
                            <span className="text-slate-500 font-sans">Created {formatDate(m.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end flex-shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <button
                        onClick={() => copyLink(m.roomId)}
                        className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
                        title="Copy meeting link"
                      >
                        {copied === m.roomId ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        <span className="hidden sm:inline">Copy link</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(m)}
                        className="text-slate-400 hover:text-red-400 transition p-2 rounded-lg hover:bg-slate-800"
                        title="Delete meeting"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/room/${m.roomId}`)}
                        className={`flex items-center gap-1.5 text-xs text-white transition px-3 py-2 rounded-xl font-medium shadow-md ${isScheduled ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        <ExternalLink size={13} />
                        Join call
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-[slideUp_150ms_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
                  <Calendar size={18} />
                </div>
                <h2 className="text-lg font-semibold text-white">Schedule a Meeting</h2>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4">
              {scheduleError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {scheduleError}
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Meeting Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Team Sync"
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Duration (Minutes)
                </label>
                <select
                  value={scheduleDuration}
                  onChange={e => setScheduleDuration(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                </select>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2"
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
