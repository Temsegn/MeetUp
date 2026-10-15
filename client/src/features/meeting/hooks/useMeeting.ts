import { useState, useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { createSocketClient, destroySocketClient } from '../../../services/socket/socket-client';
import { setLiveMeetingPresence } from '../lib/live-meeting-presence';
import { MediaSession } from '../../media/mediasoup/media-session';
import {
  AUTO_RECOVERY_MAX_ATTEMPTS,
  classifyJoinError,
  nextRecoveryDelayMs,
  RECONNECT_DEADLINE_MS,
  shouldContinueAutoRecovery,
  type RecoveryOutcome,
} from '../lib/connection-recovery';

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
  identityKey?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  /** Soft-disconnect: remote lost network; keep seat until grace expires or they resume. */
  isReconnecting?: boolean;
}

function peerIdentityMatches(
  peer: PeerInfo,
  opts: { id?: string; userId?: string; identityKey?: string | null; email?: string | null },
): boolean {
  if (opts.id && peer.id === opts.id) return true;
  if (opts.identityKey && peer.identityKey && peer.identityKey === opts.identityKey) return true;
  if (opts.email && peer.email && peer.email === opts.email) return true;
  if (opts.userId && peer.userId && peer.userId === opts.userId) return true;
  return false;
}

/** Drop stale media for a peer id (ended tracks after a disconnect). */
function clearPeerStreams(
  prev: Map<string, PeerStreams>,
  peerId: string,
  opts?: { stop?: boolean },
): Map<string, PeerStreams> {
  if (!prev.has(peerId)) return prev;
  const next = new Map(prev);
  const streams = next.get(peerId);
  if (streams && opts?.stop !== false) {
    streams.camera.getTracks().forEach((t) => t.stop());
    streams.screen.getTracks().forEach((t) => t.stop());
    streams.audio.getTracks().forEach((t) => t.stop());
  }
  next.delete(peerId);
  return next;
}

const JOIN_TIMEOUT_MS = 10_000;

function emptyPeerStreams(): PeerStreams {
  return {
    camera: new MediaStream(),
    screen: new MediaStream(),
    audio: new MediaStream(),
  };
}

