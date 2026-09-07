import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { useChatCall } from '../hooks/useChatCall';

type CallApi = ReturnType<typeof useChatCall>;

type Props = {
  call: CallApi;
};

export function CallOverlay({ call }: Props) {
  const { state } = call;
  if (state.phase === 'idle') return null;

  const isVideo = state.callType === 'video';
  const ringing = state.phase === 'ringing';
  const outgoing = state.phase === 'outgoing';
  const active = state.phase === 'active' || state.phase === 'connecting';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B1220]/92 p-4 backdrop-blur-sm">
      <audio ref={call.remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="relative flex h-full max-h-[720px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#111827] text-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-semibold">{state.peerName}</p>
            <p className="text-[12px] text-white/60">
              {ringing
                ? 'Incoming call…'
                : outgoing
                  ? 'Ringing…'
                  : state.phase === 'connecting'
                    ? 'Connecting…'
                    : isVideo
                      ? 'Video call'
                      : 'Voice call'}
            </p>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          {isVideo ? (
            <>
              <video
                ref={call.remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <video
                ref={call.localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  'absolute bottom-4 right-4 w-28 rounded-xl border border-white/20 object-cover shadow-lg sm:w-36',
                  state.cameraOff && 'opacity-40',
                )}
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="flex size-24 items-center justify-center rounded-full bg-[#016BE6]/20 text-[#7EB6FF]">
                <Phone className="size-10" />
              </div>
              <p className="text-[14px] text-white/70">{state.peerName}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 px-4 py-5">
          {ringing ? (
            <>
              <button
                type="button"
                onClick={() => void call.acceptCall()}
                className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white"
                aria-label="Accept"
              >
                <Phone className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => call.rejectCall()}
                className="inline-flex size-14 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="Reject"
              >
                <PhoneOff className="size-6" />
              </button>
            </>
          ) : (
            <>
              {active || outgoing ? (
                <>
                  <button
                    type="button"
                    onClick={call.toggleMute}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-white/10"
                    aria-label="Mute"
                  >
                    {state.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                  </button>
                  {isVideo ? (
                    <button
                      type="button"
                      onClick={call.toggleCamera}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-white/10"
                      aria-label="Camera"
                    >
                      {state.cameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={call.toggleSpeaker}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-white/10"
                    aria-label="Speaker"
                  >
                    {state.speakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                  </button>
                  {isVideo ? (
                    <button
                      type="button"
                      onClick={() => void call.toggleScreenShare()}
                      className={cn(
                        'inline-flex size-11 items-center justify-center rounded-full',
                        state.sharingScreen ? 'bg-[#016BE6]' : 'bg-white/10',
                      )}
                      aria-label="Share screen"
                    >
                      <MonitorUp className="size-5" />
                    </button>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  void call.hangup(outgoing ? 'cancelled' : 'completed')
                }
                className="inline-flex size-14 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="Hang up"
              >
                <PhoneOff className="size-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
