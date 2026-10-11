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
  // Prefer real track state over stale isCameraOff flags. Remote tracks stay
  // muted until the first RTP packet — once unmuted, always show the video.
  const hasLiveVideo = Boolean(
    participant.stream &&
      participant.stream.getVideoTracks().some(
        (t) => t.readyState !== 'ended' && !t.muted,
      ),
  );
  const hasVideoTrack = Boolean(
    participant.stream &&
      participant.stream.getVideoTracks().some((t) => t.readyState !== 'ended'),
  );
  // Bind as soon as a track exists so the element is ready when RTP unmutes.
  const shouldBindVideo = hasVideoTrack && participant.isCameraOff !== true;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldBindVideo && participant.stream) {
      el.srcObject = participant.stream;
      const tryPlay = () => {
        void el.play().catch(() => {});
      };
      tryPlay();
      el.addEventListener('loadedmetadata', tryPlay);
      const onUnmute = () => tryPlay();
      participant.stream.getVideoTracks().forEach((t) => t.addEventListener('unmute', onUnmute));
      return () => {
        el.removeEventListener('loadedmetadata', tryPlay);
        participant.stream?.getVideoTracks().forEach((t) => t.removeEventListener('unmute', onUnmute));
      };
    }
    el.srcObject = null;
  }, [participant.stream, participant.isCameraOff, videoTrackId, shouldBindVideo]);

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

  // Keep the <video> mounted when a track is bound so unmute can paint.
  // Show avatar only when there is truly nothing to display yet.
  const showVideo = shouldBindVideo && (hasLiveVideo || hasVideoTrack);

  return (
    <div
      data-meeting-tile
      data-participant-name={participant.name}
      data-meeting-local={participant.isYou ? '1' : '0'}
      data-meeting-screen={isScreenShare ? '1' : '0'}
      className={cn(
        'relative overflow-hidden rounded-[22px] bg-[#F0F5FA]',
        participant.isSpeaking && 'shadow-[0_0_0_2px_white,0_0_0_4px_#076BEE]',
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
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E8EEF5] to-[#F0F5FA]">
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
        <div className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-[#076BEE] text-white">
          <span className="flex items-end gap-0.5">
            <span className="h-2 w-0.5 animate-pulse rounded-full bg-white" />
            <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-white [animation-delay:120ms]" />
            <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-white [animation-delay:240ms]" />
          </span>
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 inline-flex max-w-[80%] items-center gap-1.5 rounded-[13px] bg-[rgba(18,27,41,0.7)] px-2.5 py-1.5">
        {participant.isMuted ? <MicOff className="size-3.5 shrink-0 text-white/90" /> : null}
        {participant.isHandRaised ? <Hand className="size-3.5 shrink-0 text-amber-300" /> : null}
        <p className="truncate text-[12px] font-medium text-white sm:text-[13px]">
          {participant.labelOverride ?? (participant.isYou ? 'Me' : participant.name)}
        </p>
      </div>
    </div>
  );
}
