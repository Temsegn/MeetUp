import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, Plus, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationCenter } from '../../../contexts/NotificationCenterContext';
import { meetingsService } from '../../../services/meetings/meetings.service';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { teamsService } from '../../../services/teams/teams.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateMeetingMenu() {
  const navigate = useNavigate();
  const { activeWorkspace, user } = useAuth();
  const { pushLocalNotification } = useNotificationCenter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState<'instant' | 'scheduled' | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceDirectoryMember[]>([]);
  const [teammateIds, setTeammateIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [guestEmailDraft, setGuestEmailDraft] = useState('');
  const [agendaItems, setAgendaItems] = useState<string[]>(['']);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuOpen]);

  useEffect(() => {
    if (!createOpen || !activeWorkspace?.workspaceId) return;
    workspaceService
      .get(activeWorkspace.workspaceId)
      .then((ws) => {
        const mins = ws.settings?.maxMeetingDurationMinutes;
        if (typeof mins === 'number' && mins > 0) setDuration(mins);
      })
      .catch(() => undefined);

    Promise.all([
      workspaceService.listDirectory(activeWorkspace.workspaceId),
      teamsService.list(activeWorkspace.workspaceId, { status: 'active' }).catch(() => []),
    ])
      .then(([rows, teams]) => {
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
        setMembers(rows.filter((m) => m.userId !== myId && !teammates.has(m.userId)));
      })
      .catch(() => {
        setMembers([]);
        setTeammateIds(new Set());
      });
  }, [createOpen, activeWorkspace?.workspaceId, user?.id]);

  const nonTeamMembers = useMemo(
    () => members.filter((m) => !teammateIds.has(m.userId)),
    [members, teammateIds],
  );

  const reset = () => {
    setTitle('');
    setScheduledAt('');
    setDuration(30);
    setError(null);
    setSelectedIds([]);
    setGuestEmails([]);
    setGuestEmailDraft('');
    setAgendaItems(['']);
    setCreateOpen(null);
    setMenuOpen(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const addGuestEmail = () => {
    const email = guestEmailDraft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid guest email.');
      return;
    }
    if (guestEmails.includes(email)) {
      setGuestEmailDraft('');
      return;
    }
    setGuestEmails((prev) => [...prev, email]);
    setGuestEmailDraft('');
    setError(null);
  };

  const create = async () => {
    if (!activeWorkspace?.workspaceId) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (createOpen === 'scheduled' && !scheduledAt) {
      setError('Date and time are required.');
      return;
    }
    const draft = guestEmailDraft.trim().toLowerCase();
    const emails = [...guestEmails];
    if (draft) {
      if (!EMAIL_RE.test(draft)) {
        setError('Enter a valid guest email.');
        return;
      }
      if (!emails.includes(draft)) emails.push(draft);
    }
    setSaving(true);
    setError(null);
    try {
      const agenda = agendaItems.map((a) => a.trim()).filter(Boolean);
      const meeting = await meetingsService.create(activeWorkspace.workspaceId, {
        type: createOpen === 'scheduled' ? 'scheduled' : 'instant',
        title: title.trim(),
        scheduledAt: createOpen === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
        duration,
        participantIds: selectedIds,
        guestEmails: emails,
        agenda: agenda.length > 0 ? agenda : undefined,
      });
      const inviteBits = [
        selectedIds.length > 0 ? `${selectedIds.length} member` : null,
        emails.length > 0 ? `${emails.length} guest email` : null,
      ].filter(Boolean);
      pushLocalNotification(
        createOpen === 'scheduled' ? 'Meeting scheduled' : 'Meeting created',
        inviteBits.length > 0
          ? `${meeting.title} is ready · invited ${inviteBits.join(' · ')}.`
          : `${meeting.title} is ready.`,
        {
          kind: 'meeting',
          href:
            createOpen === 'scheduled'
              ? `/app/meetings/${meeting.id}`
              : `/app/meeting/${meeting.roomId}`,
        },
      );
      reset();
      if (createOpen === 'scheduled') navigate(`/app/meetings/${meeting.id}`);
      else navigate(`/app/meeting/${meeting.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create meeting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 w-auto max-w-[168px] shrink-0 items-stretch overflow-hidden rounded-[14px] bg-[#DC6C7C] text-white shadow-sm hover:bg-[#d45a6c] sm:w-[168px]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 px-3 text-[13px] font-semibold">
          <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
          <span className="truncate">New Meeting</span>
        </span>
        <span aria-hidden className="my-1.5 w-px shrink-0 bg-white/50" />
        <span className="flex w-8 shrink-0 items-center justify-center">
          <ChevronDown
            className={`size-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      {menuOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#E1E7EE] bg-white p-2 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            onClick={() => {
              setCreateOpen('instant');
              setMenuOpen(false);
            }}
            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#F8FAFC]"
          >
            <Video className="mt-0.5 size-4 text-[#016BE6]" />
            <div>
              <p className="text-[12px] font-semibold text-[#151D2B]">Instant meeting</p>
              <p className="text-[11px] text-[#6F7B8C]">Add a title, then jump into the live room.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateOpen('scheduled');
              setMenuOpen(false);
            }}
            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#F8FAFC]"
          >
            <CalendarClock className="mt-0.5 size-4 text-[#016BE6]" />
            <div>
              <p className="text-[12px] font-semibold text-[#151D2B]">Scheduled meeting</p>
              <p className="text-[11px] text-[#6F7B8C]">Choose title, date, and participants.</p>
            </div>
          </button>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl">
            <h3 className="text-[16px] font-bold text-[#151D2B]">
              {createOpen === 'instant' ? 'Start instant meeting' : 'Schedule a meeting'}
            </h3>
            <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto">
              <label className="block text-[12px] font-semibold text-[#475569]">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border border-[#E1E7EE] px-3 text-[16px] outline-none sm:h-10 sm:text-[13px]"
                  placeholder="Weekly sync"
                  autoFocus
                />
              </label>
              {createOpen === 'scheduled' ? (
                <label className="block text-[12px] font-semibold text-[#475569]">
                  Date & time
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 h-12 w-full rounded-lg border border-[#E1E7EE] px-3 text-[16px] outline-none sm:h-10 sm:text-[13px]"
                  />
                </label>
              ) : null}
              <label className="block text-[12px] font-semibold text-[#475569]">
                Duration (minutes)
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 30)}
                  className="mt-1 h-12 w-full rounded-lg border border-[#E1E7EE] px-3 text-[16px] outline-none sm:h-10 sm:text-[13px]"
                />
              </label>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-[#475569]">Agenda (optional)</p>
                  <button
                    type="button"
                    onClick={() => setAgendaItems((prev) => [...prev, ''])}
                    className="text-[11px] font-semibold text-[#016BE6] hover:underline"
                  >
                    + Add item
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {agendaItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-[11px] text-[#94A3B8]">{index + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const next = [...agendaItems];
                          next[index] = e.target.value;
                          setAgendaItems(next);
                        }}
                        placeholder="Agenda topic"
                        className="h-11 min-w-0 flex-1 rounded-lg border border-[#E1E7EE] px-3 text-[16px] outline-none sm:h-9 sm:text-[13px]"
                      />
                      {agendaItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setAgendaItems((prev) => prev.filter((_, i) => i !== index))}
                          className="text-[11px] font-medium text-[#DC2626]"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[#475569]">
                  Invite by email (guests)
                  {guestEmails.length > 0 ? ` (${guestEmails.length})` : ''}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8A94A6]">
                  Guests get an email with a join link. They enter their name; the invited email is
                  already recognized.
                </p>
                {guestEmails.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {guestEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[11px] font-medium text-[#016BE6]"
                      >
                        {email}
                        <button
                          type="button"
                          aria-label={`Remove ${email}`}
                          onClick={() => setGuestEmails((prev) => prev.filter((e) => e !== email))}
                          className="rounded-full p-0.5 hover:bg-[#BFDBFE]"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={guestEmailDraft}
                    onChange={(e) => setGuestEmailDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addGuestEmail();
                      }
                    }}
                    placeholder="guest@example.com"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-[#E1E7EE] px-3 text-[16px] outline-none sm:h-9 sm:text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={addGuestEmail}
                    className="h-9 shrink-0 rounded-lg border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#016BE6] hover:bg-[#F8FAFC]"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[#475569]">
                  Other workspace members
                  {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8A94A6]">
                  Your teammates are added automatically and are not listed here. Invite only
                  members outside your teams if needed.
                </p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#EEF2F6] p-2">
                  {nonTeamMembers.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-[#94A3B8]">
                      No non-team members to invite.
                    </p>
                  ) : (
                    nonTeamMembers.map((m) => {
                      const checked = selectedIds.includes(m.userId);
                      return (
                        <label
                          key={m.userId}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#F8FAFC]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(m.userId)}
                            className="size-3.5 accent-[#016BE6]"
                          />
                          <UserAvatar
                            name={m.name}
                            avatarUrl={m.avatarUrl}
                            avatarColor={m.avatarColor}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#151D2B]">
                            {m.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-[#E1E7EE] px-3 py-2 text-[12px] font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void create()}
                disabled={saving || !title.trim()}
                className="rounded-lg bg-[#016BE6] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : createOpen === 'instant' ? 'Create & join' : 'Create meeting'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
