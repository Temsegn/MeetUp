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
  'mt-1 h-11 w-full rounded-xl border border-[#E1E7EE] px-3 text-[16px] outline-none focus:border-[#016BE6] sm:h-10 sm:text-[13px]';

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
    !requireGuestEmail ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canJoin = (!requireName || userName.trim().length > 0) && emailOk;

  if (isWaiting) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-white px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md rounded-[22px] border border-[#E0E7EE] bg-white p-5 text-center shadow-[0_1px_2px_rgba(55,72,99,0.06)] sm:p-6">
          <UserAvatar
            name={userName || 'Guest'}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            size="xl"
            className="mx-auto size-16 text-[22px] sm:size-20 sm:text-[28px]"
          />
          <div className="mx-auto mt-4 h-1.5 w-24 overflow-hidden rounded-full bg-[#E8F1FF]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#016BE6]" />
          </div>
          <h1 className="mt-4 text-[20px] font-bold text-[#121B29] sm:text-[18px]">Waiting for host</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#667383] sm:text-[13px]">
            You’re in the lobby as <span className="font-semibold text-[#121B29]">{userName}</span>.
            The host must let you in before you can join.
          </p>
          {title ? <p className="mt-3 text-[15px] font-semibold text-[#121B29] sm:text-[14px]">{title}</p> : null}
          <button
            type="button"
            onClick={onCancelWaiting}
            className="mt-6 h-12 w-full rounded-[18px] border border-[#E0E7EE] text-[14px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:h-11 sm:text-[12px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8FAFC]">
      <header className="flex shrink-0 items-center border-b border-[#E8ECF1] bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-[#016BE6] hover:underline sm:min-h-0 sm:text-[13px]"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-stretch gap-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 sm:p-4 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
          <div className="w-full min-w-0 lg:max-w-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#E8ECF1] bg-[#0F172A] shadow-sm sm:aspect-video">
              {localStream && !videoMuted ? (
                <VideoPlayer stream={localStream} muted className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4">
                  <UserAvatar
                    name={userName || 'Guest'}
                    avatarUrl={avatarUrl}
                    avatarColor={avatarColor}
                    size="xl"
                    className="size-16 text-[22px] sm:size-20 sm:text-[28px]"
                  />
                  <span className="text-center text-[12px] text-[#94A3B8]">
                    {localStream ? 'Camera is off' : 'Camera and microphone are off'}
                  </span>
                  {!localStream ? (
                    <button
                      type="button"
                      onClick={() => onRequestMedia?.()}
                      className="min-h-11 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] sm:text-[12px]"
                    >
                      Allow camera and microphone
                    </button>
                  ) : null}
                </div>
              )}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-4">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`flex size-12 items-center justify-center rounded-full sm:size-11 ${
                    audioMuted ? 'bg-[#DC2626] text-white' : 'bg-white/90 text-[#151D2B]'
                  }`}
                  aria-label={audioMuted ? 'Unmute' : 'Mute'}
                >
                  {audioMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`flex size-12 items-center justify-center rounded-full sm:size-11 ${
                    videoMuted ? 'bg-[#DC2626] text-white' : 'bg-white/90 text-[#151D2B]'
                  }`}
                  aria-label={videoMuted ? 'Start camera' : 'Stop camera'}
                >
                  {videoMuted ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:max-w-sm sm:p-5 lg:shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#016BE6]">Samtal meeting</p>
            <h1 className="mt-1 text-[20px] font-bold tracking-tight text-[#151D2B] sm:text-[22px]">
              {title?.trim() || 'Ready to join?'}
            </h1>

            {nameEditable ? (
              <label className="mt-3 block text-[12px] font-semibold text-[#475569]">
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
              <label className="mt-3 block text-[12px] font-semibold text-[#475569]">
                Invitation email
                <input
                  type="email"
                  value={guestEmail}
                  readOnly={guestEmailLocked}
                  onChange={(e) => onGuestEmailChange?.(e.target.value)}
                  placeholder="Email you were invited with"
                  className={`${fieldClass} read-only:bg-[#F8FAFC] read-only:text-[#475569]`}
                  autoComplete="email"
                  inputMode="email"
                />
                {guestEmailLocked ? (
                  <span className="mt-1 block text-[11px] font-normal text-[#8A94A6]">
                    This email was invited by the host. Enter your name above to join.
                  </span>
                ) : null}
              </label>
            ) : null}

            <p className="mt-2 text-[12px] text-[#8A94A6] sm:text-[11px]">
              {isHostJoining
                ? 'You’re the host — you’ll join the meeting immediately.'
                : requireGuestEmail
                  ? 'Guests can join only with an invitation email from the host.'
                  : 'You’ll wait in the lobby until the host admits you.'}
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#64748B]">{roomId}</span>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex size-9 items-center justify-center text-[#016BE6]"
                aria-label="Copy link"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            {(mediaError || joinError) ? (
              <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] leading-relaxed text-[#DC2626]">
                {joinError || mediaError}
              </div>
            ) : null}

            {!localStream ? (
              <button
                type="button"
                onClick={() => onRequestMedia?.()}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-[#016BE6] bg-white text-[14px] font-semibold text-[#016BE6] hover:bg-[#F4F8FF] sm:h-11 sm:text-[13px]"
              >
                Allow camera and microphone
              </button>
            ) : null}

            <button
              type="button"
              onClick={onJoin}
              disabled={isJoining || !canJoin}
              className={`flex h-12 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[14px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60 sm:h-11 sm:text-[13px] ${
                localStream ? 'mt-4' : 'mt-2'
              }`}
            >
              {isJoining ? 'Connecting…' : isHostJoining ? 'Join' : 'Ask to join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
