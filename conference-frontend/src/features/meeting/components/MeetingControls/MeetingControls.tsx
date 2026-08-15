import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, Users, Smile, Hand, Wifi, Circle } from 'lucide-react';
import { IconButton } from '../../../../components/ui/IconButton';

const REACTIONS = ['👍', '👏', '❤️', '🎉', '😂', '😮', '🔥', '🙌'];

interface MeetingControlsProps {
  roomId: string;
  peerId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSharingScreen: boolean;
  isSomeoneElseSharing?: boolean;
  isRecording?: boolean;
  isRecordingBusy?: boolean;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onShareScreen: () => void;
  onStopScreenShare: () => void;
  onToggleRecording?: () => void;
  onSendReaction?: (reaction: string) => void;
  isHandRaised?: boolean;
  onToggleRaiseHand?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  onLeave?: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  roomId,
  isMuted = false,
  isCameraOff = false,
  isSharingScreen,
  isSomeoneElseSharing,
  isRecording = false,
  isRecordingBusy = false,
  onToggleMute,
  onToggleCamera,
  onShareScreen,
  onStopScreenShare,
  onToggleRecording,
  onSendReaction,
  isHandRaised,
  onToggleRaiseHand,
  onToggleChat,
  onToggleParticipants,
  onLeave,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    if (showReactionPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showReactionPicker]);

  const handleReaction = (emoji: string) => {
    onSendReaction?.(emoji);
    setShowReactionPicker(false);
  };

  return (
    <div className="flex-shrink-0 h-[72px] bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 flex items-center justify-between px-2 sm:px-6 z-40">
      <div className="hidden lg:flex flex-col text-slate-300 w-1/4">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">Meeting</span>
          <span className="border-l border-slate-700 h-4"></span>
          <span className="font-mono text-xs text-slate-400 truncate max-w-[140px]">{roomId}</span>
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 text-xs ${isRecording ? 'text-red-400' : 'text-green-400'}`}>
          <Wifi size={10} />
          <span>{isRecording ? 'Recording' : 'Connected'}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-1">
        <IconButton
          onClick={() => onToggleMute?.()}
          variant={isMuted ? 'danger' : 'secondary'}
          icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          label={isMuted ? 'Unmute' : 'Mute'}
        />
        <IconButton
          onClick={() => onToggleCamera?.()}
          variant={isCameraOff ? 'danger' : 'secondary'}
          icon={isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
          label={isCameraOff ? 'Start camera' : 'Stop camera'}
        />
        <div className="hidden sm:block">
          <IconButton
            onClick={isSharingScreen ? onStopScreenShare : onShareScreen}
            variant={isSharingScreen ? 'danger' : 'secondary'}
            icon={<MonitorUp size={18} />}
            label={isSharingScreen ? 'Stop presenting' : isSomeoneElseSharing ? 'Someone else is presenting' : 'Present'}
            disabled={!isSharingScreen && isSomeoneElseSharing}
            className={(!isSharingScreen && isSomeoneElseSharing) ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </div>
        {onToggleRecording && (
          <IconButton
            onClick={onToggleRecording}
            variant={isRecording ? 'danger' : 'secondary'}
            icon={<Circle size={16} fill={isRecording ? 'currentColor' : 'none'} />}
            label={
              isRecordingBusy
                ? 'Please wait…'
                : isRecording
                  ? 'Stop & save MP4'
                  : 'Record meeting + chat'
            }
            disabled={isRecordingBusy}
            className={isRecordingBusy ? 'opacity-50 cursor-not-allowed' : ''}
          />
        )}
        {onToggleRaiseHand && (
          <IconButton
            onClick={onToggleRaiseHand}
            variant={isHandRaised ? 'primary' : 'secondary'}
            icon={<Hand size={18} />}
            label={isHandRaised ? 'Lower hand' : 'Raise hand'}
          />
        )}

        {onSendReaction && (
          <div className="relative" ref={pickerRef}>
            <IconButton
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              variant={showReactionPicker ? 'primary' : 'secondary'}
              icon={<Smile size={18} />}
              label="Reactions"
            />
            {showReactionPicker && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-2xl px-2 py-2 flex gap-1 shadow-2xl animate-[slideUp_150ms_ease-out]">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center text-xl sm:text-2xl transition-all hover:scale-110 active:scale-95"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLeave ?? (() => { window.location.href = '/'; })}
          className="ml-1 sm:ml-3 h-10 sm:h-12 px-3 sm:px-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors text-sm font-medium"
          aria-label="Leave call"
        >
          Leave
        </button>
      </div>

      <div className="flex items-center justify-end gap-1.5 w-auto lg:w-1/4">
        {onToggleChat && (
          <IconButton onClick={onToggleChat} variant="secondary" icon={<MessageSquare size={18} />} label="Chat" />
        )}
        {onToggleParticipants && (
          <IconButton onClick={onToggleParticipants} variant="secondary" icon={<Users size={18} />} label="People" />
        )}
      </div>
    </div>
  );
};
