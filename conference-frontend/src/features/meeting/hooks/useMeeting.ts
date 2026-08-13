import { useState, useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { createSocketClient } from '../../../services/socket/socket-client';
import { MediaSession } from '../../media/mediasoup/media-session';

export interface PeerStreams {
  camera: MediaStream;
  screen: MediaStream;
}

export interface PeerInfo {
  id: string;          // server-assigned participantId
  name: string;
  userId: string;
  isHost?: boolean;
  isMuted?: boolean;   // remote audio mute state
  isCameraOff?: boolean; // remote video mute state
}

const JOIN_TIMEOUT_MS = 10_000;

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

  // Stable refs to avoid stale closures in socket listeners
  const socketRef  = useRef<Socket | null>(null);
  const sessionRef = useRef<MediaSession | null>(null);

  const joinMeeting = useCallback(async () => {
    // Create fresh socket & session for this meeting
    const socket  = createSocketClient(token);
    socketRef.current = socket;

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      if (socket.connected) { resolve(); return; }
      const t = setTimeout(() => reject(new Error('Connection timeout — is the backend running?')), JOIN_TIMEOUT_MS);
      socket.once('connect',       () => { clearTimeout(t); resolve(); });
      socket.once('connect_error', (e) => { clearTimeout(t); reject(new Error(`Connection failed: ${e.message}`)); });
    });

    // Join room — server returns server-assigned participantId
    const joinRes = await new Promise<{ participantId: string; rtpCapabilities: unknown; creatorId: string | null }>(
      (resolve, reject) => {
        const t = setTimeout(() => reject(new Error('join-room timed out')), JOIN_TIMEOUT_MS);
        socket.emit('join-room', { roomId }, (res: any) => {
          clearTimeout(t);
          if (res?.error) return reject(new Error(res.error));
          resolve(res);
        });
      },
    );

    const pid = joinRes.participantId;
    setParticipantId(pid);
    setCreatorId(joinRes.creatorId);

    // Initialize mediasoup session
    const session = new MediaSession(socket, roomId, pid);
    sessionRef.current = session;

    await session.initialize(joinRes.rtpCapabilities);
    await session.createSendTransport();
    await session.createRecvTransport();

    // Load existing peers and producers
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
              _addTrackToStream(prod.participantId, prod.appData?.source === 'screen' ? 'screen' : 'camera', consumer.track, setRemoteStreams);
            } catch (e) {
              console.error('Failed to consume existing producer', e);
            }
          }
        }
        resolve();
      });
    });

    setJoined(true);
  }, [roomId, token]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !joined) return;

    const session = sessionRef.current!;
    const pid = participantId;

    const onNewProducer = async ({ producerId, participantId: remotePid, appData }: any) => {
      try {
        const consumer = await session.consume(producerId);
        const streamType = appData?.source === 'screen' ? 'screen' : 'camera';
        _addTrackToStream(remotePid, streamType, consumer.track, setRemoteStreams);
      } catch (e) {
        console.error('Failed to consume new producer', e);
      }
    };

    const onPeerJoined = ({ participantId: newPid, name, userId: newUserId }: any) => {
      if (newPid === pid) return;
      setPeers(prev => {
        if (prev.some(p => p.id === newPid)) return prev;
        addToast?.(`${name} joined`);
        return [...prev, { id: newPid, name, userId: newUserId, isHost: newUserId === creatorId }];
      });
    };

    const onPeerLeft = ({ participantId: leftPid }: any) => {
      setPeers(prev => {
        const peer = prev.find(p => p.id === leftPid);
        if (peer) addToast?.(`${peer.name} left`);
        return prev.filter(p => p.id !== leftPid);
      });
      setRemoteStreams(prev => {
        const next = new Map(prev);
        // Stop all tracks for this peer before removing
        const streams = next.get(leftPid);
        if (streams) {
          streams.camera.getTracks().forEach(t => t.stop());
          streams.screen.getTracks().forEach(t => t.stop());
        }
        next.delete(leftPid);
        return next;
      });
    };

    const onProducerClosed = ({ participantId: closedPid, producerId: _producerId }: any) => {
      // Remove just the specific track, identified by producerId via consumer lookup
      setRemoteStreams(prev => {
        const next = new Map(prev);
        const streams = next.get(closedPid);
        if (streams) {
          // We can't trivially know if it's camera or screen by producerId here
          // so we reset the screen stream (most common case for close-producer)
          const newScreen = new MediaStream();
          next.set(closedPid, { ...streams, screen: newScreen });
        }
        return next;
      });
    };

    const onConsumerClosed = ({ consumerId, participantId: _remotePid }: any) => {
      // Server told us a specific consumer was closed — close it on our end
      session.closeConsumerById(consumerId);
    };

    const onProducerPaused = ({ participantId: remotePid, producerId: _producerId }: any) => {
      setPeers(prev => prev.map(p =>
        p.id === remotePid ? { ...p, isMuted: true } : p,
      ));
    };

    const onProducerResumed = ({ participantId: remotePid, producerId: _producerId }: any) => {
      setPeers(prev => prev.map(p =>
        p.id === remotePid ? { ...p, isMuted: false } : p,
      ));
    };

    const onTransportFailed = ({ transportId: _transportId, reason }: any) => {
      addToast?.(`Connection issue (${reason}) — attempting recovery...`);
    };

    const onWorkerDied = ({ message }: any) => {
      addToast?.(message || 'Server error — please rejoin.');
    };

    const onReconnect = async () => {
      addToast?.('Reconnected — rejoining meeting...');
      setPeers([]);
      setRemoteStreams(new Map());
      setJoined(false);
      try {
        await joinMeeting();
      } catch (e) {
        addToast?.('Failed to rejoin — please refresh.');
      }
    };

    socket.on('new-producer',   onNewProducer);
    socket.on('peer-joined',    onPeerJoined);
    socket.on('peer-left',      onPeerLeft);
    socket.on('producer-closed', onProducerClosed);
    socket.on('consumer-closed', onConsumerClosed);
    socket.on('producer-paused', onProducerPaused);
    socket.on('producer-resumed', onProducerResumed);
    socket.on('transport-failed', onTransportFailed);
    socket.on('worker-died',    onWorkerDied);
    socket.io.on('reconnect',   onReconnect);

    return () => {
      socket.off('new-producer',    onNewProducer);
      socket.off('peer-joined',     onPeerJoined);
      socket.off('peer-left',       onPeerLeft);
      socket.off('producer-closed', onProducerClosed);
      socket.off('consumer-closed', onConsumerClosed);
      socket.off('producer-paused', onProducerPaused);
      socket.off('producer-resumed', onProducerResumed);
      socket.off('transport-failed', onTransportFailed);
      socket.off('worker-died',     onWorkerDied);
      socket.io.off('reconnect',    onReconnect);
    };
  }, [joined, participantId, creatorId, joinMeeting, addToast]);

  const leaveMeeting = useCallback(async () => {
    const session = sessionRef.current;
    if (session) {
      await session.cleanup(); // closes producers, consumers, transports, socket
      sessionRef.current = null;
    }
    socketRef.current = null;
    setJoined(false);
    setPeers([]);
    setRemoteStreams(new Map());
    setParticipantId('');
  }, []);

  return {
    joined,
    participantId,
    joinMeeting,
    leaveMeeting,
    session: sessionRef,
    peers,
    remoteStreams,
    creatorId,
  };
};

// ── Helper ─────────────────────────────────────────────────────────────────

function _addTrackToStream(
  peerId: string,
  type: 'camera' | 'screen',
  track: MediaStreamTrack,
  setStreams: React.Dispatch<React.SetStateAction<Map<string, PeerStreams>>>,
) {
  setStreams(prev => {
    const next = new Map(prev);
    const existing = next.get(peerId) ?? {
      camera: new MediaStream(),
      screen: new MediaStream(),
    };
    existing[type].addTrack(track);
    next.set(peerId, existing);
    return next;
  });
}
