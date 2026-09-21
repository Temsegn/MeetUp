import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ChevronDown, LogOut, Mail, MoreHorizontal, Users } from 'lucide-react';
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="truncate text-[22px] font-bold tracking-[-0.02em] text-[#121B29] sm:text-[24px] lg:text-[27px]">
            {title}
          </h1>
          <BadgeCheck className="size-5 shrink-0 text-[#076BEE]" aria-hidden />
          {isHost ? (
            <span className="shrink-0 rounded-md bg-[#E8F1FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#016BE6]">
              Host
            </span>
          ) : null}
          {isHost && recording ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#DC2626]"
              aria-live="polite"
            >
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[#DC2626]" />
              </span>
              REC {formatElapsed(recordingElapsedMs)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[14px] tracking-[-0.01em] text-[#667383] sm:text-[15px]">
          {scheduleLabel ? <span>{scheduleLabel} • </span> : <span className="font-mono text-[13px]">{roomId} • </span>}
          <span className="font-semibold text-[#076BEE]">{liveElapsed}</span>
          {durationMinutes ? (
            <span className="text-[#94A3B8]"> / {durationMinutes} min</span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onOpenParticipants}
            className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-[#E0E7EE] bg-white px-3.5 text-[14px] font-medium text-[#121B29] hover:bg-[#F8FAFC]"
            aria-label="Participants"
          >
            <Users className="size-[18px] text-[#334155]" />
            {participantCount}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex size-11 items-center justify-center rounded-[18px] border border-[#E0E7EE] bg-white text-[#334155] hover:bg-[#F8FAFC]"
              aria-label="More"
            >
              <MoreHorizontal className="size-[18px]" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-[#E0E7EE] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                  onClick={() => {
                    void navigator.clipboard.writeText(roomId);
                    setMenuOpen(false);
                  }}
                >
                  Copy meeting ID
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                  onClick={() => {
                    void navigator.clipboard.writeText(guestJoinUrl(roomId));
                    setMenuOpen(false);
                  }}
                >
                  Copy invite link
                </button>
                {isHost && onInviteByEmail ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                    onClick={() => {
                      setMenuOpen(false);
                      onInviteByEmail();
                    }}
                  >
                    <Mail className="size-3.5 text-[#016BE6]" />
                    Invite by email
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="inline-flex h-11 items-center gap-2 rounded-[18px] bg-[#DC6C7C] px-4 text-[14px] font-semibold text-white hover:bg-[#D15A6C]"
            aria-label="Leave meeting"
          >
            <LogOut className="size-[18px]" />
            Leave
          </button>
        </div>

        <div className="flex items-center gap-2 pl-1">
          <div className="relative">
            <UserAvatar
              name={userName}
              avatarUrl={avatarUrl}
              avatarColor={avatarColor}
              size="lg"
              className="!size-[44px] sm:!size-[49px]"
            />
            <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-[#00A45C]" />
          </div>
          <ChevronDown className="hidden size-[18px] text-[#94A3B8] sm:block" aria-hidden />
        </div>
      </div>
    </div>
  );
}
