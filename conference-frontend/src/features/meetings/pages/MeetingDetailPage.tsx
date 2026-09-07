import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Plus,
  Radio,
  UserMinus,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService, type Meeting } from '../../../services/meetings/meetings.service';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { MeetingDetailSkeleton } from '../components/MeetingsSkeletons';

/**
 * Preview detail for upcoming / ended / cancelled meetings.
 * Live meetings redirect straight into the conference room.
 */
export function MeetingDetailPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [directory, setDirectory] = useState<WorkspaceDirectoryMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !meetingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    meetingsService
      .get(activeWorkspace.workspaceId, meetingId)
      .then(setMeeting)
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId, meetingId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const isHostOrAdmin =
    Boolean(meeting && user?.id && meeting.createdBy === user.id) ||
    activeWorkspace?.role === 'owner' ||
    activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!inviteOpen || !activeWorkspace?.workspaceId || !isHostOrAdmin) return;
    let cancelled = false;
    workspaceService
      .listDirectory(activeWorkspace.workspaceId)
      .then((rows) => {
        if (!cancelled) setDirectory(rows.filter((m) => m.userId !== user?.id));
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, activeWorkspace?.workspaceId, isHostOrAdmin, user?.id]);

  const isRegistered = Boolean(
    meeting?.participantList?.some((p) => p.userId === user?.id),
  );

  const derived = useMemo(() => {
    if (!meeting) return null;
    const start = new Date(meeting.scheduledAt ?? meeting.startedAt ?? meeting.createdAt);
    const due =
      meeting.status === 'scheduled' &&
      Boolean(meeting.scheduledAt) &&
      new Date(meeting.scheduledAt).getTime() <= now;
    const status =
      meeting.status === 'live' || due
        ? 'live'
        : meeting.status === 'ended'
          ? 'ended'
          : meeting.status === 'cancelled'
            ? 'cancelled'
            : 'upcoming';
    const meta = {
      live: { label: 'Live now', badge: 'border-[#FECACA] bg-white text-[#DC2626]' },
      upcoming: { label: 'Upcoming', badge: 'border-[#DBEAFE] bg-white text-[#016BE6]' },
      ended: { label: 'Ended', badge: 'border-[#E2E8F0] bg-white text-[#475569]' },
      cancelled: { label: 'Cancelled', badge: 'border-[#FDE68A] bg-white text-[#B45309]' },
    }[status];
    return {
      status,
      meta,
      date: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      time: start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      duration: `${meeting.duration ?? 30}m`,
      agenda: (meeting.agenda ?? []).map((item, i) => ({ id: String(i), title: item, duration: '' })),
    };
  }, [meeting, now]);

  const invitedUserIds = useMemo(() => {
    return new Set((meeting?.participantList ?? []).map((p) => p.userId));
  }, [meeting?.participantList]);

  const inviteCandidates = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase();
    return directory
      .filter((m) => !invitedUserIds.has(m.userId))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [directory, invitedUserIds, inviteQuery]);

  if (loading) {
    return <MeetingDetailSkeleton />;
  }

  if (!meeting || !derived) {
    return <Navigate to="/app/meetings" replace />;
  }

  if (derived.status === 'live') {
    return <Navigate to={`/app/meeting/${meeting.roomId ?? meeting.id}`} replace />;
  }

  const participants =
    (meeting.participantList?.length
      ? meeting.participantList
      : [
          {
            userId: meeting.createdBy,
            name: meeting.createdByName || 'Host',
            email: '',
            avatarUrl: meeting.createdByAvatarUrl ?? null,
            avatarColor: meeting.createdByAvatarColor ?? null,
            status: 'registered' as const,
          },
        ]
    ).map((p) => ({
      id: p.userId,
      name: p.name,
      role:
        p.userId === meeting.createdBy
          ? 'Host'
          : p.status === 'joined'
            ? 'Joined'
            : p.status === 'invited'
              ? 'Invited'
              : 'Registered',
      avatarUrl: p.avatarUrl,
      avatarColor: p.avatarColor,
      email: 'email' in p ? p.email : undefined,
      isHost: p.userId === meeting.createdBy,
    }));
  const participantTotal = Math.max(
    participants.length,
    meeting.registeredParticipantCount ?? meeting.participants ?? meeting.peakParticipants ?? meeting.participantCount ?? 1,
  );
  const agenda = derived.agenda;
  const isEnded = derived.status === 'ended';
  const isCancelled = derived.status === 'cancelled';
  const canCancel = derived.status === 'upcoming';
  const canRegister = derived.status === 'upcoming' && !isRegistered && !isCancelled && !isEnded;
  const canManageInvites = isHostOrAdmin && derived.status === 'upcoming';

  const cancel = async () => {
    if (!activeWorkspace?.workspaceId || !meeting) return;
    setBusy(true);
    try {
      const updated = await meetingsService.cancel(activeWorkspace.workspaceId, meeting.id);
      setMeeting(updated);
      setCancelOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not cancel meeting.');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!activeWorkspace?.workspaceId) return;
    setRegistering(true);
    try {
      const updated = await meetingsService.register(activeWorkspace.workspaceId, meeting.id);
      setMeeting(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not register for meeting.');
    } finally {
      setRegistering(false);
    }
  };

  const togglePendingInvite = (userId: string) => {
    setPendingInviteIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const sendInvites = async () => {
    if (!activeWorkspace?.workspaceId || pendingInviteIds.length === 0) return;
    setInviteBusy(true);
    try {
      const updated = await meetingsService.addParticipants(
        activeWorkspace.workspaceId,
        meeting.id,
        { userIds: pendingInviteIds },
      );
      setMeeting(updated);
      setPendingInviteIds([]);
      setInviteQuery('');
      setInviteOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not add invitations.');
    } finally {
      setInviteBusy(false);
    }
  };

  const removeInvite = async (userId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    setInviteBusy(true);
    try {
      const updated = await meetingsService.removeParticipant(
        activeWorkspace.workspaceId,
        meeting.id,
        userId,
      );
      setMeeting(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this meeting?"
        description={`“${meeting.title || meeting.roomId}” will be marked as Cancelled. Participants will no longer be able to join.`}
        confirmLabel="Cancel meeting"
        cancelLabel="Keep meeting"
        danger
        busy={busy}
        onClose={() => {
          if (!busy) setCancelOpen(false);
        }}
        onConfirm={() => void cancel()}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/app/meetings')}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#016BE6] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Meetings
        </button>
        <div className="flex items-center gap-2">
          {canCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setCancelOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-3.5 text-[12px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-60"
            >
              <XCircle className="size-3.5" />
              {busy ? 'Cancelling…' : 'Cancel meeting'}
            </button>
          ) : null}
          {canRegister ? (
            <button
              type="button"
              disabled={registering}
              onClick={() => void register()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#016BE6] px-3.5 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
            >
              <Users className="size-3.5" />
              {registering ? 'Registering…' : 'Register for meeting'}
            </button>
          ) : isRegistered && derived.status === 'upcoming' ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 text-[12px] font-semibold text-[#15803D]">
              Registered
            </span>
          ) : null}
          {derived.status === 'upcoming' ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-[#F8FAFC] px-3.5 text-[12px] font-semibold text-[#64748B]">
              <Video className="size-3.5" />
              Join available at scheduled time
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold',
                  derived.meta.badge,
                )}
              >
                {derived.status === 'upcoming' ? <Radio className="size-3" /> : null}
                {derived.meta.label}
              </span>
            </div>
            <h1 className="text-[20px] font-bold tracking-tight text-[#151D2B] sm:text-[22px]">
              {meeting.title || meeting.roomId}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] text-[#6F7B8C]">
              Workspace meeting hosted by {meeting.createdByName}.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <InfoChip icon={CalendarDays} label="Date" value={derived.date} />
          <InfoChip icon={Clock3} label="Time" value={`${derived.time} · ${derived.duration}`} />
          <InfoChip icon={Users} label="Status" value={derived.meta.label} />
          <InfoChip icon={FileText} label="Host" value={meeting.createdByName} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Agenda</h2>
          {agenda.length === 0 ? (
            <p className="text-[12px] text-[#8A94A6]">No agenda items yet.</p>
          ) : (
            <ol className="space-y-2">
              {agenda.map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E8F1FF] text-[11px] font-bold text-[#016BE6]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{item.title}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#8A94A6]">{item.duration}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Participants</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6F7B8C]">
                {participantTotal} {participantTotal === 1 ? 'person' : 'people'}
              </span>
              {canManageInvites ? (
                <button
                  type="button"
                  onClick={() => setInviteOpen((o) => !o)}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#016BE6] px-2 text-[11px] font-semibold text-[#016BE6] hover:bg-[#E8F1FF]"
                >
                  <Plus className="size-3" />
                  Invite
                </button>
              ) : null}
            </div>
          </div>

          {canManageInvites && inviteOpen ? (
            <div className="mb-3 rounded-lg border border-[#E8ECF1] bg-[#F8FAFC] p-2.5">
              <input
                type="search"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="Search members to invite…"
                className="mb-2 h-8 w-full rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
              />
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {inviteCandidates.length === 0 ? (
                  <li className="px-1 py-2 text-[11px] text-[#8A94A6]">No members to invite.</li>
                ) : (
                  inviteCandidates.map((m) => {
                    const checked = pendingInviteIds.includes(m.userId);
                    return (
                      <li key={m.userId}>
                        <button
                          type="button"
                          onClick={() => togglePendingInvite(m.userId)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white',
                            checked && 'bg-white ring-1 ring-[#BFDBFE]',
                          )}
                        >
                          <UserAvatar
                            name={m.name}
                            avatarUrl={m.avatarUrl}
                            avatarColor={m.avatarColor}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-[#151D2B]">{m.name}</p>
                            <p className="truncate text-[10px] text-[#8A94A6]">{m.email}</p>
                          </div>
                          <span
                            className={cn(
                              'size-3.5 rounded border',
                              checked
                                ? 'border-[#016BE6] bg-[#016BE6]'
                                : 'border-[#CBD5E1] bg-white',
                            )}
                          />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <button
                type="button"
                disabled={inviteBusy || pendingInviteIds.length === 0}
                onClick={() => void sendInvites()}
                className="mt-2 w-full rounded-lg bg-[#016BE6] py-1.5 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
              >
                {inviteBusy
                  ? 'Sending…'
                  : pendingInviteIds.length > 0
                    ? `Invite ${pendingInviteIds.length}`
                    : 'Invite'}
              </button>
            </div>
          ) : null}

          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5">
                <UserAvatar
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  avatarColor={p.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#151D2B]">{p.name}</p>
                  <p className="truncate text-[10px] text-[#8A94A6]">
                    {p.role}
                    {p.email ? ` · ${p.email}` : ''}
                  </p>
                </div>
                {canManageInvites && !p.isHost ? (
                  <button
                    type="button"
                    disabled={inviteBusy}
                    title="Remove invitation"
                    onClick={() => void removeInvite(p.id)}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-60"
                  >
                    <UserMinus className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
            {participantTotal > participants.length ? (
              <li className="text-[11px] text-[#8A94A6]">
                +{participantTotal - participants.length} more registered
              </li>
            ) : null}
          </ul>
          {canRegister ? (
            <button
              type="button"
              disabled={registering}
              onClick={() => void register()}
              className="mt-3 w-full rounded-lg border border-[#016BE6] py-2 text-[12px] font-semibold text-[#016BE6] hover:bg-[#E8F1FF] disabled:opacity-60"
            >
              {registering ? 'Registering…' : 'Register for this meeting'}
            </button>
          ) : null}
        </section>
      </div>

      {isCancelled ? (
        <section className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-2 text-[13px] font-semibold text-[#92400E]">This meeting was cancelled</h2>
          <p className="text-[12px] text-[#B45309]">
            It stays in your history with Cancelled status. Joining the live room is disabled.
          </p>
        </section>
      ) : isEnded ? (
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-2 text-[13px] font-semibold text-[#151D2B]">Recording & notes</h2>
          <p className="mb-3 text-[12px] text-[#6F7B8C]">
            This meeting has ended. Check the recordings library for available files.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-2 text-[13px] font-semibold text-[#151D2B]">Meeting preview</h2>
          <ul className="list-inside list-disc space-y-1 text-[12px] text-[#6F7B8C]">
            <li>Title, time, and participant list are confirmed above.</li>
            <li>Host can add or remove invitations anytime before the meeting starts.</li>
            <li>Join stays locked until the scheduled date and time.</li>
            <li>Cancel anytime from this page or the meetings list.</li>
          </ul>
        </section>
      )}
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1 text-[#8A94A6]">
        <Icon className="size-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="truncate text-[12px] font-semibold text-[#151D2B]">{value}</p>
    </div>
  );
}
