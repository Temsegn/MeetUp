import React, { useEffect, useState } from 'react';
import { VideoPlayer } from '../../../../components/video/VideoPlayer';
import { Mic, MicOff, Video, VideoOff, ArrowLeft, Copy, Check } from 'lucide-react';

interface PreJoinScreenProps {
  localStream: MediaStream | null;
  onJoin: () => void;
  onRequestMedia: () => void;
  roomId: string;
  userName?: string;
  isJoining?: boolean;
  joinError?: string | null;
  onBack?: () => void;
}

export const PreJoinScreen: React.FC<PreJoinScreenProps> = ({
  localStream,
  onJoin,
  onRequestMedia: _onRequestMedia,
  roomId,
  userName = 'Guest',
  isJoining = false,
  joinError = null,
  onBack,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().catch(console.error);
  }, []);

  const toggleAudio = () => {
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = isAudioMuted);
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = isVideoMuted);
    setIsVideoMuted(!isVideoMuted);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen min-h-svh bg-slate-950 text-white flex flex-col">
      {/* Header */}
      {onBack && (
        <header className="px-4 py-3 flex items-center border-b border-slate-800">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </header>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 sm:p-8 gap-6 lg:gap-12">
        {/* Video preview */}
        <div className="w-full max-w-lg lg:max-w-xl flex flex-col gap-4">
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {localStream && !isVideoMuted ? (
              <VideoPlayer stream={localStream} muted={true} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-3">
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-500 text-sm">Camera is off</span>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleAudio}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isAudioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700/80 hover:bg-slate-600/80 backdrop-blur-sm'}`}
                aria-label={isAudioMuted ? 'Unmute' : 'Mute'}
              >
                {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700/80 hover:bg-slate-600/80 backdrop-blur-sm'}`}
                aria-label={isVideoMuted ? 'Start camera' : 'Stop camera'}
              >
                {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Join panel */}
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
          <h1 className="text-2xl sm:text-3xl font-semibold">Ready to join?</h1>
          <p className="text-slate-400 text-sm">
            Joining as <span className="text-white font-medium">{userName}</span>
          </p>

          {/* Room link */}
          <div className="w-full flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
            <span className="flex-1 text-xs font-mono text-slate-400 truncate text-left">{roomId}</span>
            <button onClick={copyLink} className="text-slate-400 hover:text-white transition flex-shrink-0" title="Copy meeting link">
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>

          {joinError && (
            <div className="w-full text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {joinError}
            </div>
          )}

          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-base font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5"
          >
            {isJoining ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : 'Join now'}
          </button>
        </div>
      </div>
    </div>
  );
};