export type MeetingConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export const useMeeting = (
  roomId: string,
  token: string,
  displayName: string,
  _userId: string | undefined,
  addToast?: (msg: string) => void,
) => {
  const [joined,        setJoined]        = useState(false);
  const [waiting,       setWaiting]       = useState(false);
  /** Join Before Host is off and the host is not in the room yet (not admit lobby). */
  const [waitingForHost, setWaitingForHost] = useState(false);
  /** Server meeting setting — local mic should start paused. */
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [participantId, setParticipantId] = useState<string>('');
  const [creatorId,     setCreatorId]     = useState<string | null>(null);
  const [peers,         setPeers]         = useState<PeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams]  = useState<Map<string, PeerStreams>>(new Map());
  const [isRecording,   setIsRecording]   = useState(false);
  const [socket,        setSocket]        = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<MeetingConnectionState>('idle');
  const [recoveryOutcome, setRecoveryOutcome] = useState<RecoveryOutcome | null>(null);
  /** Bumps each time a MediaSession is (re)built so the UI can republish local tracks. */
  const [mediaEpoch, setMediaEpoch] = useState(0);
  const [rejoinBusy, setRejoinBusy] = useState(false);
  /** After 20s timeout — full rejoin screen (not in-call UI / not meetings list). */
  const [needsRejoinScreen, setNeedsRejoinScreen] = useState(false);

  const socketRef  = useRef<Socket | null>(null);
  const sessionRef = useRef<MediaSession | null>(null);
  const joiningRef = useRef(false);
  const recoveringRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const autoAttemptRef = useRef(0);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDeadlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectStartedAtRef = useRef<number | null>(null);
  const participantIdRef = useRef('');
  const creatorIdRef = useRef<string | null>(null);
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const joinMeetingRef = useRef<() => Promise<void>>(async () => {});
  const leaveMeetingRef = useRef<() => Promise<void>>(async () => {});
  const recoverAfterSignalRef = useRef<(opts?: { manual?: boolean }) => Promise<void>>(
    async () => {},
  );

  const clearAutoRetryTimer = useCallback(() => {
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
  }, []);

  const clearReconnectDeadline = useCallback(() => {
    if (reconnectDeadlineTimerRef.current) {
      clearTimeout(reconnectDeadlineTimerRef.current);
      reconnectDeadlineTimerRef.current = null;
    }
    reconnectStartedAtRef.current = null;
  }, []);

  /** Tell remotes "Paused — connection lost" as soon as we still can. */
  const announceConnectionLost = useCallback(() => {
    const sock = socketRef.current;
    if (!sock?.connected) return;
    try {
      sock.emit('announce-connection-lost');
    } catch {
      /* best-effort */
    }
  }, []);

  /**
   * Exit the live call UI after the 20s window — keep admission, show rejoin screen.
   * Does not navigate to the meetings list.
   */
  const exitToRejoinScreen = useCallback(async () => {
    intentionalLeaveRef.current = true;
    recoveringRef.current = false;
    autoAttemptRef.current = 0;
    clearAutoRetryTimer();
    clearReconnectDeadline();
    setLiveMeetingPresence(false);

    const sock = socketRef.current;
    if (sock) {
      sock.io.off('reconnect');
      sock.io.off('reconnect_attempt');
      sock.io.off('reconnect_failed');
      sock.off('disconnect');
    }
    if (sessionRef.current) {
      try {
        await sessionRef.current.softCleanup();
      } catch { /* ignore */ }
      sessionRef.current = null;
    }
    destroySocketClient(sock);
    socketRef.current = null;
    setSocket(null);
    setJoined(false);
    setWaiting(false);
    setWaitingForHost(false);
    setMuteOnEntry(false);
    setPeers([]);
    setRemoteStreams(new Map());
    setParticipantId('');
    setIsRecording(false);
    setConnectionState('failed');
    setRecoveryOutcome((o) => o ?? 'network_failed');
    setRejoinBusy(false);
    setNeedsRejoinScreen(true);
    participantIdRef.current = '';
    joiningRef.current = false;
  }, [clearAutoRetryTimer, clearReconnectDeadline]);

  /** After RECONNECT_DEADLINE_MS still reconnecting → dedicated rejoin screen. */
  const armReconnectDeadline = useCallback(() => {
    if (intentionalLeaveRef.current) return;
    if (reconnectDeadlineTimerRef.current) return;
    reconnectStartedAtRef.current = Date.now();
    reconnectDeadlineTimerRef.current = setTimeout(() => {
      reconnectDeadlineTimerRef.current = null;
      if (intentionalLeaveRef.current) return;
      void (async () => {
        setRecoveryOutcome((o) => o ?? 'network_failed');
        clearAutoRetryTimer();
        recoveringRef.current = false;
        await exitToRejoinScreen();
      })();
    }, RECONNECT_DEADLINE_MS);
  }, [clearAutoRetryTimer, exitToRejoinScreen]);

  const leaveMeeting = useCallback(async () => {
    intentionalLeaveRef.current = true;
    recoveringRef.current = false;
    autoAttemptRef.current = 0;
    clearAutoRetryTimer();
    clearReconnectDeadline();
    setLiveMeetingPresence(false);

    const sock = socketRef.current;
    if (sock) {
      sock.io.off('reconnect');
      sock.io.off('reconnect_attempt');
      sock.io.off('reconnect_failed');
      sock.off('disconnect');
      try {
        // Fire-and-forget leave so we don't hang on a pending ack.
        sock.emit('leave-room', { roomId });
      } catch { /* ignore */ }
    }

    const session = sessionRef.current;
    if (session) {
      try {
        await session.softCleanup();
      } catch { /* ignore */ }
      sessionRef.current = null;
    }

    // Hard teardown — stops Engine.IO reconnect / pending polls.
    destroySocketClient(sock);
    socketRef.current = null;
    setSocket(null);
    setJoined(false);
    setWaiting(false);
    setWaitingForHost(false);
    setMuteOnEntry(false);
    setPeers([]);
    setRemoteStreams(new Map());
    setParticipantId('');
    setIsRecording(false);
    setConnectionState('idle');
    setRecoveryOutcome(null);
    setRejoinBusy(false);
    setNeedsRejoinScreen(false);
    participantIdRef.current = '';
    creatorIdRef.current = null;
    joiningRef.current = false;
  }, [roomId, clearAutoRetryTimer, clearReconnectDeadline]);
  leaveMeetingRef.current = leaveMeeting;

  // Keep local "Reconnecting…" within the same 20s window remotes use for the paused tile.
  useEffect(() => {
    if (connectionState === 'reconnecting') {
      armReconnectDeadline();
      return;
    }
    if (connectionState === 'connected' || connectionState === 'idle' || connectionState === 'failed') {
      clearReconnectDeadline();
    }
  }, [connectionState, armReconnectDeadline, clearReconnectDeadline]);

  const enterMediaSession = useCallback(
    async (
      sock: Socket,
      joinRes: {
        participantId: string;
        rtpCapabilities: unknown;
        creatorId: string | null;
        simulcastEncodings?: object[];
        screenShareEncodings?: object[];
      },
    ) => {
      const pid = joinRes.participantId;
      participantIdRef.current = pid;
      creatorIdRef.current = joinRes.creatorId;
      setParticipantId(pid);
      setCreatorId(joinRes.creatorId);

      const session = new MediaSession(sock, roomId, pid);
      session.setEncodingConfig({
        simulcastEncodings: joinRes.simulcastEncodings,
        screenShareEncodings: joinRes.screenShareEncodings,
      });
      session.setOnFatalTransportFailure(() => {
        if (intentionalLeaveRef.current) return;
        announceConnectionLost();
        setConnectionState('reconnecting');
        void recoverAfterSignalRef.current({ manual: false }).catch(() => undefined);
      });
      sessionRef.current = session;

      await session.initialize(joinRes.rtpCapabilities);
      await session.createSendTransport();
      await session.createRecvTransport();

      _attachMediaListeners(
        sock,
        session,
        addToast,
        setPeers,
        setRemoteStreams,
        setIsRecording,
        async () => {
          await recoverAfterSignalRef.current();
        },
      );

      // Mark joined immediately so local UI + mic/camera republish run without
      // waiting for remote consume (critical for instant reconnect appearance).
      setSocket(sock);
      setWaiting(false);
      setWaitingForHost(false);
      setMuteOnEntry(Boolean(joinRes.muteOnEntry));
      setJoined(true);
      setConnectionState('connected');
      setRecoveryOutcome(null);
      setMediaEpoch((n) => n + 1);
      autoAttemptRef.current = 0;
      clearAutoRetryTimer();
      clearReconnectDeadline();
      setNeedsRejoinScreen(false);
      intentionalLeaveRef.current = false;
      setLiveMeetingPresence(true);

      sock.emit('get-recording-status', { roomId }, (res: any) => {
        if (res && !res.error) setIsRecording(!!res.recording);
      });

      // Pull remote peers/producers in the background — must not block local publish.
      sock.emit('get-room-state', { roomId }, async (res: any) => {
        if (res?.error || !res?.peers) return;
        if (sessionRef.current !== session) return;

        const producersByPeer = new Map<string, Array<{ source: string; kind: string; paused: boolean }>>();
        for (const prod of (res.producers ?? [])) {
          if (prod.participantId === pid) continue;
          const list = producersByPeer.get(prod.participantId) ?? [];
          list.push({
            source: prod.appData?.source ?? (prod.kind === 'audio' ? 'microphone' : 'camera'),
            kind: prod.kind,
            paused: prod.paused ?? false,
          });
          producersByPeer.set(prod.participantId, list);
        }

        const existingPeers: PeerInfo[] = res.peers
          .filter((p: any) => p.id !== pid)
          .map((p: any) => {
            const prods = producersByPeer.get(p.id) ?? [];
            const audioProds = prods.filter((pr) => pr.source === 'microphone' || pr.kind === 'audio');
            const videoProds = prods.filter(
              (pr) => pr.source === 'camera' || (pr.kind === 'video' && pr.source !== 'screen'),
            );
            const isMuted =
              audioProds.length === 0 ? undefined : audioProds.every((pr) => pr.paused);
            const isCameraOff =
              videoProds.length === 0 ? undefined : videoProds.every((pr) => pr.paused);
            return {
              id: p.id,
              name: p.name,
              userId: p.userId,
              identityKey: p.identityKey ?? null,
              email: p.email ?? null,
              avatarUrl: p.avatarUrl ?? null,
              avatarColor: p.avatarColor ?? null,
              isHost: p.userId === joinRes.creatorId,
              isMuted,
              isCameraOff,
              isReconnecting: false,
            };
          });
        const deduped: PeerInfo[] = [];
        for (const peer of existingPeers) {
          const idx = deduped.findIndex((p) =>
            peerIdentityMatches(p, {
              id: peer.id,
              userId: peer.userId,
              identityKey: peer.identityKey,
              email: peer.email,
            }),
          );
          if (idx >= 0) deduped[idx] = peer;
          else deduped.push(peer);
        }
        setPeers(deduped);

        for (const prod of (res.producers ?? [])) {
          if (prod.participantId === pid) continue;
          if (sessionRef.current !== session) return;
          try {
            const consumer = await session.consume(prod.producerId);
            const source =
              prod.appData?.source ?? (prod.kind === 'audio' ? 'microphone' : 'camera');
            _addTrackToStream(prod.participantId, source, consumer.track, setRemoteStreams);
            if (!prod.paused) {
              setPeers((prev) =>
                prev.map((p) => {
                  if (p.id !== prod.participantId) return p;
                  if (source === 'microphone' || prod.kind === 'audio') {
                    return { ...p, isMuted: false, isReconnecting: false };
                  }
                  if (source === 'camera') return { ...p, isCameraOff: false, isReconnecting: false };
                  return p;
                }),
              );
            }
          } catch (e) {
            console.error('Failed to consume existing producer', e);
          }
        }
      });
    },
    [roomId, addToast, clearAutoRetryTimer, clearReconnectDeadline, announceConnectionLost],
  );

  const scheduleAutoRecovery = useCallback(() => {
    if (intentionalLeaveRef.current) return;
    if (!shouldContinueAutoRecovery(autoAttemptRef.current)) {
      setConnectionState('failed');
      setRecoveryOutcome((prev) => prev ?? 'network_failed');
      return;
    }
    clearAutoRetryTimer();
    const delay = nextRecoveryDelayMs(autoAttemptRef.current);
    autoAttemptRef.current += 1;
    setConnectionState('reconnecting');
    autoRetryTimerRef.current = setTimeout(() => {
      void recoverAfterSignalRef.current({ manual: false }).catch(() => undefined);
    }, delay);
  }, [clearAutoRetryTimer]);

  /** Soft recovery after signaling reconnect — keep page, rebuild media, skip leave. */
  const recoverAfterSignal = useCallback(
    async (opts?: { manual?: boolean }) => {
      if (intentionalLeaveRef.current) return;
      if (recoveringRef.current) return;
      recoveringRef.current = true;
      setConnectionState('reconnecting');
      if (opts?.manual) {
        autoAttemptRef.current = 0;
        clearAutoRetryTimer();
      }

      try {
        const sock = socketRef.current;
        if (!sock || !sock.connected) {
          throw new Error('Socket not connected');
        }

        if (sessionRef.current) {
          try {
            await sessionRef.current.softCleanup();
          } catch { /* ignore */ }
          sessionRef.current = null;
        }
        setRemoteStreams(new Map());
        setPeers([]);

        const joinRes = await new Promise<any>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('rejoin timed out')), JOIN_TIMEOUT_MS);
          sock.emit(
            'join-room',
            { roomId, displayName: displayNameRef.current || undefined },
            (res: any) => {
              clearTimeout(t);
              if (res?.error) return reject(new Error(res.error));
              resolve(res);
            },
          );
        });

        if (joinRes.status === 'waiting') {
          setWaiting(true);
          setWaitingForHost(false);
          setJoined(false);
          setConnectionState('connected');
          setRecoveryOutcome('waiting');
          addToast?.('Waiting for the host to let you back in…');
          return;
        }
        if (joinRes.status === 'waiting_for_host') {
          setWaitingForHost(true);
          setWaiting(false);
          setJoined(false);
          setConnectionState('connected');
          setRecoveryOutcome('waiting');
          addToast?.(
            joinRes.message ||
              'The host has not joined yet. Try again after the host starts the meeting.',
          );
          return;
        }

        await enterMediaSession(sock, joinRes);
        if (!opts?.manual) {
          addToast?.('Connection restored');
        } else {
          addToast?.('Rejoined the meeting');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to restore media';
        const outcome = classifyJoinError(message);
        setRecoveryOutcome(outcome);

        if (outcome === 'auth_denied' || outcome === 'meeting_ended') {
          setConnectionState('failed');
          addToast?.(message);
          return;
        }

        if (!opts?.manual && shouldContinueAutoRecovery(autoAttemptRef.current)) {
          addToast?.(`Reconnecting… (attempt ${autoAttemptRef.current + 1}/${AUTO_RECOVERY_MAX_ATTEMPTS})`);
          recoveringRef.current = false;
          scheduleAutoRecovery();
          return;
        }

        setConnectionState('failed');
        if (opts?.manual) {
          addToast?.(message);
        }
        throw err;
      } finally {
        recoveringRef.current = false;
      }
    },
    [roomId, addToast, enterMediaSession, clearAutoRetryTimer, scheduleAutoRecovery],
  );
  recoverAfterSignalRef.current = recoverAfterSignal;

  const joinMeeting = useCallback(async (tokenOverride?: string) => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    intentionalLeaveRef.current = false;
    setWaitingForHost(false);
    setConnectionState('connecting');

    try {
      if (sessionRef.current) {
        try {
          await sessionRef.current.softCleanup();
        } catch { /* ignore */ }
        sessionRef.current = null;
      }

      const authToken = tokenOverride || token;
      if (!authToken) throw new Error('Not signed in');
      // createSocketClient destroys any prior meeting socket (single-socket rule).
      const sock = createSocketClient(authToken);
      socketRef.current = sock;

      const attachReconnectHandlers = (s: Socket) => {
        s.io.off('reconnect');
        s.io.off('reconnect_attempt');
        s.io.off('reconnect_failed');
        s.off('disconnect');

        s.on('disconnect', (reason) => {
          if (intentionalLeaveRef.current) return;
          if (reason === 'io client disconnect') return;
          setRecoveryOutcome(null);
          setConnectionState('reconnecting');
        });

        s.io.on('reconnect_attempt', () => {
          if (intentionalLeaveRef.current) return;
          setConnectionState('reconnecting');
        });

        s.io.on('reconnect', () => {
          if (intentionalLeaveRef.current) return;
          // Signaling is back — media must still be rebuilt (bounded auto attempts).
          void recoverAfterSignalRef.current({ manual: false }).catch(() => undefined);
        });

        s.io.on('reconnect_failed', () => {
          if (intentionalLeaveRef.current) return;
          setRecoveryOutcome('network_failed');
          void exitToRejoinScreen();
        });
      };
      attachReconnectHandlers(sock);

      await new Promise<void>((resolve, reject) => {
        if (sock.connected) { resolve(); return; }
        const t = setTimeout(
          () => reject(new Error('Connection timeout — is the backend running?')),
          JOIN_TIMEOUT_MS,
        );
        sock.once('connect', () => { clearTimeout(t); resolve(); });
        sock.once('connect_error', (e) => {
          clearTimeout(t);
          reject(new Error(`Connection failed: ${e.message}`));
        });
      });

      const joinRes = await new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('join-room timed out')), JOIN_TIMEOUT_MS);
        sock.emit(
          'join-room',
          { roomId, displayName: displayNameRef.current || undefined },
          (res: any) => {
            clearTimeout(t);
            if (res?.error) return reject(new Error(res.error));
            resolve(res);
          },
        );
      });

      if (joinRes.status === 'waiting') {
        setWaiting(true);
        setWaitingForHost(false);
        setSocket(sock);
        setCreatorId(null);

        const onAdmitted = async (payload: any) => {
          sock.off('waiting-admitted', onAdmitted);
          sock.off('waiting-denied', onDenied);
          try {
            await enterMediaSession(sock, payload);
            addToast?.('Host let you in');
          } catch (err) {
            addToast?.(err instanceof Error ? err.message : 'Failed to join after admit');
            setWaiting(false);
          }
        };
        const onDenied = (payload: { reason?: string }) => {
          sock.off('waiting-admitted', onAdmitted);
          sock.off('waiting-denied', onDenied);
          setWaiting(false);
          socketRef.current = null;
          setSocket(null);
          addToast?.(payload.reason || 'Host declined your request to join');
        };
        sock.on('waiting-admitted', onAdmitted);
        sock.on('waiting-denied', onDenied);
        return;
      }

      if (joinRes.status === 'waiting_for_host') {
        setWaitingForHost(true);
        setWaiting(false);
        setJoined(false);
        setSocket(sock);
        setCreatorId(null);
        setConnectionState('connected');
        addToast?.(
          joinRes.message ||
            'The host has not joined yet. Try again after the host starts the meeting.',
        );
        return;
      }

      await enterMediaSession(sock, joinRes);
      setConnectionState('connected');
    } catch (err) {
      setConnectionState((prev) => (prev === 'connected' ? prev : 'failed'));
      throw err;
    } finally {
      joiningRef.current = false;
    }
  }, [roomId, token, addToast, enterMediaSession, exitToRejoinScreen]);

  joinMeetingRef.current = joinMeeting;

  // Browser online/offline hints — never treat offline as meeting ended.
  useEffect(() => {
    const onOffline = () => {
      if (!joined || intentionalLeaveRef.current) return;
      // Announce while the socket may still be briefly alive.
      announceConnectionLost();
      setConnectionState('reconnecting');
    };
    const onOnline = () => {
      if (!joined || intentionalLeaveRef.current || needsRejoinScreen) return;
      const sock = socketRef.current;
      if (sock && !sock.connected) {
        sock.connect();
      } else if (sock?.connected && connectionState !== 'connected') {
        void recoverAfterSignalRef.current().catch(() => undefined);
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [joined, connectionState, announceConnectionLost, needsRejoinScreen]);

  // When we enter reconnecting with a live socket, notify remotes immediately.
  useEffect(() => {
    if (connectionState !== 'reconnecting') return;
    announceConnectionLost();
  }, [connectionState, announceConnectionLost]);

  /**
   * Manual "Rejoin meeting" after automatic recovery is exhausted.
   * Reuses server-side admission; does not require host approval when still authorized.
   */
  const rejoinMeeting = useCallback(async () => {
    if (rejoinBusy) return;
    intentionalLeaveRef.current = false;
    setNeedsRejoinScreen(false);
    setRejoinBusy(true);
    setRecoveryOutcome(null);
    setConnectionState('reconnecting');
    autoAttemptRef.current = 0;
    clearAutoRetryTimer();
    clearReconnectDeadline();

    try {
      const sock = socketRef.current;
      if (sock && !sock.connected) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Reconnect timed out')), JOIN_TIMEOUT_MS);
          sock.once('connect', () => {
            clearTimeout(t);
            resolve();
          });
          sock.once('connect_error', (e) => {
            clearTimeout(t);
            reject(e);
          });
          sock.connect();
        });
        await recoverAfterSignalRef.current({ manual: true });
        return;
      }

      if (sock?.connected) {
        await recoverAfterSignalRef.current({ manual: true });
        return;
      }

      // No usable socket — full soft rejoin with a fresh connection (no leave-room).
      if (sessionRef.current) {
        try {
          await sessionRef.current.softCleanup();
        } catch { /* ignore */ }
        sessionRef.current = null;
      }
      await joinMeetingRef.current();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not rejoin';
      const outcome = classifyJoinError(message);
      setRecoveryOutcome(outcome);
      if (outcome === 'auth_denied' || outcome === 'meeting_ended') {
        setConnectionState('failed');
        setNeedsRejoinScreen(false);
      } else {
        setNeedsRejoinScreen(true);
        setConnectionState('failed');
      }
      addToast?.(message);
    } finally {
      setRejoinBusy(false);
    }
  }, [rejoinBusy, clearAutoRetryTimer, clearReconnectDeadline, addToast]);

  /** @deprecated alias — prefer rejoinMeeting */
  const retryConnection = rejoinMeeting;

  // Cleanup listeners when leaving
  useEffect(() => {
    if (!joined) return;
    return () => {
      const sock = socketRef.current;
      if (!sock) return;
      sock.off('new-producer');
      sock.off('peer-joined');
      sock.off('peer-left');
      sock.off('producer-closed');
      sock.off('consumer-closed');
      sock.off('producer-paused');
      sock.off('producer-resumed');
      sock.off('transport-failed');
      sock.off('worker-died');
      sock.off('recording-started');
      sock.off('recording-stopped');
    };
  }, [joined]);

  const startRecording = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess) return;
    addToast?.('Starting recording…');
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
    addToast?.('Stopping recording…');
    const res = await sess.stopRecording();
    if (res.error) {
      addToast?.(res.error);
      return;
    }
    setIsRecording(false);
    addToast?.('Recording stopped — files saved on server');
  }, [addToast]);
  return {
    joined,
    waiting,
    waitingForHost,
    muteOnEntry,
    participantId,
    joinMeeting,
    leaveMeeting,
    rejoinMeeting,
    retryConnection,
    connectionState,
    recoveryOutcome,
    rejoinBusy,
    needsRejoinScreen,
    mediaEpoch,
    session: sessionRef,
    peers,
    remoteStreams,
    creatorId,
    isRecording,
    startRecording,
    stopRecording,
    socket,
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
  recoverMedia: () => Promise<void>,
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
  socket.off('peer-reconnecting');
  socket.off('peer-reconnected');

  socket.on('new-producer', async ({ producerId, participantId: remotePid, kind, appData }: any) => {
    try {
      const consumer = await session.consume(producerId);
      const source = appData?.source ?? (kind === 'audio' ? 'microphone' : 'camera');
      _addTrackToStream(remotePid, source, consumer.track, setRemoteStreams);

      // Clear reconnecting / off flags as soon as fresh media arrives.
      setPeers((prev) =>
        prev.map((p) => {
          if (p.id !== remotePid) return p;
          const next = { ...p, isReconnecting: false };
          if (source === 'microphone' || kind === 'audio') return { ...next, isMuted: false };
          if (source === 'camera') return { ...next, isCameraOff: false };
          return next;
        }),
      );
    } catch (e) {
      console.error('Failed to consume new producer', e);
    }
  });

  socket.on(
    'peer-joined',
    ({
      participantId: newPid,
      name,
      userId: newUserId,
      identityKey,
      email,
      avatarUrl,
      avatarColor,
    }: any) => {
      setPeers((prev) => {
        const matchIdx = prev.findIndex((p) =>
          peerIdentityMatches(p, {
            id: newPid,
            userId: newUserId,
            identityKey,
            email,
          }),
        );
        if (matchIdx >= 0) {
          const old = prev[matchIdx]!;
          if (old.id !== newPid) {
            // Drop stale media under the old id; keep anything already at newPid.
            setRemoteStreams((streams) => clearPeerStreams(streams, old.id));
          }
          const next = [...prev];
          next[matchIdx] = {
            ...old,
            id: newPid,
            name: name || old.name,
            userId: newUserId || old.userId,
            identityKey: identityKey ?? old.identityKey,
            email: email ?? old.email,
            avatarUrl: avatarUrl ?? old.avatarUrl,
            avatarColor: avatarColor ?? old.avatarColor,
            isReconnecting: false,
          };
          return next;
        }
        addToast?.(`${name} joined`);
        return [
          ...prev,
          {
            id: newPid,
            name,
            userId: newUserId,
            identityKey: identityKey ?? null,
            email: email ?? null,
            avatarUrl: avatarUrl ?? null,
            avatarColor: avatarColor ?? null,
            isReconnecting: false,
          },
        ];
      });
    },
  );

  socket.on('peer-left', ({ participantId: leftPid, reason }: any) => {
    setPeers((prev) => {
      const peer = prev.find((p) => p.id === leftPid);
      if (peer && reason !== 'reconnect') addToast?.(`${peer.name} left`);
      // Keep the seat briefly on reconnect replace so peer-reconnected can swap ids.
      if (reason === 'reconnect') {
        return prev.map((p) =>
          p.id === leftPid ? { ...p, isReconnecting: true } : p,
        );
      }
      return prev.filter((p) => p.id !== leftPid);
    });
    if (reason === 'reconnect') {
      // Drop dead media immediately; new-producer will refill under the new id.
      setRemoteStreams((prev) => clearPeerStreams(prev, leftPid));
      return;
    }
    setRemoteStreams((prev) => clearPeerStreams(prev, leftPid));
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
        // Screen share is also kind=video — only treat camera as camera-off.
        if (source === 'camera') return { ...p, isCameraOff: true };
        return p;
      }),
    );
  });

  socket.on('producer-resumed', async ({ participantId: remotePid, producerId, source, kind }: any) => {
    // Update peer UI state first
    setPeers((prev) =>
      prev.map((p) => {
        if (p.id !== remotePid) return p;
        if (source === 'microphone' || kind === 'audio') return { ...p, isMuted: false };
        if (source === 'camera') return { ...p, isCameraOff: false };
        return p;
      }),
    );

    // If we don't already have a consumer for this producer, create one now.
    // This covers the case where the producer was paused when we joined (and
    // therefore skipped in get-room-state) and has just been resumed.
    if (!producerId) return;
    try {
      const consumer = await session.consume(producerId);
      const resolvedSource = source ?? (kind === 'audio' ? 'microphone' : 'camera');
      _addTrackToStream(remotePid, resolvedSource, consumer.track, setRemoteStreams);
    } catch (e) {
      // "already consumed" is fine — consume() deduplicates by producerId
      console.warn('producer-resumed consume skipped or failed', e);
    }
  });

  socket.on('transport-failed', ({ reason }: any) => {
    addToast?.(`Connection issue (${reason}) — recovering media…`);
    void recoverMedia().catch(() => {
      addToast?.('Failed to recover media — please tap Retry.');
    });
  });

  socket.on('worker-died', ({ message }: any) => {
    addToast?.(message || 'Media server restarted — recovering…');
    void recoverMedia().catch(() => {
      addToast?.('Server error — please tap Retry or refresh.');
    });
  });

  socket.on('peer-reconnecting', ({ participantId: remotePid, name, userId, identityKey, email }: any) => {
    setPeers((prev) =>
      prev.map((p) => {
        const match =
          p.id === remotePid ||
          peerIdentityMatches(p, { userId, identityKey, email });
        if (!match) return p;
        return {
          ...p,
          isReconnecting: true,
          isMuted: true,
          isCameraOff: true,
        };
      }),
    );
    setRemoteStreams((prev) => clearPeerStreams(prev, remotePid));
    if (name) addToast?.(`${name}'s connection paused`);
  });

  socket.on(
    'peer-reconnected',
    ({
      participantId: newPid,
      previousParticipantId,
      name,
      userId: newUserId,
      identityKey,
      email,
      avatarUrl,
      avatarColor,
    }: any) => {
      // Drop stale media under the old id immediately. Keep anything already
      // under newPid (new-producer can race ahead of this event).
      if (previousParticipantId && previousParticipantId !== newPid) {
        setRemoteStreams((streams) => clearPeerStreams(streams, previousParticipantId));
      }

      setPeers((prev) => {
        const matchIdx = prev.findIndex((p) =>
          peerIdentityMatches(p, {
            id: previousParticipantId || newPid,
            userId: newUserId,
            identityKey,
            email,
          }),
        );
        if (matchIdx >= 0) {
          const old = prev[matchIdx]!;
          const next = [...prev];
          next[matchIdx] = {
            ...old,
            id: newPid,
            name: name || old.name,
            userId: newUserId || old.userId,
            identityKey: identityKey ?? old.identityKey,
            email: email ?? old.email,
            avatarUrl: avatarUrl ?? old.avatarUrl,
            avatarColor: avatarColor ?? old.avatarColor,
            isReconnecting: false,
            isMuted: undefined,
            isCameraOff: undefined,
          };
          return next.filter(
            (p, i) =>
              i === matchIdx ||
              !peerIdentityMatches(p, {
                userId: newUserId,
                identityKey,
                email,
              }),
          );
        }
        addToast?.(`${name} reconnected`);
        return [
          ...prev,
          {
            id: newPid,
            name,
            userId: newUserId,
            identityKey: identityKey ?? null,
            email: email ?? null,
            avatarUrl: avatarUrl ?? null,
            avatarColor: avatarColor ?? null,
            isReconnecting: false,
          },
        ];
      });
    },
  );

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
  const apply = () => {
    setStreams((prev) => {
      const next = new Map(prev);
      const existing = next.get(peerId) ?? emptyPeerStreams();

      // Always build new MediaStream objects so React/VideoTile see a new
      // reference when tracks arrive after mic-first produce (addTrack alone
      // keeps the same stream identity and leaves a black video element).
      const withTrack = (stream: MediaStream) => {
        const tracks = stream.getTracks().filter((t) => t.id !== track.id && t.readyState !== 'ended');
        return new MediaStream([...tracks, track]);
      };

      let updated: PeerStreams;
      if (source === 'screen') {
        updated = { ...existing, screen: withTrack(existing.screen) };
      } else if (source === 'microphone' || track.kind === 'audio') {
        updated = { ...existing, audio: withTrack(existing.audio) };
      } else {
        updated = { ...existing, camera: withTrack(existing.camera) };
      }

      next.set(peerId, updated);
      return next;
    });
  };

  apply();

  // Remote MediaStreamTracks often stay muted until the first RTP packet.
  // Force a second bind when they unmute so <video> actually paints.
  if (track.kind === 'video') {
    const onUnmute = () => apply();
    track.addEventListener('unmute', onUnmute);
    track.addEventListener(
      'ended',
      () => track.removeEventListener('unmute', onUnmute),
      { once: true },
    );
  }
}
