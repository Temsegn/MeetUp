import { useState, useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { createSocketClient } from '../../../services/socket/socket-client';
import { MediaSession } from '../../media/mediasoup/media-session';

export interface PeerStreams {
  camera: MediaStream;
  screen: MediaStream;
  /** Always holds remote mic audio for reliable playback even when camera is off */
  audio: MediaStream;
}

export interface PeerInfo {
  id: string;
  name: string;
  userId: string;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

const JOIN_TIMEOUT_MS = 10_000;

function emptyPeerStreams(): PeerStreams {
  return {
    camera: new MediaStream(),
    screen: new MediaStream(),
    audio: new MediaStream(),
  };
}

export const useMeeting = (
  roomId: string,
  token: string,
  _userName: string,
  _userId: string | undefined,
  addToast?: (msg: string) => void,
) => {
  const [joined,        setJoined]        = useState(false);
  const [participantId, setParticipantId] = useState<string>('');
  const [creatorId,     setCreatorId]     = useState<string | null>(null);
  const [peers,         setPeers]         = useState<PeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams]  = useState<Map<string, PeerStreams>>(new Map());
  const [isRecording,   setIsRecording]   = useState(false);

  const socketRef  = useRef<Socket | null>(null);
  const sessionRef = useRef<MediaSession | null>(null);
  const joiningRef = useRef(false);
  const participantIdRef = useRef('');
  const creatorIdRef = useRef<string | null>(null);

  const leaveMeeting = useCallback(async () => {
    const session = sessionRef.current;
    if (session) {
      await session.cleanup();
      sessionRef.current = null;
    }
    socketRef.current = null;
    setJoined(false);
    setPeers([]);
    setRemoteStreams(new Map());
    setParticipantId('');
    setIsRecording(false);
    participantIdRef.current = '';
    creatorIdRef.current = null;
    joiningRef.current = false;
  }, []);

  const joinMeeting = useCallback(async () => {
    if (joiningRef.current) return;
    joiningRef.current = true;

    try {
      // Tear down any previous session before creating a new socket
      if (sessionRef.current) {
        try {
          await sessionRef.current.cleanup();
        } catch { /* ignore */ }
        sessionRef.current = null;
      }

      const socket = createSocketClient(token);
      socketRef.current = socket;

      await new Promise<void>((resolve, reject) => {
        if (socket.connected) { resolve(); return; }
        const t = setTimeout(
          () => reject(new Error('Connection timeout — is the backend running?')),
          JOIN_TIMEOUT_MS,
        );
        socket.once('connect', () => { clearTimeout(t); resolve(); });
        socket.once('connect_error', (e) => {
          clearTimeout(t);
          reject(new Error(`Connection failed: ${e.message}`));
        });
      });

      const joinRes = await new Promise<{
        participantId: string;
        rtpCapabilities: unknown;
        creatorId: string | null;
        simulcastEncodings?: object[];
        screenShareEncodings?: object[];
      }>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('join-room timed out')), JOIN_TIMEOUT_MS);
        socket.emit('join-room', { roomId }, (res: any) => {
          clearTimeout(t);
          if (res?.error) return reject(new Error(res.error));
          resolve(res);
        });
      });

      const pid = joinRes.participantId;
      participantIdRef.current = pid;
      creatorIdRef.current = joinRes.creatorId;
      setParticipantId(pid);
      setCreatorId(joinRes.creatorId);

      const session = new MediaSession(socket, roomId, pid);
      session.setEncodingConfig({
        simulcastEncodings: joinRes.simulcastEncodings,
        screenShareEncodings: joinRes.screenShareEncodings,
      });
      sessionRef.current = session;

      await session.initialize(joinRes.rtpCapabilities);
      await session.createSendTransport();
      await session.createRecvTransport();

      // Attach media listeners BEFORE get-room-state to avoid missing new-producer
      _attachMediaListeners(socket, session, addToast, setPeers, setRemoteStreams, setIsRecording);

      await new Promise<void>((resolve) => {
        socket.emit('get-room-state', { roomId }, async (res: any) => {
          if (!res?.error && res?.peers) {
            const existingPeers: PeerInfo[] = res.peers
              .filter((p: any) => p.id !== pid)
              .map((p: any) => ({
                id:     p.id,
                name:   p.name,
                userId: p.userId,
                isHost: p.userId === joinRes.creatorId,
              }));
            setPeers(existingPeers);

            for (const prod of (res.producers ?? [])) {
              if (prod.participantId === pid) continue;
              try {
                const consumer = await session.consume(prod.producerId);
                const source = prod.appData?.source ?? (prod.kind === 'audio' ? 'microphone' : 'camera');
                _addTrackToStream(prod.participantId, source, consumer.track, setRemoteStreams);
              } catch (e) {
                console.error('Failed to consume existing producer', e);
              }
            }
          }
          resolve();
        });
      });

      socket.emit('get-recording-status', { roomId }, (res: any) => {
        if (res && !res.error) setIsRecording(!!res.recording);
      });

      // Safe reconnect: full clean rejoin (socket disconnect already cleaned server peer)
      socket.io.off('reconnect');
      socket.io.on('reconnect', async () => {
        addToast?.('Reconnected — rejoining meeting...');
        try {
          await leaveMeeting();
          await joinMeeting();
        } catch {
          addToast?.('Failed to rejoin — please refresh.');
        }
      });

      setJoined(true);
    } finally {
      joiningRef.current = false;
    }
  }, [roomId, token, addToast, leaveMeeting]);

  // Cleanup listeners when leaving
  useEffect(() => {
    if (!joined) return;
    return () => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.off('new-producer');
      socket.off('peer-joined');
      socket.off('peer-left');
      socket.off('producer-closed');
      socket.off('consumer-closed');
      socket.off('producer-paused');
      socket.off('producer-resumed');
      socket.off('transport-failed');
      socket.off('worker-died');
      socket.off('recording-started');
      socket.off('recording-stopped');
    };
  }, [joined]);

  const startRecording = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess) return;
    const res = await sess.startRecording();
    if (res.error) {
      addToast?.(res.error);
      return;
    }
    setIsRecording(true);
    addToast?.('Recording started');
  }, [addToast]);

  const stopRecording = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess) return;
    const res = await sess.stopRecording();
    if (res.error) {
      addToast?.(res.error);
      return;
    }
    setIsRecording(false);
    addToast?.('Recording stopped');
  }, [addToast]);

  return {
    joined,
    participantId,
    joinMeeting,
    leaveMeeting,
    session: sessionRef,
    peers,
    remoteStreams,
    creatorId,
    isRecording,
    startRecording,
    stopRecording,
  };
};

