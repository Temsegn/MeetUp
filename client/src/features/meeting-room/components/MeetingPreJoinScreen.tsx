import { useState } from 'react';
import { ArrowLeft, Check, Copy, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { VideoPlayer } from '../../../components/video/VideoPlayer';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { guestJoinUrl } from '../../../lib/frontendUrl';

type Props = {
  roomId: string;
  userName: string;
  onUserNameChange?: (name: string) => void;
  nameEditable?: boolean;
  requireName?: boolean;
  guestEmail?: string;
  onGuestEmailChange?: (email: string) => void;
  guestEmailLocked?: boolean;
  requireGuestEmail?: boolean;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  localStream: MediaStream | null;
  mediaError?: string | null;
  onRequestMedia?: () => void;
  isJoining?: boolean;
  isWaiting?: boolean;
  isHostJoining?: boolean;
  joinError?: string | null;
  onJoin: () => void;
  onCancelWaiting?: () => void;
  onBack: () => void;
  title?: string;
};

const fieldClass =
  'mt-1 h-10 w-full rounded-xl border border-[#E1E7EE] bg-white px-3 text-[16px] outline-none focus:border-[#016BE6] sm:h-10 sm:text-[13px]';

export function MeetingPreJoinScreen({
  roomId,
  userName,
  onUserNameChange,
  nameEditable = false,
  requireName = false,
  guestEmail = '',
  onGuestEmailChange,
  guestEmailLocked = false,
  requireGuestEmail = false,
  avatarUrl,
  avatarColor,
  localStream,
  mediaError = null,
  onRequestMedia,
  isJoining = false,
  isWaiting = false,
  isHostJoining = false,
  joinError = null,
  onJoin,
  onCancelWaiting,
  onBack,
  title,
}: Props) {
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleAudio = () => {
    if (!localStream) {
      onRequestMedia?.();
      return;
    }
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = audioMuted;
    });
    setAudioMuted((v) => !v);
  };

  const toggleVideo = () => {
    if (!localStream) {
      onRequestMedia?.();
      return;
    }
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = videoMuted;
    });
    setVideoMuted((v) => !v);
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(guestJoinUrl(roomId));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const emailOk =
    !requireGuestEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canJoin = (!requireName || userName.trim().length > 0) && emailOk;

  if (isWaiting) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-[#F7F9FC] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm rounded-2xl border border-[#E8ECF1] bg-white p-5 text-center shadow-sm">
          <UserAvatar
            name={userName || 'Guest'}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            size="xl"
            className="mx-auto size-14 text-[20px]"
          />
          <div className="mx-auto mt-3 h-1 w-20 overflow-hidden rounded-full bg-[#E8F1FF]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#016BE6]" />
          </div>
          <h1 className="mt-3 text-[17px] font-bold text-[#121B29]">Waiting for host</h1>
          <p className="mt-1.5 text-[13px] leading-snug text-[#667383]">
            Lobby as <span className="font-semibold text-[#121B29]">{userName}</span>
            {title ? ` · ${title}` : ''}
          </p>
          <button
            type="button"
            onClick={onCancelWaiting}
            className="mt-5 h-11 w-full rounded-xl border border-[#E0E7EE] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#016BE6] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <p className="truncate text-[12px] font-medium text-[#8A94A6]">Samtal</p>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-5 lg:max-w-4xl lg:flex-row lg:items-stretch lg:gap-6 lg:py-2">
        {/* Preview — constrained height so form fits one screen */}
        <div className="relative min-h-0 w-full shrink-0 overflow-hidden rounded-2xl border border-[#E8ECF1] bg-[#0F172A] shadow-sm lg:min-h-0 lg:flex-1">
          <div className="relative aspect-[16/10] max-h-[32svh] w-full sm:max-h-[38svh] lg:aspect-auto lg:h-full lg:max-h-none">
            {localStream && !videoMuted ? (
              <VideoPlayer stream={localStream} muted className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-2 px-4 lg:min-h-0">
                <UserAvatar
                  name={userName || 'Guest'}
                  avatarUrl={avatarUrl}
                  avatarColor={avatarColor}
                  size="xl"
                  className="size-14 text-[20px]"
                />
                <span className="text-center text-[11px] text-[#94A3B8]">
                  {localStream ? 'Camera is off' : 'Camera and mic off'}
                </span>
              </div>
            )}
            <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                className={`flex size-10 items-center justify-center rounded-full ${
                  audioMuted ? 'bg-[#DC2626] text-white' : 'bg-white/95 text-[#151D2B]'
                }`}
                aria-label={audioMuted ? 'Unmute' : 'Mute'}
              >
                {audioMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`flex size-10 items-center justify-center rounded-full ${
                  videoMuted ? 'bg-[#DC2626] text-white' : 'bg-white/95 text-[#151D2B]'
                }`}
                aria-label={videoMuted ? 'Start camera' : 'Stop camera'}
              >
                {videoMuted ? <VideoOff className="size-4" /> : <Video className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Join form — compact, one-screen */}
        <div className="flex min-h-0 w-full flex-1 flex-col justify-center overflow-y-auto overscroll-contain lg:max-w-sm lg:shrink-0 lg:overflow-visible">
          <div className="rounded-2xl border border-[#E8ECF1] bg-white p-3.5 shadow-sm sm:p-4">
            <h1 className="truncate text-[17px] font-bold tracking-tight text-[#151D2B] sm:text-[18px]">
              {title?.trim() || 'Ready to join?'}
            </h1>
            <p className="mt-0.5 text-[12px] text-[#8A94A6]">
              {isHostJoining
                ? 'You’re the host — join instantly.'
                : requireGuestEmail
                  ? 'Join with your invitation email.'
                  : 'Ask to join — host will admit you.'}
            </p>

            {nameEditable ? (
              <label className="mt-3 block text-[11px] font-semibold text-[#475569]">
                Your name
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => onUserNameChange?.(e.target.value)}
                  placeholder="Enter your name"
                  className={fieldClass}
                  autoFocus={requireName}
                  autoComplete="name"
                />
              </label>
            ) : (
              <p className="mt-2 text-[13px] text-[#6F7B8C]">
                Joining as <span className="font-semibold text-[#151D2B]">{userName}</span>
              </p>
            )}

            {requireGuestEmail ? (
              <label className="mt-2.5 block text-[11px] font-semibold text-[#475569]">
                Invitation email
                <input
                  type="email"
                  value={guestEmail}
                  readOnly={guestEmailLocked}
                  onChange={(e) => onGuestEmailChange?.(e.target.value)}
                  placeholder="you@example.com"
                  className={`${fieldClass} read-only:bg-[#F8FAFC] read-only:text-[#475569]`}
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
            ) : null}

            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] px-2.5 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#64748B]">
                {roomId}
              </span>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex size-8 items-center justify-center text-[#016BE6]"
                aria-label="Copy link"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            {(mediaError || joinError) ? (
              <div className="mt-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-2 text-[11px] leading-snug text-[#DC2626]">
                {joinError || mediaError}
              </div>
            ) : null}

            {!localStream ? (
              <button
                type="button"
                onClick={() => onRequestMedia?.()}
                className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-[#016BE6] bg-white text-[13px] font-semibold text-[#016BE6] hover:bg-[#F4F8FF]"
              >
                Allow camera & mic
              </button>
            ) : null}

            <button
              type="button"
              onClick={onJoin}
              disabled={isJoining || !canJoin}
              className={`flex h-11 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60 ${
                localStream ? 'mt-3' : 'mt-2'
              }`}
            >
              {isJoining
                ? 'Connecting…'
                : isHostJoining || (!nameEditable && userName.trim())
                  ? 'Join meeting'
                  : 'Ask to join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
