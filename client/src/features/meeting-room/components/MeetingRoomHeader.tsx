import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Copy, Link2, Mail, MoreHorizontal, Users } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { guestJoinUrl } from '../../../lib/frontendUrl';

type Props = {
  title: string;
  roomId: string;
  participantCount: number;
  isHost?: boolean;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  startedAt?: string | null;
  recording?: boolean;
  recordingElapsedMs?: number;
  userName?: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  onLeave: () => void;
  onOpenParticipants?: () => void;
  onInviteByEmail?: () => void;
};

function formatClock(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MeetingRoomHeader({
  title,
  roomId,
  participantCount,
  isHost,
  scheduledAt,
  durationMinutes,
  startedAt,
  recording,
  recordingElapsedMs = 0,
  userName,
  avatarUrl,
  avatarColor,
  onLeave,
  onOpenParticipants,
  onInviteByEmail,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const scheduleLabel = useMemo(() => {
    if (!scheduledAt) return null;
    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + Math.max(15, durationMinutes ?? 60) * 60_000);
    return `${formatClock(start)} – ${formatClock(end)}`;
  }, [scheduledAt, durationMinutes]);

  const [sessionStart] = useState(() => Date.now());
  const liveElapsed = formatElapsed(
    now - (startedAt ? new Date(startedAt).getTime() : sessionStart),
  );

  return (
    <div className="relative z-40 flex min-w-0 items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <h1 className="truncate text-[14px] font-bold tracking-[-0.02em] text-[#121B29] sm:text-[18px] lg:text-[20px]">
            {title}
          </h1>
          <BadgeCheck className="hidden size-4 shrink-0 text-[#076BEE] sm:block sm:size-5" aria-hidden />
          {isHost ? (
            <span className="shrink-0 rounded-md bg-[#E8F1FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#016BE6]">
              Host
            </span>
          ) : null}
          {isHost && recording ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#DC2626] sm:text-[11px]"
              aria-live="polite"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#DC2626]" />
              </span>
              REC {formatElapsed(recordingElapsedMs)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[12px] tracking-[-0.01em] text-[#667383] sm:text-[13px]">
          {scheduleLabel ? <span>{scheduleLabel} • </span> : null}
          <span className="font-semibold text-[#076BEE]">{liveElapsed}</span>
          {durationMinutes ? (
            <span className="text-[#94A3B8]"> / {durationMinutes} min</span>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onOpenParticipants}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E8ECF1] bg-white px-2.5 text-[13px] font-medium text-[#121B29] hover:bg-[#F8FAFC] sm:h-10 sm:rounded-2xl sm:px-3"
          aria-label="Participants"
        >
          <Users className="size-4 text-[#334155] sm:size-[18px]" />
          {participantCount}
        </button>

        <div className="relative z-50" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8ECF1] bg-white text-[#334155] hover:bg-[#F8FAFC] sm:size-10 sm:rounded-2xl"
            aria-label="Meeting options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="size-4 sm:size-[18px]" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-[100] mt-2 min-w-[200px] rounded-xl border border-[#E0E7EE] bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                onClick={() => {
                  void navigator.clipboard.writeText(guestJoinUrl(roomId)).then(() => {
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 1500);
                  });
                  setMenuOpen(false);
                }}
              >
                <Link2 className="size-3.5 shrink-0 text-[#016BE6]" />
                {linkCopied ? 'Link copied' : 'Copy link'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                onClick={() => {
                  void navigator.clipboard.writeText(roomId);
                  setMenuOpen(false);
                }}
              >
                <Copy className="size-3.5 shrink-0 text-[#667383]" />
                Copy meeting ID
              </button>
              {isHost && onInviteByEmail ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                  onClick={() => {
                    setMenuOpen(false);
                    onInviteByEmail();
                  }}
                >
                  <Mail className="size-3.5 shrink-0 text-[#016BE6]" />
                  Invite by email
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative hidden sm:block">
          <UserAvatar
            name={userName}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            size="lg"
            className="!size-10"
          />
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#00A45C]" />
        </div>
      </div>
    </div>
  );
}
