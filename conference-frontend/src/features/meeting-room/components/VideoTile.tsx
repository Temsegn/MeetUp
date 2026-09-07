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
};

type Props = {
  participant: LiveParticipant;
  isScreenShare?: boolean;
  className?: string;
};

export function VideoTile({ participant, isScreenShare = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (participant.stream && !participant.isCameraOff) {
      el.srcObject = participant.stream;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [participant.stream, participant.isCameraOff]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || participant.isYou) return;
    const audio = participant.audioStream || participant.stream;
    if (audio) {
      el.srcObject = audio;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [participant.audioStream, participant.stream, participant.isYou]);

  const showVideo = !!participant.stream && !participant.isCameraOff;

  return (
    <div
      data-meeting-tile
      data-participant-name={participant.name}
      data-meeting-local={participant.isYou ? '1' : '0'}
      data-meeting-screen={isScreenShare ? '1' : '0'}
      className={cn(
        'relative overflow-hidden rounded-xl border border-[#E8ECF1] bg-[#0F172A]',
        participant.isSpeaking && 'ring-2 ring-[#016BE6]',
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
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
          <UserAvatar
            name={participant.name}
            avatarUrl={participant.avatarUrl}
            avatarColor={participant.avatarColor}
            size="xl"
          />
        </div>
      )}
      {!participant.isYou ? <audio ref={audioRef} autoPlay playsInline /> : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <p className="truncate text-[12px] font-semibold text-white">
          {participant.name}
          {participant.isYou ? ' (You)' : ''}
        </p>
        <div className="flex items-center gap-1.5">
          {participant.isHandRaised ? <Hand className="size-3.5 text-amber-300" /> : null}
          {participant.isMuted ? <MicOff className="size-3.5 text-red-300" /> : null}
        </div>
      </div>
    </div>
  );
}
