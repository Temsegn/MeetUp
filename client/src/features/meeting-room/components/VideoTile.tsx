import { useEffect, useRef } from 'react';
import { MicOff, Hand } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export type LiveParticipant = {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioStream?: MediaStream | null;
  isYou?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isHandRaised?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  isScreenShare?: boolean;
  /** Override bottom name chip (e.g. "Me" / controlled name). */
  labelOverride?: string | null;
};

type Props = {
  participant: LiveParticipant;
  isScreenShare?: boolean;
  className?: string;
};

export function VideoTile({ participant, isScreenShare = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrackId =
    participant.stream?.getVideoTracks().map((t) => t.id).join(',') ?? '';
  // Remote tracks stay muted until the first RTP packet. Only treat video as
  // "live" once unmuted — otherwise we mount an empty <video> (blank grey tile).
  const hasLiveVideo = Boolean(
    participant.stream &&
      participant.isCameraOff !== true &&
      participant.stream.getVideoTracks().some(
        (t) => t.readyState !== 'ended' && !t.muted,
      ),
  );
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (hasLiveVideo && participant.stream) {
      el.srcObject = participant.stream;
      const tryPlay = () => {
        void el.play().catch(() => {});
      };
      tryPlay();
      el.addEventListener('loadedmetadata', tryPlay);
      return () => el.removeEventListener('loadedmetadata', tryPlay);
    }
    el.srcObject = null;
  }, [participant.stream, participant.isCameraOff, videoTrackId, hasLiveVideo]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || participant.isYou) return;
    const audio = participant.audioStream || participant.stream;
    if (audio && audio.getAudioTracks().some((t) => t.readyState !== 'ended')) {
      el.srcObject = audio;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [participant.audioStream, participant.stream, participant.isYou]);

  const showVideo = hasLiveVideo;

  return (
    <div
      data-meeting-tile
      data-participant-name={participant.name}
      data-meeting-local={participant.isYou ? '1' : '0'}
      data-meeting-screen={isScreenShare ? '1' : '0'}
      className={cn(
        'relative min-h-0 overflow-hidden rounded-2xl bg-[#E8EEF5] sm:rounded-[22px]',
        participant.isSpeaking && 'ring-2 ring-[#076BEE] ring-offset-2 ring-offset-[#EEF2F7]',
        className,
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          muted={participant.isYou}
          playsInline
          autoPlay
          className={cn('h-full w-full', isScreenShare ? 'object-contain bg-black' : 'object-cover')}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E2E8F0] to-[#F1F5F9]">
          <UserAvatar
            name={participant.name}
            avatarUrl={participant.avatarUrl}
            avatarColor={participant.avatarColor}
            size="xl"
          />
        </div>
      )}
      {!participant.isYou ? <audio ref={audioRef} autoPlay playsInline /> : null}
      {participant.isSpeaking ? (
        <div className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-[#076BEE] text-white sm:right-3 sm:top-3 sm:size-10">
          <span className="flex items-end gap-0.5">
            <span className="h-2 w-0.5 animate-pulse rounded-full bg-white" />
            <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-white [animation-delay:120ms]" />
            <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-white [animation-delay:240ms]" />
          </span>
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 inline-flex max-w-[85%] items-center gap-1.5 rounded-xl bg-[rgba(18,27,41,0.72)] px-2 py-1 backdrop-blur-sm sm:bottom-3 sm:left-3 sm:rounded-[13px] sm:px-2.5 sm:py-1.5">
        {participant.isMuted ? <MicOff className="size-3 shrink-0 text-white/90 sm:size-3.5" /> : null}
        {participant.isHandRaised ? <Hand className="size-3 shrink-0 text-amber-300 sm:size-3.5" /> : null}
        <p className="truncate text-[11px] font-medium text-white sm:text-[13px]">
          {participant.labelOverride ?? (participant.isYou ? 'Me' : participant.name)}
        </p>
      </div>
    </div>
  );
}
