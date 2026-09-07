import { useCallback, useEffect, useRef, useState } from 'react';
import { connectDmSocket, DM_EVENTS, emitAck } from '../../../services/messages/dm-socket';

export type CallType = 'audio' | 'video';
export type CallPhase =
  | 'idle'
  | 'outgoing'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended';

type CallState = {
  phase: CallPhase;
  callId: string | null;
  callType: CallType;
  conversationId: string | null;
  peerUserId: string | null;
  peerName: string;
  muted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  sharingScreen: boolean;
  startedAt: number | null;
  error: string | null;
};

import { startRingtoneLoop, type RingController } from '../utils/ringtone';

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const initial: CallState = {
  phase: 'idle',
  callId: null,
  callType: 'audio',
  conversationId: null,
  peerUserId: null,
  peerName: '',
  muted: false,
  cameraOff: false,
  speakerOn: true,
  sharingScreen: false,
  startedAt: null,
  error: null,
};

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * 1:1 WebRTC calls signaled over the existing authenticated Socket.IO server.
 * Local media only — does not touch meeting mediasoup rooms.
 */
export function useChatCall(currentUserId?: string | null) {
  const [state, setState] = useState<CallState>(initial);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const ringAudioRef = useRef<RingController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stopRinging = useCallback(() => {
    ringAudioRef.current?.stop();
    ringAudioRef.current = null;
    if (ringTimerRef.current) {
      window.clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopRinging();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    remoteStreamRef.current = null;
  }, [stopRinging]);

  const bindRemote = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      void remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      void remoteAudioRef.current.play().catch(() => {});
    }
  }, []);

  const ensurePc = useCallback(
    (peerUserId: string, conversationId: string, callId: string) => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        const socket = connectDmSocket();
        socket?.emit(DM_EVENTS.CALL_SIGNAL, {
          conversationId,
          toUserId: peerUserId,
          callId,
          signalType: 'ice',
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        bindRemote(stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          // brief recovery window
          void pc.restartIce?.();
        }
        if (pc.connectionState === 'connected') {
          setState((s) => ({ ...s, phase: 'active', startedAt: s.startedAt ?? Date.now() }));
        }
      };

      return pc;
    },
    [bindRemote],
  );

  const getLocalMedia = useCallback(async (callType: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => {});
    }
    return stream;
  }, []);

  const hangup = useCallback(
    async (status: 'completed' | 'missed' | 'rejected' | 'cancelled' = 'completed') => {
      const s = stateRef.current;
      const durationSec =
        s.startedAt && status === 'completed'
          ? Math.max(1, Math.round((Date.now() - s.startedAt) / 1000))
          : undefined;
      if (s.peerUserId && s.conversationId && s.callId) {
        try {
          await emitAck(DM_EVENTS.CALL_HANGUP, {
            conversationId: s.conversationId,
            toUserId: s.peerUserId,
            callId: s.callId,
            callType: s.callType,
            status,
            durationSec,
          });
        } catch {
          /* ignore */
        }
      }
      cleanupMedia();
      setState({ ...initial });
    },
    [cleanupMedia],
  );

  const startCall = useCallback(
    async (opts: {
      conversationId: string;
      peerUserId: string;
      peerName: string;
      callType: CallType;
    }) => {
      const callId = uuid();
      setState({
        ...initial,
        phase: 'outgoing',
        callId,
        callType: opts.callType,
        conversationId: opts.conversationId,
        peerUserId: opts.peerUserId,
        peerName: opts.peerName,
      });

      try {
        const stream = await getLocalMedia(opts.callType);
        const pc = ensurePc(opts.peerUserId, opts.conversationId, callId);
        for (const track of stream.getTracks()) pc.addTrack(track, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await emitAck(DM_EVENTS.CALL_INVITE, {
          conversationId: opts.conversationId,
          toUserId: opts.peerUserId,
          callType: opts.callType,
          callId,
          sdp: offer,
        });

        // 5 rings then auto-miss if unanswered
        ringAudioRef.current?.stop();
        ringAudioRef.current = startRingtoneLoop(() => {
          void hangup('missed');
        });
      } catch (err) {
        cleanupMedia();
        setState({
          ...initial,
          error: err instanceof Error ? err.message : 'Could not start call',
        });
      }
    },
    [cleanupMedia, ensurePc, getLocalMedia, hangup],
  );

  const acceptCall = useCallback(async () => {
    const s = stateRef.current;
    if (!s.callId || !s.peerUserId || !s.conversationId) return;
    stopRinging();
    setState((prev) => ({ ...prev, phase: 'connecting' }));
    try {
      const stream = await getLocalMedia(s.callType);
      const pc = ensurePc(s.peerUserId, s.conversationId, s.callId);
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      await emitAck(DM_EVENTS.CALL_ACCEPT, {
        conversationId: s.conversationId,
        toUserId: s.peerUserId,
        callId: s.callId,
      });
      // Remote offer should already be set; if not, wait for signal
      if (!pc.remoteDescription) {
        /* offer applied in invite handler */
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await emitAck(DM_EVENTS.CALL_SIGNAL, {
        conversationId: s.conversationId,
        toUserId: s.peerUserId,
        callId: s.callId,
        signalType: 'sdp',
        sdp: answer,
      });
      setState((prev) => ({ ...prev, phase: 'active', startedAt: Date.now() }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Accept failed',
      }));
      void hangup('rejected');
    }
  }, [ensurePc, getLocalMedia, hangup, stopRinging]);

  const rejectCall = useCallback(() => {
    void hangup('rejected');
  }, [hangup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !stateRef.current.muted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setState((s) => ({ ...s, muted: next }));
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !stateRef.current.cameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setState((s) => ({ ...s, cameraOff: next }));
  }, []);

  const toggleSpeaker = useCallback(() => {
    setState((s) => {
      const speakerOn = !s.speakerOn;
      if (remoteAudioRef.current) remoteAudioRef.current.muted = !speakerOn;
      if (remoteVideoRef.current) remoteVideoRef.current.muted = !speakerOn;
      return { ...s, speakerOn };
    });
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const s = stateRef.current;
    if (!pc || !s.peerUserId) return;

    if (s.sharingScreen) {
      const cam = localStreamRef.current?.getVideoTracks()[0];
      const sender = pc.getSenders().find((x) => x.track?.kind === 'video');
      if (sender && cam) await sender.replaceTrack(cam);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setState((prev) => ({ ...prev, sharingScreen: false }));
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = display;
      const track = display.getVideoTracks()[0];
      const sender = pc.getSenders().find((x) => x.track?.kind === 'video');
      if (sender && track) await sender.replaceTrack(track);
      else if (track) pc.addTrack(track, display);
      track?.addEventListener('ended', () => {
        void toggleScreenShare();
      });
      setState((prev) => ({ ...prev, sharingScreen: true }));
    } catch {
      /* user cancelled */
    }
  }, []);

  useEffect(() => {
    const socket = connectDmSocket();
    if (!socket) return;

    const onInvite = async (payload: {
      conversationId: string;
      fromUserId: string;
      fromName: string;
      callId: string;
      callType: CallType;
      sdp?: RTCSessionDescriptionInit;
    }) => {
      if (payload.fromUserId === currentUserId) return;
      if (stateRef.current.phase !== 'idle') {
        socket.emit(DM_EVENTS.CALL_REJECT, {
          conversationId: payload.conversationId,
          toUserId: payload.fromUserId,
          callId: payload.callId,
          reason: 'busy',
        });
        return;
      }
      setState({
        ...initial,
        phase: 'ringing',
        callId: payload.callId,
        callType: payload.callType ?? 'audio',
        conversationId: payload.conversationId,
        peerUserId: payload.fromUserId,
        peerName: payload.fromName ?? 'Caller',
      });
      ringAudioRef.current?.stop();
      ringAudioRef.current = startRingtoneLoop(() => {
        void hangup('missed');
      });
      const pc = ensurePc(payload.fromUserId, payload.conversationId, payload.callId);
      if (payload.sdp) await pc.setRemoteDescription(payload.sdp);
    };

    const onAccept = async (payload: {
      callId: string;
      fromUserId: string;
      conversationId: string;
    }) => {
      if (payload.callId !== stateRef.current.callId) return;
      stopRinging();
      setState((s) => ({ ...s, phase: 'connecting' }));
    };

    const onSignal = async (payload: {
      callId: string;
      fromUserId: string;
      conversationId: string;
      signalType?: string;
      candidate?: RTCIceCandidateInit;
      sdp?: RTCSessionDescriptionInit;
    }) => {
      if (payload.callId !== stateRef.current.callId) return;
      const pc = ensurePc(payload.fromUserId, payload.conversationId, payload.callId);
      if (payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        if (payload.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit(DM_EVENTS.CALL_SIGNAL, {
            conversationId: payload.conversationId,
            toUserId: payload.fromUserId,
            callId: payload.callId,
            signalType: 'sdp',
            sdp: answer,
          });
        }
      }
      if (payload.candidate) {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* ignore */
        }
      }
    };

    const onHangup = (payload: { callId: string }) => {
      if (payload.callId !== stateRef.current.callId) return;
      cleanupMedia();
      setState({ ...initial });
    };

    const onReject = (payload: { callId: string }) => {
      if (payload.callId !== stateRef.current.callId) return;
      cleanupMedia();
      setState({ ...initial });
    };

    socket.on(DM_EVENTS.CALL_INVITE, onInvite);
    socket.on(DM_EVENTS.CALL_ACCEPT, onAccept);
    socket.on(DM_EVENTS.CALL_SIGNAL, onSignal);
    socket.on(DM_EVENTS.CALL_HANGUP, onHangup);
    socket.on(DM_EVENTS.CALL_REJECT, onReject);

    return () => {
      socket.off(DM_EVENTS.CALL_INVITE, onInvite);
      socket.off(DM_EVENTS.CALL_ACCEPT, onAccept);
      socket.off(DM_EVENTS.CALL_SIGNAL, onSignal);
      socket.off(DM_EVENTS.CALL_HANGUP, onHangup);
      socket.off(DM_EVENTS.CALL_REJECT, onReject);
    };
  }, [cleanupMedia, currentUserId, ensurePc, hangup, stopRinging]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  return {
    state,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare,
  };
}
