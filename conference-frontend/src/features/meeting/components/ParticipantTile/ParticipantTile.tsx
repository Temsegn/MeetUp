import React from 'react';
import { VideoPlayer } from '../../../../components/video/VideoPlayer';
import { useAudioLevel } from '../../../media/hooks/useAudioLevel';
import { MicOff, Hand, Users } from 'lucide-react';

interface ParticipantTileProps {
  stream: MediaStream | null;
  /** Separate remote mic stream — kept mounted when camera is off */
  audioStream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isScreen?: boolean;
  isHandRaised?: boolean;
  /** When set, renders a "+N more" overlay instead of video */
  overflowCount?: number;
  /** Called when the overflow tile is clicked */
  onOverflowClick?: () => void;
  isMuted?: boolean;
  isCameraOff?: boolean;
  /** Active speaker highlight */
  isSpeakingOverride?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  stream,
  audioStream,
  name,
  isLocal = false,
  isHandRaised = false,
  isScreen = false,
  overflowCount,
  onOverflowClick,
  isMuted,
  isCameraOff,
  isSpeakingOverride,
}) => {
  const levelStream = audioStream || stream;
  const isSpeakingRaw = useAudioLevel(levelStream);
  const isSpeaking = isSpeakingOverride ?? isSpeakingRaw;

  const hasVideo =
    !isCameraOff &&
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks()[0].enabled;

  const hasAudio =
    !isMuted &&
    ((audioStream && audioStream.getAudioTracks().length > 0) ||
      (stream && stream.getAudioTracks().length > 0));

  // Overflow "+N more" tile ──────────────────────────────────────────────────
  if (overflowCount) {
    return (
      <button
        onClick={onOverflowClick}
        data-meeting-tile
        data-participant-name={`+${overflowCount} more`}
        className="
          relative w-full h-full rounded-2xl overflow-hidden
          bg-slate-800/90 border-2 border-slate-700
          flex flex-col items-center justify-center gap-2
          hover:bg-slate-700/80 hover:border-slate-600
          transition-all duration-200 cursor-pointer group
        "
      >
        <div className="w-14 h-14 rounded-full bg-slate-600 group-hover:bg-slate-500 transition-colors flex items-center justify-center">
          <Users size={24} className="text-slate-200" />
        </div>
        <span className="text-white text-2xl font-bold leading-none">
          +{overflowCount}
        </span>
        <span className="text-slate-400 text-xs font-medium">
          more
        </span>
      </button>
    );
  }

  // Normal participant tile ──────────────────────────────────────────────────
  return (
    <div
      data-meeting-tile
      data-participant-name={name}
      data-meeting-local={isLocal ? '1' : undefined}
      data-meeting-screen={isScreen ? '1' : undefined}
      className={`
        relative w-full h-full rounded-2xl overflow-hidden bg-slate-800
        border-2 transition-all duration-300
        ${isSpeaking
          ? 'border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.35)]'
          : 'border-slate-700/60 hover:border-slate-600'
        }
      `}
    >
      {/* Remote audio must play even when video is replaced by avatar */}
      {!isLocal && audioStream && audioStream.getAudioTracks().length > 0 && (
        <audio
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== audioStream) el.srcObject = audioStream;
          }}
        />
      )}

      {/* Video or avatar */}
      {hasVideo ? (
        <VideoPlayer
          stream={stream}
          muted={isLocal}
          className={`w-full h-full ${isScreen ? 'object-contain bg-black' : 'object-cover'}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="w-[clamp(2rem,35%,5rem)] aspect-square rounded-full bg-slate-600 flex items-center justify-center text-[clamp(0.875rem,2vw,2rem)] font-semibold text-white shadow-lg select-none">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Bottom-left: name label (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs sm:text-sm font-medium truncate drop-shadow-sm max-w-[calc(100%-2rem)]">
            {name}
            {isLocal && <span className="text-slate-300 font-normal"> (You)</span>}
          </span>

          {/* Speaking indicator */}
          {isSpeaking && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}

          {/* Muted icon inline */}
          {!hasAudio && (
            <MicOff size={12} className="flex-shrink-0 text-red-400" />
          )}
        </div>
      </div>

      {/* Top-right: Muted badge (larger, more visible) */}
      {!hasAudio && (
        <div className="absolute top-2 right-2 bg-red-500/85 text-white p-1.5 rounded-full backdrop-blur-sm shadow-md">
          <MicOff size={13} />
        </div>
      )}

      {/* Top-left: Hand raised */}
      {isHandRaised && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white p-1.5 rounded-full backdrop-blur-sm shadow-md animate-bounce">
          <Hand size={13} />
        </div>
      )}
    </div>
  );
};
