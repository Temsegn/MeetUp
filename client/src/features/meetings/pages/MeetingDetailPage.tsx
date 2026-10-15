import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Download,
  FileText,
  Link2,
  Mail,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  UserMinus,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService, type Meeting } from '../../../services/meetings/meetings.service';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { teamsService } from '../../../services/teams/teams.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { MeetingDetailSkeleton } from '../components/MeetingsSkeletons';
import { guestJoinUrl } from '../../../lib/frontendUrl';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMMON_TIMEZONES = [
  'UTC',
  'Africa/Addis_Ababa',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Europe/London',
  'America/New_York',
];

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
  const [teammateIds, setTeammateIds] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([]);
  const [guestEmailDraft, setGuestEmailDraft] = useState('');
  const [pendingGuestEmails, setPendingGuestEmails] = useState<string[]>([]);
  const [retryBusy, setRetryBusy] = useState(false);
  const [icsBusy, setIcsBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editTimezone, setEditTimezone] = useState('UTC');
  const [editLocation, setEditLocation] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [peopleExpanded, setPeopleExpanded] = useState(false);

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
    setPeopleExpanded(false);
  }, [meetingId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const isHost = Boolean(meeting && user?.id && meeting.createdBy === user.id);
  const isOwnerOrAdmin =
    activeWorkspace?.role === 'admin';
  const isHostOrAdmin = isHost || isOwnerOrAdmin;

  useEffect(() => {
    if (!inviteOpen || !activeWorkspace?.workspaceId || !isHost) return;
    let cancelled = false;
    Promise.all([
      workspaceService.listDirectory(activeWorkspace.workspaceId),
      teamsService.list(activeWorkspace.workspaceId, { status: 'active' }).catch(() => []),
    ])
      .then(([rows, teams]) => {
        if (cancelled) return;
        const myId = user?.id;
        const teammates = new Set<string>();
        for (const t of teams) {
          if (!myId) continue;
          if (t.leadUserId === myId || t.memberIds.includes(myId)) {
            for (const id of t.memberIds) {
              if (id !== myId) teammates.add(id);
            }
            if (t.leadUserId && t.leadUserId !== myId) teammates.add(t.leadUserId);
          }
        }
        setTeammateIds(teammates);
        setDirectory(rows.filter((m) => m.userId !== myId && !teammates.has(m.userId)));
      })
      .catch(() => {
        if (!cancelled) {
          setDirectory([]);
          setTeammateIds(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, activeWorkspace?.workspaceId, isHost, user?.id]);

  const isRegistered = Boolean(
    meeting?.participantList?.some((p) => p.userId === user?.id),
  );

  const derived = useMemo(() => {
    if (!meeting) return null;
    const start = new Date(meeting.scheduledAt ?? meeting.startedAt ?? meeting.createdAt);
    const durationMs = Math.max(1, meeting.duration ?? 30) * 60_000;
    const scheduleEnded =
      Boolean(meeting.scheduledAt) &&
      new Date(meeting.scheduledAt as string).getTime() + durationMs <= now;
    const status =
      meeting.status === 'live'
        ? 'live'
        : meeting.status === 'ended' || (meeting.status === 'scheduled' && scheduleEnded)
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
    const existingGuests = new Set((meeting?.guestEmails ?? []).map((e) => e.toLowerCase()));
    return directory
      .filter((m) => !invitedUserIds.has(m.userId))
      .filter((m) => !teammateIds.has(m.userId))
      .filter((m) => !existingGuests.has(m.email.toLowerCase()))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [directory, invitedUserIds, inviteQuery, teammateIds, meeting?.guestEmails]);

  if (loading) {
    return <MeetingDetailSkeleton />;
  }

  if (!meeting || !derived) {
    return <Navigate to="/app/meetings" replace />;
  }

  if (meeting.status === 'live' && derived.status === 'live') {
    return <Navigate to={`/app/meeting/${meeting.roomId ?? meeting.id}`} replace />;
  }

  const roster =
    meeting.participantList?.length
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
        ];
  const rosterEmails = new Set(
    roster.map((p) => ('email' in p ? String(p.email || '') : '').trim().toLowerCase()).filter(Boolean),
  );
  const participants = [
    ...roster
      .filter((p) => !String(p.userId).startsWith('guest:'))
      .map((p) => ({
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
        avatarUrl: p.avatarUrl ?? null,
        avatarColor: p.avatarColor ?? null,
        email: 'email' in p ? p.email : undefined,
        isHost: p.userId === meeting.createdBy,
        isGuest: false,
      })),
    ...(meeting.guestEmails ?? [])
      .map((email) => String(email || '').trim().toLowerCase())
      .filter((email) => email && !rosterEmails.has(email))
      .map((email) => ({
        id: `guest:${email}`,
        name: email,
        role: 'Guest',
        avatarUrl: null as string | null,
        avatarColor: null as string | null,
        email,
        isHost: false,
        isGuest: true,
      })),
  ];
  const participantTotal = participants.length;
  const visibleParticipants = peopleExpanded ? participants : participants.slice(0, 3);
  const agenda = derived.agenda;
  const isEnded = derived.status === 'ended';
  const isCancelled = derived.status === 'cancelled';
  const canCancel =
    (derived.status === 'upcoming' || derived.status === 'live') &&
    (isHost || isOwnerOrAdmin);
  const canRegister = derived.status === 'upcoming' && !isRegistered && !isCancelled && !isEnded;
  const canManageInvites = isHost && derived.status === 'upcoming';
  const canEdit = isHostOrAdmin && derived.status === 'upcoming';
  const joinLink =
    meeting.joinUrl ||
    guestJoinUrl(meeting.roomId) ||
    `${window.location.origin}/join/${encodeURIComponent(meeting.roomId)}`;

  const openEdit = () => {
    if (!meeting) return;
    setEditTitle(meeting.title || '');
    const start = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;
    if (start && !Number.isNaN(start.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      setEditScheduledAt(
        `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
      );
    } else {
      setEditScheduledAt('');
    }
    setEditDuration(meeting.duration ?? 30);
    setEditTimezone(meeting.timezone || 'UTC');
    setEditLocation(meeting.location || '');
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!activeWorkspace?.workspaceId || !meeting) return;
    if (!editTitle.trim()) {
      setEditError('Title is required.');
      return;
    }
    if (!editScheduledAt) {
      setEditError('Date and time are required.');
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await meetingsService.patch(activeWorkspace.workspaceId, meeting.id, {
        title: editTitle.trim(),
        scheduledAt: new Date(editScheduledAt).toISOString(),
        duration: editDuration,
        timezone: editTimezone,
        location: editLocation.trim(),
      });
      setMeeting(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update meeting.');
    } finally {
      setEditBusy(false);
    }
  };

  const retryInvites = async () => {
    if (!activeWorkspace?.workspaceId || !meeting) return;
    setRetryBusy(true);
    try {
      const updated = await meetingsService.retryInvitations(
        activeWorkspace.workspaceId,
        meeting.id,
      );
      setMeeting(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not retry invitations.');
    } finally {
      setRetryBusy(false);
    }
  };

  const downloadIcs = async () => {
    if (!activeWorkspace?.workspaceId || !meeting) return;
    setIcsBusy(true);
    try {
      await meetingsService.downloadCalendarIcs(activeWorkspace.workspaceId, meeting.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not download .ics file.');
    } finally {
      setIcsBusy(false);
    }
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      window.alert('Could not copy link.');
    }
  };

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
    if (!activeWorkspace?.workspaceId) return;
    const draft = guestEmailDraft.trim().toLowerCase();
    const emails = [...pendingGuestEmails];
    if (draft) {
      if (!EMAIL_RE.test(draft)) {
        window.alert('Enter a valid guest email.');
        return;
      }
      if (!emails.includes(draft)) emails.push(draft);
    }
    if (pendingInviteIds.length === 0 && emails.length === 0) return;
    setInviteBusy(true);
    try {
      const updated = await meetingsService.addParticipants(
        activeWorkspace.workspaceId,
        meeting.id,
        {
          userIds: pendingInviteIds,
          guestEmails: emails,
        },
      );
      setMeeting(updated);
      setPendingInviteIds([]);
      setPendingGuestEmails([]);
      setGuestEmailDraft('');
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
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
          ) : null}
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
          <InfoChip
            icon={Clock3}
            label="Time"
            value={`${derived.time} · ${derived.duration}${meeting.timezone ? ` · ${meeting.timezone}` : ''}`}
          />
          <InfoChip icon={Users} label="Status" value={derived.meta.label} />
          <InfoChip icon={FileText} label="Host" value={meeting.createdByName} />
        </div>
        {meeting.location ? (
          <p className="mt-3 text-[12px] text-[#6F7B8C]">
            Location: <span className="font-semibold text-[#334155]">{meeting.location}</span>
          </p>
        ) : null}
      </section>

      {!isCancelled ? (
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Join & calendar</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void copyJoinLink()}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
            >
              <Link2 className="size-3.5" />
              {copyDone ? 'Link copied' : 'Copy join link'}
            </button>
            {meeting.googleCalendarUrl ? (
              <a
                href={meeting.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                <CalendarPlus className="size-3.5 text-[#016BE6]" />
                Add to Google Calendar
              </a>
            ) : null}
            {meeting.outlookCalendarUrl ? (
              <a
                href={meeting.outlookCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                <CalendarDays className="size-3.5 text-[#016BE6]" />
                Add to Outlook
              </a>
            ) : null}
            <button
              type="button"
              disabled={icsBusy}
              onClick={() => void downloadIcs()}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
            >
              <Download className="size-3.5" />
              {icsBusy ? 'Downloading…' : 'Download .ics'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#8A94A6]">
            Google and Outlook links open a prefilled event — you still confirm to save it. Email
            invitations include a calendar attachment when SMTP is configured.
          </p>
        </section>
      ) : null}

      {meeting.invitations && (isHostOrAdmin || (meeting.invitations.deliveries?.length ?? 0) > 0) ? (
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#151D2B]">
              <Mail className="size-3.5 text-[#016BE6]" />
              Invitation delivery
            </h2>
            {isHostOrAdmin && meeting.invitations.failed > 0 ? (
              <button
                type="button"
                disabled={retryBusy}
                onClick={() => void retryInvites()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#016BE6] px-2.5 text-[11px] font-semibold text-[#016BE6] hover:bg-[#E8F1FF] disabled:opacity-60"
              >
                <RefreshCw className={cn('size-3', retryBusy && 'animate-spin')} />
                {retryBusy ? 'Retrying…' : 'Retry failed'}
              </button>
            ) : null}
          </div>
          {!meeting.invitations.smtpConfigured ? (
            <p className="mb-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#92400E]">
              SMTP is not configured on the server. Meetings are saved, but emails are only logged
              until SMTP_HOST is set.
            </p>
          ) : null}
          <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[#15803D]">
              Sent {meeting.invitations.sent}
            </span>
            <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[#DC2626]">
              Failed {meeting.invitations.failed}
            </span>
            <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[#64748B]">
              Pending {meeting.invitations.pending}
            </span>
          </div>
          {meeting.invitations.deliveries.length === 0 ? (
            <p className="text-[12px] text-[#8A94A6]">No invitation emails yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto">
              {meeting.invitations.deliveries.map((d) => (
                <li
                  key={`${d.email}-${d.sequence}-${d.kind}`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{d.email}</p>
                    <p className="text-[10px] text-[#8A94A6]">
                      {d.kind} · seq {d.sequence} · attempts {d.attempts}
                    </p>
                    {d.lastError ? (
                      <p className="mt-0.5 text-[10px] text-[#DC2626]">{d.lastError}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      d.status === 'accepted'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : d.status === 'failed'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#E2E8F0] text-[#475569]',
                    )}
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl">
            <h3 className="text-[16px] font-bold text-[#151D2B]">Edit meeting</h3>
            <p className="mt-1 text-[12px] text-[#6F7B8C]">
              Saving sends an updated calendar invitation to attendees.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-[12px] font-semibold text-[#475569]">
                Title
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-[#E1E7EE] px-3 text-[14px] outline-none"
                />
              </label>
              <label className="block text-[12px] font-semibold text-[#475569]">
                Date & time
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-[#E1E7EE] px-3 text-[14px] outline-none"
                />
              </label>
              <label className="block text-[12px] font-semibold text-[#475569]">
                Duration (minutes)
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value) || 30)}
                  className="mt-1 h-11 w-full rounded-lg border border-[#E1E7EE] px-3 text-[14px] outline-none"
                />
              </label>
              <label className="block text-[12px] font-semibold text-[#475569]">
                Time zone
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-[#E1E7EE] bg-white px-3 text-[14px] outline-none"
                >
                  {[...new Set([editTimezone, ...COMMON_TIMEZONES])].map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-[#475569]">
                Location
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-[#E1E7EE] px-3 text-[14px] outline-none"
                />
              </label>
              {editError ? <p className="text-[12px] text-[#DC2626]">{editError}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={editBusy}
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-[#E1E7EE] px-3 py-2 text-[12px] font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => void saveEdit()}
                className="rounded-lg bg-[#016BE6] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {editBusy ? 'Saving…' : 'Save & notify'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              <p className="mb-1.5 text-[11px] font-semibold text-[#475569]">Invite guest by email</p>
              <p className="mb-2 text-[10px] text-[#8A94A6]">
                Guests get an email join link. Teammates are already on the meeting.
              </p>
              {pendingGuestEmails.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1">
                  {pendingGuestEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[10px] font-medium text-[#016BE6]"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setPendingGuestEmails((prev) => prev.filter((e) => e !== email))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mb-2 flex gap-1.5">
                <input
                  type="email"
                  value={guestEmailDraft}
                  onChange={(e) => setGuestEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const email = guestEmailDraft.trim().toLowerCase();
                      if (!EMAIL_RE.test(email)) return;
                      setPendingGuestEmails((prev) =>
                        prev.includes(email) ? prev : [...prev, email],
                      );
                      setGuestEmailDraft('');
                    }
                  }}
                  placeholder="guest@example.com"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] outline-none focus:border-[#016BE6]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const email = guestEmailDraft.trim().toLowerCase();
                    if (!EMAIL_RE.test(email)) return;
                    setPendingGuestEmails((prev) =>
                      prev.includes(email) ? prev : [...prev, email],
                    );
                    setGuestEmailDraft('');
                  }}
                  className="h-8 rounded-lg border border-[#E1E7EE] px-2 text-[11px] font-semibold text-[#016BE6]"
                >
                  Add
                </button>
              </div>
              <input
                type="search"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="Search non-team members…"
                className="mb-2 h-8 w-full rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
              />
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {inviteCandidates.length === 0 ? (
                  <li className="px-1 py-2 text-[11px] text-[#8A94A6]">No non-team members to invite.</li>
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
                disabled={
                  inviteBusy ||
                  (pendingInviteIds.length === 0 &&
                    pendingGuestEmails.length === 0 &&
                    !guestEmailDraft.trim())
                }
                onClick={() => void sendInvites()}
                className="mt-2 w-full rounded-lg bg-[#016BE6] py-1.5 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
              >
                {inviteBusy ? 'Sending…' : 'Send invitations'}
              </button>
            </div>
          ) : null}

          <ul className="space-y-2">
            {visibleParticipants.map((p) => (
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
                    {p.email && p.role !== 'Guest' ? ` · ${p.email}` : ''}
                  </p>
                </div>
                {canManageInvites && !p.isHost ? (
                  <button
                    type="button"
                    disabled={inviteBusy}
                    title={p.isGuest ? 'Remove guest invitation' : 'Remove invitation'}
                    onClick={() => {
                      if (p.isGuest) {
                        void (async () => {
                          if (!activeWorkspace?.workspaceId || !p.email) return;
                          setInviteBusy(true);
                          try {
                            const updated = await meetingsService.removeGuestEmail(
                              activeWorkspace.workspaceId,
                              meeting.id,
                              p.email,
                            );
                            setMeeting(updated);
                          } catch (err) {
                            window.alert(
                              err instanceof Error ? err.message : 'Could not remove guest.',
                            );
                          } finally {
                            setInviteBusy(false);
                          }
                        })();
                        return;
                      }
                      void removeInvite(p.id);
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-60"
                  >
                    <UserMinus className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {participants.length > 3 ? (
            <button
              type="button"
              onClick={() => setPeopleExpanded((open) => !open)}
              className="mt-2 text-[12px] font-semibold text-[#016BE6] hover:underline"
            >
              {peopleExpanded ? 'Show less' : `View more (${participants.length - 3})`}
            </button>
          ) : null}
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