// ── Listeners (attached before room-state fetch) ───────────────────────────

function _attachMediaListeners(
  socket: Socket,
  session: MediaSession,
  addToast: ((msg: string) => void) | undefined,
  setPeers: React.Dispatch<React.SetStateAction<PeerInfo[]>>,
  setRemoteStreams: React.Dispatch<React.SetStateAction<Map<string, PeerStreams>>>,
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
) {
  // Avoid duplicate handlers if join is retried
  socket.off('new-producer');
  socket.off('peer-joined');
  socket.off('peer-left');
  socket.off('producer-closed');
  socket.off('consumer-closed');
  socket.off('producer-paused');
  socket.off('producer-resumed');
  socket.off('transport-failed');
  socket.off('worker-died');
  socket.off('recording-started');
  socket.off('recording-stopped');

  socket.on('new-producer', async ({ producerId, participantId: remotePid, kind, appData }: any) => {
    try {
      const consumer = await session.consume(producerId);
      const source = appData?.source ?? (kind === 'audio' ? 'microphone' : 'camera');
      _addTrackToStream(remotePid, source, consumer.track, setRemoteStreams);
    } catch (e) {
      console.error('Failed to consume new producer', e);
    }
  });

  socket.on('peer-joined', ({ participantId: newPid, name, userId: newUserId }: any) => {
    setPeers((prev) => {
      if (prev.some((p) => p.id === newPid)) return prev;
      addToast?.(`${name} joined`);
      return [...prev, { id: newPid, name, userId: newUserId }];
    });
  });

  socket.on('peer-left', ({ participantId: leftPid }: any) => {
    setPeers((prev) => {
      const peer = prev.find((p) => p.id === leftPid);
      if (peer) addToast?.(`${peer.name} left`);
      return prev.filter((p) => p.id !== leftPid);
    });
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      const streams = next.get(leftPid);
      if (streams) {
        streams.camera.getTracks().forEach((t) => t.stop());
        streams.screen.getTracks().forEach((t) => t.stop());
        streams.audio.getTracks().forEach((t) => t.stop());
      }
      next.delete(leftPid);
      return next;
    });
  });

  socket.on('producer-closed', ({ participantId: closedPid, producerId, source, kind }: any) => {
    const resolvedSource =
      source ??
      (session.getConsumerByProducerId(producerId)?.kind === 'audio'
        ? 'microphone'
        : kind === 'audio'
          ? 'microphone'
          : 'camera');

    const consumer = session.getConsumerByProducerId(producerId);
    if (consumer) session.closeConsumerById(consumer.id);

    setRemoteStreams((prev) => {
      const next = new Map(prev);
      const streams = next.get(closedPid);
      if (!streams) return prev;

      const streamKey: keyof PeerStreams =
        resolvedSource === 'screen' ? 'screen'
          : resolvedSource === 'microphone' ? 'audio'
            : 'camera';

      const old = streams[streamKey];
      const trackIdsToRemove = new Set(
        consumer ? [consumer.track.id] : [],
      );

      // Rebuild stream without closed tracks
      const rebuilt = new MediaStream(
        old.getTracks().filter((t) => {
          if (trackIdsToRemove.size === 0) {
            // Fallback: drop video tracks for camera, all for screen/audio
            if (streamKey === 'camera') return t.kind !== 'video';
            return false;
          }
          if (trackIdsToRemove.has(t.id)) {
            t.stop();
            return false;
          }
          return true;
        }),
      );

      next.set(closedPid, { ...streams, [streamKey]: rebuilt });
      return next;
    });
  });

  socket.on('consumer-closed', ({ consumerId }: any) => {
    session.closeConsumerById(consumerId);
  });

  socket.on('producer-paused', ({ participantId: remotePid, source, kind }: any) => {
    setPeers((prev) =>
      prev.map((p) => {
        if (p.id !== remotePid) return p;
        if (source === 'microphone' || kind === 'audio') return { ...p, isMuted: true };
        if (source === 'camera' || kind === 'video') return { ...p, isCameraOff: true };
        return p;
      }),
    );
  });

  socket.on('producer-resumed', ({ participantId: remotePid, source, kind }: any) => {
    setPeers((prev) =>
      prev.map((p) => {
        if (p.id !== remotePid) return p;
        if (source === 'microphone' || kind === 'audio') return { ...p, isMuted: false };
        if (source === 'camera' || kind === 'video') return { ...p, isCameraOff: false };
        return p;
      }),
    );
  });

  socket.on('transport-failed', ({ reason }: any) => {
    addToast?.(`Connection issue (${reason}) — attempting recovery...`);
  });

  socket.on('worker-died', ({ message }: any) => {
    addToast?.(message || 'Server error — please rejoin.');
  });

  socket.on('recording-started', () => {
    setIsRecording(true);
    addToast?.('Meeting recording started');
  });

  socket.on('recording-stopped', () => {
    setIsRecording(false);
    addToast?.('Meeting recording stopped');
  });
}

function _addTrackToStream(
  peerId: string,
  source: string,
  track: MediaStreamTrack,
  setStreams: React.Dispatch<React.SetStateAction<Map<string, PeerStreams>>>,
) {
  setStreams((prev) => {
    const next = new Map(prev);
    const existing = next.get(peerId) ?? emptyPeerStreams();

    if (source === 'screen') {
      existing.screen.addTrack(track);
    } else if (source === 'microphone' || track.kind === 'audio') {
      existing.audio.addTrack(track);
    } else {
      existing.camera.addTrack(track);
    }

    next.set(peerId, existing);
    return next;
  });
}
