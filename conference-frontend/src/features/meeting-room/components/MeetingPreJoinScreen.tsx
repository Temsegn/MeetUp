import { useState } from 'react';
import { ArrowLeft, Check, Copy, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { VideoPlayer } from '../../../components/video/VideoPlayer';
import { UserAvatar } from '../../../components/ui/UserAvatar';

type Props = {
  roomId: string;
  userName: string;
  onUserNameChange?: (name: string) => void;
  nameEditable?: boolean;
  requireName?: boolean;
  guestEmail?: string;
  onGuestEmailChange?: (email: string) => void;
  requireGuestEmail?: boolean;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  localStream: MediaStream | null;
  isJoining?: boolean;
  isWaiting?: boolean;
  isHostJoining?: boolean;
  joinError?: string | null;
  onJoin: () => void;
  onCancelWaiting?: () => void;
  onBack: () => void;
  title?: string;
};

export function MeetingPreJoinScreen({
  roomId,
  userName,
  onUserNameChange,
  nameEditable = false,
  requireName = false,
  guestEmail = '',
  onGuestEmailChange,
  requireGuestEmail = false,
  avatarUrl,
  avatarColor,
  localStream,
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
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = audioMuted; });
    setAudioMuted((v) => !v);
  };

  const toggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach((t) => { t.enabled = videoMuted; });
    setVideoMuted((v) => !v);
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const emailOk =
    !requireGuestEmail ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canJoin = (!requireName || userName.trim().length > 0) && emailOk;

  if (isWaiting) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 size-10 animate-pulse rounded-full bg-[#E8F1FF]" />
          <h1 className="text-[18px] font-bold text-[#151D2B]">Waiting for host</h1>
          <p className="mt-2 text-[13px] text-[#6F7B8C]">
            You’re in the lobby as <span className="font-semibold text-[#151D2B]">{userName}</span>.
            The host must let you in before you can join.
          </p>
          <button
            type="button"
            onClick={onCancelWaiting}
            className="mt-5 h-10 rounded-xl border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8FAFC]">
      <header className="flex items-center border-b border-[#E8ECF1] bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#016BE6] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 lg:flex-row lg:gap-10">
        <div className="w-full max-w-xl">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#E8ECF1] bg-[#0F172A] shadow-sm">
            {localStream && !videoMuted ? (
              <VideoPlayer stream={localStream} muted className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <UserAvatar
                  name={userName || 'Guest'}
                  avatarUrl={avatarUrl}
                  avatarColor={avatarColor}
                  size="xl"
                  className="size-20 text-[28px]"
                />
                <span className="text-[12px] text-[#94A3B8]">Camera is off</span>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                className={`flex size-11 items-center justify-center rounded-full ${
                  audioMuted ? 'bg-[#DC2626] text-white' : 'bg-white/90 text-[#151D2B]'
                }`}
                aria-label={audioMuted ? 'Unmute' : 'Mute'}
              >
                {audioMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`flex size-11 items-center justify-center rounded-full ${
                  videoMuted ? 'bg-[#DC2626] text-white' : 'bg-white/90 text-[#151D2B]'
                }`}
                aria-label={videoMuted ? 'Start camera' : 'Stop camera'}
              >
                {videoMuted ? <VideoOff className="size-4" /> : <Video className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#016BE6]">Samtal meeting</p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#151D2B]">
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
                className="mt-1 h-10 w-full rounded-xl border border-[#E1E7EE] px-3 text-[13px] outline-none focus:border-[#016BE6]"
                autoFocus={requireName}
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
                onChange={(e) => onGuestEmailChange?.(e.target.value)}
                placeholder="Email you were invited with"
                className="mt-1 h-10 w-full rounded-xl border border-[#E1E7EE] px-3 text-[13px] outline-none focus:border-[#016BE6]"
              />
            </label>
          ) : null}

          <p className="mt-2 text-[11px] text-[#8A94A6]">
            {isHostJoining
              ? 'You’re the host — you’ll join the meeting immediately.'
              : requireGuestEmail
                ? 'Guests can join only with an invitation email from the host.'
                : 'You’ll wait in the lobby until the host admits you.'}
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#64748B]">{roomId}</span>
            <button type="button" onClick={copyLink} className="text-[#016BE6]" aria-label="Copy link">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>

          {joinError ? (
            <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#DC2626]">
              {joinError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onJoin}
            disabled={isJoining || !canJoin}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
          >
            {isJoining ? 'Connecting…' : isHostJoining ? 'Join' : 'Ask to join'}
          </button>
        </div>
      </div>
    </div>
  );
}
