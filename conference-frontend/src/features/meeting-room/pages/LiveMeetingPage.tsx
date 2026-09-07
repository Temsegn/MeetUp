import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MonitorUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAccessToken } from '../../../services/auth/auth.service';
import { meetingsService, type Meeting } from '../../../services/meetings/meetings.service';
import { useMeeting } from '../../meeting/hooks/useMeeting';
import { useLocalMedia } from '../../media/hooks/useLocalMedia';
import { useReactions } from '../../collaboration/hooks/useReactions';
import { ReactionOverlay } from '../../collaboration/components/ReactionOverlay/ReactionOverlay';
import { useMeetingScreenRecorder } from '../../media/recording/useMeetingScreenRecorder';
import { WhiteboardStage, useWhiteboardVisibility } from '../../whiteboard';
import {
  ControlRequestDialog,
  RemoteControlBanner,
  useRemoteControl,
} from '../../remote-control';
import type { CommandHandlerMap } from '../../remote-control/types';
import { cn } from '../../../lib/cn';
import { MeetingPreJoinScreen } from '../components/MeetingPreJoinScreen';
import { MeetingRoomHeader } from '../components/MeetingRoomHeader';
import { VideoTile, type LiveParticipant } from '../components/VideoTile';
import { ConferenceControlBar } from '../components/ConferenceControlBar';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { MeetingChatPanel } from '../components/MeetingChatPanel';
import { useMeetingModeration, emitHostModerate } from '../hooks/useMeetingModeration';
import type { ParticipantModerationAction } from '../components/ParticipantRowMenu';

/**
 * New Samtal live meeting experience (pre-join + in-call).
 * Leave exits only you. End (host) ends the live meeting for everyone.
 */
export function LiveMeetingPage() {
  const { roomId = 'meeting' } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, activeWorkspace } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [waitingList, setWaitingList] = useState<
    { requestId: string; name: string; avatarUrl?: string | null; avatarColor?: string | null; isGuest?: boolean }[]
  >([]);

  const [meetingMeta, setMeetingMeta] = useState<Meeting | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [pendingRemoteShare, setPendingRemoteShare] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** When true, navigation/leave is intentional (Leave / End / host ended). */
  const allowLeaveRef = useRef(false);

  const addToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !roomId) return;
    meetingsService
      .getByRoomId(activeWorkspace.workspaceId, roomId)
      .then((m) => {
        setMeetingMeta(m);
        if (m.status === 'cancelled') {
          navigate(`/app/meetings/${m.id}`, { replace: true });
          return;
        }
        // Upcoming until scheduled date/time — do not allow early join
        if (
          m.status === 'scheduled' &&
          m.scheduledAt &&
          new Date(m.scheduledAt).getTime() > Date.now()
        ) {
          navigate(`/app/meetings/${m.id}`, { replace: true });
        }
      })
      .catch(() => setMeetingMeta(null));
  }, [activeWorkspace?.workspaceId, roomId, navigate]);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  const accessToken = guestToken || getAccessToken() || '';
  const effectiveUserId = guestUserId || user?.id;
  const effectiveName = displayName.trim() || user?.name || 'Guest';

  const {
    joined,
    waiting,
    participantId,
    joinMeeting,
    leaveMeeting,
    session,
    peers,
    remoteStreams,
    socket,
    creatorId,
  } = useMeeting(roomId, accessToken, effectiveName, effectiveUserId, addToast);

  const isHost = Boolean(effectiveUserId && creatorId && effectiveUserId === creatorId);
  const isHostViewer = isHost;

  const { announceOpen, announceClose, isOpener } = useWhiteboardVisibility({
    socket,
    roomId,
    joined,
    localParticipantId: participantId,
    setWhiteboardOpen,
    addToast,
  });

  const { localStream, screenStream, startLocalMedia, startScreenShare, stopScreenShare } = useLocalMedia();
  const { activeReactions, sendReaction, raisedHands, toggleRaiseHand, setRaiseHand } = useReactions(
    roomId,
    participantId || '__pre_join__',
  );

  const getAudioStreams = useCallback((): MediaStream[] => {
    const streams: MediaStream[] = [];
    if (localStream) streams.push(localStream);
    if (screenStream) streams.push(screenStream);
    peers.forEach((p) => {
      const remote = remoteStreams.get(p.id);
      if (remote?.audio) streams.push(remote.audio);
      else if (remote?.camera) streams.push(remote.camera);
      if (remote?.screen) streams.push(remote.screen);
    });
    return streams;
  }, [localStream, screenStream, peers, remoteStreams]);

  const {
    isRecording,
    isBusy: isRecordingBusy,
    startRecording,
    stopRecording,
  } = useMeetingScreenRecorder({
    roomId,
    workspaceId: activeWorkspace?.workspaceId,
    getStageEl: () => stageRef.current,
    getAudioStreams,
    addToast,
  });

  // Browser tab close / refresh / back without using Leave
  useEffect(() => {
    if (!joined) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.history.pushState({ liveMeetingGuard: true }, '');
    const onPopState = () => {
      if (allowLeaveRef.current) return;
      setLeavePromptOpen(true);
      window.history.pushState({ liveMeetingGuard: true }, '');
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [joined]);

  useEffect(() => {
    void startLocalMedia();
  }, [startLocalMedia]);

  useEffect(() => {
    if (!socket) return;
    const onEnded = () => {
      addToast('Host ended the meeting');
      allowLeaveRef.current = true;
      void (async () => {
        localStream?.getTracks().forEach((t) => t.stop());
        screenStream?.getTracks().forEach((t) => t.stop());
        await leaveMeeting();
        navigate('/app/meetings');
      })();
    };
    socket.on('meeting-ended', onEnded);
    return () => {
      socket.off('meeting-ended', onEnded);
    };
  }, [socket, leaveMeeting, navigate, addToast, localStream, screenStream]);

  const handleJoin = async () => {
    setJoinError(null);
    if (!displayName.trim()) {
      setJoinError('Please enter your name to join.');
      return;
    }
    setIsJoining(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const email = guestEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Enter the email you were invited with.');
        }
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
        const res = await fetch(`${API_URL}/auth/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: displayName.trim(), roomId, email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not join as guest');
        token = data.tokens?.accessToken as string;
        setGuestToken(token);
        setGuestUserId(data.user?.id ?? null);
      }

      const stream = localStream ?? (await startLocalMedia());
      if (!stream || stream.getTracks().length === 0) {
        throw new Error('Could not access camera/microphone. Allow permissions and try again.');
      }
      await joinMeeting(token);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join. Is the backend running?');
    } finally {
      setIsJoining(false);
    }
  };

  // After admitted / host join — publish local media
  useEffect(() => {
    if (!joined) return;
    const sess = session.current;
    const stream = localStream;
    if (!sess || !stream) return;
    void (async () => {
      try {
        for (const track of stream.getAudioTracks()) await sess.produce(track, 'microphone');
        for (const track of stream.getVideoTracks()) await sess.produce(track, 'camera', true);
      } catch {
        addToast('Could not publish camera/microphone');
      }
    })();
  }, [joined, localStream, session, addToast]);

  // Host waiting-room requests
  useEffect(() => {
    if (!socket || !joined || !isHost) return;
    const onRequest = (payload: {
      requestId: string;
      name: string;
      avatarUrl?: string | null;
      avatarColor?: string | null;
      isGuest?: boolean;
    }) => {
      setWaitingList((prev) =>
        prev.some((w) => w.requestId === payload.requestId) ? prev : [...prev, payload],
      );
      setShowParticipants(true);
      addToast(`${payload.name} is waiting to join`);
    };
    const onResolved = (payload: { requestId: string }) => {
      setWaitingList((prev) => prev.filter((w) => w.requestId !== payload.requestId));
    };
    socket.on('waiting-join-request', onRequest);
    socket.on('waiting-request-resolved', onResolved);
    socket.emit('list-waiting', { roomId }, (res: { waiting?: typeof waitingList } | undefined) => {
      if (res?.waiting) setWaitingList(res.waiting);
    });
    return () => {
      socket.off('waiting-join-request', onRequest);
      socket.off('waiting-request-resolved', onResolved);
    };
  }, [socket, joined, isHost, roomId, addToast]);

  const handleAdmitWaiting = (requestId: string) => {
    socket?.emit('admit-waiting', { roomId, requestId }, (res: { error?: string } | undefined) => {
      if (res?.error) addToast(res.error);
    });
  };
  const handleDenyWaiting = (requestId: string) => {
    socket?.emit('deny-waiting', { roomId, requestId }, (res: { error?: string } | undefined) => {
      if (res?.error) addToast(res.error);
    });
  };

  const handleToggleMute = async () => {
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('microphone')) {
      if (isMuted) await sess.resumeProducer(p.id);
      else await sess.pauseProducer(p.id);
    }
    setIsMuted((m) => !m);
  };

  const handleToggleCamera = async () => {
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('camera')) {
      if (isCameraOff) await sess.resumeProducer(p.id);
      else await sess.pauseProducer(p.id);
    }
    setIsCameraOff((c) => !c);
  };

  const handleShareScreen = async () => {
    try {
      const sess = session.current;
      if (!sess) {
        addToast('Still connecting — try again in a moment');
        return;
      }
      if (screenStream) {
        stopScreenShare();
        for (const p of sess.getProducersBySource('screen')) await sess.closeProducer(p.id);
        return;
      }
      if (someoneElseSharing) {
        addToast('Someone else is already sharing their screen');
        return;
      }
      for (const p of sess.getProducersBySource('screen')) await sess.closeProducer(p.id);
      const stream = await startScreenShare();
      if (!stream) return;
      for (const track of stream.getVideoTracks()) {
        const producer = await sess.produce(track, 'screen');
        track.addEventListener('ended', () => {
          void sess.closeProducer(producer.id);
          stopScreenShare();
        });
      }
      addToast('You are sharing your screen');
    } catch {
      addToast('Screen share failed');
    }
  };

  const handleStopScreenShare = async () => {
    stopScreenShare();
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('screen')) await sess.closeProducer(p.id);
  };

  const handleToggleWhiteboard = () => {
    if (whiteboardOpen) {
      if (isOpener()) announceClose();
      else addToast('Only the person who opened the whiteboard can close it for everyone');
      return;
    }
    announceOpen();
  };

  /** Leave only yourself — does not end the live meeting. */
  const handleLeave = async () => {
    allowLeaveRef.current = true;
    if (isRecording) {
      try { await stopRecording(); } catch { /* ignore */ }
    }
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    await leaveMeeting();
    navigate('/app/meetings');
  };

  /** Host ends live for everyone. */
  const handleEndMeeting = async () => {
    if (!isHost) {
      addToast('Only the host can end the meeting for everyone');
      return;
    }
    socket?.emit('end-meeting', { roomId }, (res: { error?: string } | undefined) => {
      if (res?.error) addToast(res.error);
    });
    if (meetingMeta?.id && activeWorkspace?.workspaceId) {
      try {
        await meetingsService.end(activeWorkspace.workspaceId, meetingMeta.id);
      } catch {
        // socket path is primary
      }
    }
    await handleLeave();
  };

  const confirmBlockedLeave = async () => {
    setLeavePromptOpen(false);
    await handleLeave();
  };

  const cancelBlockedLeave = () => {
    setLeavePromptOpen(false);
  };

  const remoteHandlers: CommandHandlerMap = {
    OPEN_CHAT: () => {
      setShowChat(true);
      setShowParticipants(false);
    },
    CLOSE_CHAT: () => setShowChat(false),
    OPEN_PARTICIPANTS: () => {
      setShowParticipants(true);
      setShowChat(false);
    },
    CLOSE_PARTICIPANTS: () => setShowParticipants(false),
    TOGGLE_CHAT_PANEL: () => {
      setShowChat((v) => !v);
      setShowParticipants(false);
    },
    TOGGLE_PARTICIPANTS_PANEL: () => {
      setShowParticipants((v) => !v);
      setShowChat(false);
    },
    TOGGLE_MUTE: () => {
      void handleToggleMute();
    },
    TOGGLE_CAMERA: () => {
      void handleToggleCamera();
    },
    START_SCREEN_SHARE: () => {
      if (!screenStream) setPendingRemoteShare(true);
    },
    STOP_SCREEN_SHARE: () => {
      setPendingRemoteShare(false);
      void handleStopScreenShare();
    },
    RAISE_HAND: () => setRaiseHand(true),
    LOWER_HAND: () => setRaiseHand(false),
    SEND_CHAT: (payload) => {
      const text = typeof payload.content === 'string' ? payload.content.trim() : '';
      if (!text || chatDisabled) return;
      socket?.emit('send-message', { roomId, content: text });
    },
    SEND_REACTION: (payload) => {
      if (typeof payload.reaction === 'string') sendReaction(payload.reaction);
    },
  };

  const remoteControl = useRemoteControl({
    socket,
    roomId,
    localParticipantId: participantId,
    handlers: remoteHandlers,
    addToast,
  });

  useMeetingModeration(socket, {
    onMute: async () => {
      const sess = session.current;
      if (!sess) return;
      for (const p of sess.getProducersBySource('microphone')) await sess.pauseProducer(p.id);
      setIsMuted(true);
    },
    onUnmute: async () => {
      const sess = session.current;
      if (!sess) return;
      for (const p of sess.getProducersBySource('microphone')) await sess.resumeProducer(p.id);
      setIsMuted(false);
    },
    onCameraOff: async () => {
      const sess = session.current;
      if (!sess) return;
      for (const p of sess.getProducersBySource('camera')) await sess.pauseProducer(p.id);
      setIsCameraOff(true);
    },
    onCameraOn: async () => {
      const sess = session.current;
      if (!sess) return;
      for (const p of sess.getProducersBySource('camera')) await sess.resumeProducer(p.id);
      setIsCameraOff(false);
    },
    onDisableChat: () => setChatDisabled(true),
    onEnableChat: () => setChatDisabled(false),
    onKick: () => void handleLeave(),
    addToast,
  });

  const handleParticipantAction = useCallback(
    async (targetId: string, action: ParticipantModerationAction) => {
      if (action === 'request-control') {
        void remoteControl.requestControl(targetId);
        return;
      }
      if (!isHostViewer) {
        addToast('Only the host can moderate participants');
        return;
      }
      try {
        await emitHostModerate(socket, roomId, targetId, action);
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Action failed');
      }
    },
    [remoteControl, isHostViewer, socket, roomId, addToast],
  );

  const tiles: LiveParticipant[] = useMemo(() => {
    const local: LiveParticipant = {
      id: participantId || 'local',
      name: effectiveName || 'You',
      stream: screenStream || localStream,
      isYou: true,
      isMuted,
      isCameraOff: screenStream ? false : isCameraOff,
      isHandRaised: raisedHands.has(participantId),
      avatarUrl: user?.avatarUrl ?? null,
      avatarColor: user?.avatarColor ?? null,
      isScreenShare: !!screenStream,
    };
    const remotes: LiveParticipant[] = peers.map((p) => {
      const remote = remoteStreams.get(p.id);
      const showingScreen = Boolean(remote?.screen?.getVideoTracks().length);
      return {
        id: p.id,
        name: p.name,
        stream: showingScreen ? remote!.screen : remote?.camera || null,
        audioStream: remote?.audio || null,
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff && !showingScreen,
        isHandRaised: raisedHands.has(p.id),
        avatarUrl: p.avatarUrl,
        avatarColor: p.avatarColor,
        isScreenShare: showingScreen,
      };
    });
    return [local, ...remotes];
  }, [participantId, effectiveName, user?.avatarUrl, user?.avatarColor, localStream, screenStream, isMuted, isCameraOff, peers, remoteStreams, raisedHands]);

  const panelPeople = useMemo(
    () =>
      tiles.map((t) => {
        const peer = peers.find((p) => p.id === t.id);
        const host =
          (t.isYou && isHost) ||
          (!!peer?.userId && !!creatorId && peer.userId === creatorId) ||
          peer?.isHost;
        return {
          id: t.id,
          name: t.name,
          role: host ? 'Host' : t.isYou ? 'You' : 'Participant',
          muted: t.isMuted,
          isYou: t.isYou,
          avatarUrl: t.avatarUrl,
          avatarColor: t.avatarColor,
        };
      }),
    [tiles, peers, isHost, creatorId],
  );

  const peerNames = useMemo(() => {
    const m = new Map<string, string>();
    if (participantId) m.set(participantId, effectiveName);
    peers.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [participantId, effectiveName, peers]);

  const screenSharerId = useMemo(() => {
    if (screenStream && participantId) return participantId;
    for (const p of peers) {
      const remote = remoteStreams.get(p.id);
      if (remote?.screen?.getVideoTracks().length) return p.id;
    }
    return null;
  }, [screenStream, participantId, peers, remoteStreams]);

  const someoneElseSharing = Boolean(
    !screenStream &&
      peers.some((p) => {
        const remote = remoteStreams.get(p.id);
        return Boolean(remote?.screen?.getVideoTracks().length);
      }),
  );

  const panelOpen = showParticipants || showChat;
  const meetingTitle = meetingMeta?.title?.trim() || `Meeting ${roomId}`;
  const isGuestJoin = !user;

  if (!joined) {
    return (
      <MeetingPreJoinScreen
        roomId={roomId}
        userName={displayName}
        onUserNameChange={setDisplayName}
        nameEditable
        requireName={isGuestJoin || !displayName.trim()}
        guestEmail={guestEmail}
        onGuestEmailChange={setGuestEmail}
        requireGuestEmail={isGuestJoin}
        avatarUrl={user?.avatarUrl}
        avatarColor={user?.avatarColor}
        localStream={localStream}
        isJoining={isJoining}
        isWaiting={waiting}
        isHostJoining={Boolean(user?.id && meetingMeta?.createdBy === user.id)}
        joinError={joinError}
        onJoin={() => void handleJoin()}
        onCancelWaiting={() => void leaveMeeting()}
        onBack={() => navigate(user ? '/app/meetings' : '/')}
        title={meetingTitle}
      />
    );
  }

  return (
    <div ref={stageRef} data-room-id={roomId} className="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <div
        className={cn(
          'grid min-h-0 flex-1 gap-3 overflow-hidden',
          panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1',
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <MeetingRoomHeader
                title={meetingTitle}
                participantCount={tiles.length}
                roomId={roomId}
                isHost={isHost}
                onLeave={() => void handleLeave()}
              />
            </div>
            {remoteControl.session ? (
              <RemoteControlBanner
                session={remoteControl.session}
                viewMode={remoteControl.viewMode}
                onStop={() => void remoteControl.stop()}
                onSwitchView={
                  remoteControl.session.role === 'controlling'
                    ? (view) => void remoteControl.switchView(view)
                    : undefined
                }
              />
            ) : null}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[#E8ECF1] bg-[#F8FAFC]">
            {whiteboardOpen && socket ? (
              <WhiteboardStage
                socket={socket}
                roomId={roomId}
                participantId={participantId}
                userName={effectiveName}
                onClose={() => {
                  if (isOpener()) announceClose();
                  else addToast('Only the person who opened the whiteboard can close it for everyone');
                }}
                addToast={addToast}
              />
            ) : (
              <>
            <div className="h-full overflow-hidden">
              {screenSharerId ? (
              <div className="flex h-full flex-col gap-2.5 p-2.5">
                {(() => {
                  const screenTile = tiles.find((t) => t.id === screenSharerId);
                  const others = tiles.filter((t) => t.id !== screenSharerId);
                  if (!screenTile) return null;
                  return (
                    <>
                      <VideoTile
                        participant={screenTile}
                        isScreenShare
                        className="min-h-[200px] flex-1"
                      />
                      {others.length > 0 ? (
                        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                          {others.map((p) => (
                            <VideoTile
                              key={p.id}
                              participant={p}
                              isScreenShare={p.isScreenShare}
                              className="h-24 w-36 shrink-0 sm:h-28 sm:w-44"
                            />
                          ))}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div
                className={cn(
                  'grid h-full gap-2.5 p-2.5',
                  tiles.length <= 1 && 'grid-cols-1',
                  tiles.length === 2 && 'grid-cols-1 sm:grid-cols-2',
                  tiles.length >= 3 && tiles.length <= 4 && 'grid-cols-2 grid-rows-2',
                  tiles.length > 4 && 'grid-cols-2 md:grid-cols-3',
                )}
              >
                {tiles.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    isScreenShare={p.isScreenShare}
                    className="min-h-[140px] h-full w-full"
                  />
                ))}
              </div>
            )}
            </div>

            <ReactionOverlay
              reactions={activeReactions}
              peerNames={peerNames}
              ownParticipantId={participantId}
              ownUserName={effectiveName}
            />
              </>
            )}
          </div>

          <ConferenceControlBar
            muted={isMuted}
            cameraOff={isCameraOff}
            handRaised={raisedHands.has(participantId)}
            sharing={!!screenStream}
            recording={isRecording}
            recordingBusy={isRecordingBusy}
            whiteboardOpen={whiteboardOpen}
            participantsOpen={showParticipants}
            chatOpen={showChat}
            canEndMeeting={isHost}
            canRecord={isHost}
            shareDisabled={someoneElseSharing}
            shareDisabledReason="Someone else is sharing"
            onToggleMute={() => void handleToggleMute()}
            onToggleCamera={() => void handleToggleCamera()}
            onToggleHand={() => toggleRaiseHand()}
            onToggleShare={() => void handleShareScreen()}
            onToggleRecording={
              isHost
                ? isRecording
                  ? () => void stopRecording()
                  : () => void startRecording()
                : undefined
            }
            onToggleWhiteboard={handleToggleWhiteboard}
            onToggleParticipants={() => {
              setShowParticipants((open) => {
                const next = !open;
                if (next) setShowChat(false);
                return next;
              });
            }}
            onToggleChat={() => {
              setShowChat((open) => {
                const next = !open;
                if (next) setShowParticipants(false);
                return next;
              });
            }}
            onSendReaction={sendReaction}
            onLeave={() => void handleLeave()}
            onEndCall={() => void handleEndMeeting()}
            userName={effectiveName}
          />
        </div>

        {panelOpen ? (
          <aside className="hidden min-h-0 flex-col overflow-hidden xl:flex">
            {showParticipants ? (
              <ParticipantsPanel
                participants={panelPeople}
                waiting={waitingList}
                isHostViewer={isHostViewer}
                remoteControlPendingId={
                  remoteControl.outgoingStatus === 'sent' ? remoteControl.outgoingTargetId : null
                }
                onParticipantAction={(id, action) => void handleParticipantAction(id, action)}
                onAdmitWaiting={handleAdmitWaiting}
                onDenyWaiting={handleDenyWaiting}
                onClose={() => setShowParticipants(false)}
              />
            ) : null}
            {showChat ? (
              <MeetingChatPanel
                roomId={roomId}
                peerId={participantId}
                userId={effectiveUserId ?? ''}
                userName={effectiveName}
                chatDisabled={chatDisabled}
                onClose={() => setShowChat(false)}
              />
            ) : null}
          </aside>
        ) : null}
      </div>

      {panelOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[55vh] flex-col border-t border-[#E1E7EE] bg-white p-3 xl:hidden">
          {showParticipants ? (
            <ParticipantsPanel
              participants={panelPeople}
              waiting={waitingList}
              isHostViewer={isHostViewer}
              remoteControlPendingId={
                remoteControl.outgoingStatus === 'sent' ? remoteControl.outgoingTargetId : null
              }
              onParticipantAction={(id, action) => void handleParticipantAction(id, action)}
              onAdmitWaiting={handleAdmitWaiting}
              onDenyWaiting={handleDenyWaiting}
              onClose={() => setShowParticipants(false)}
            />
          ) : null}
          {showChat ? (
            <MeetingChatPanel
              roomId={roomId}
              peerId={participantId}
              userId={effectiveUserId ?? ''}
              userName={effectiveName}
              chatDisabled={chatDisabled}
              onClose={() => setShowChat(false)}
            />
          ) : null}
        </div>
      ) : null}

      {leavePromptOpen ? (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/45 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-meeting-title"
            className="w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-2xl"
          >
            <h2 id="leave-meeting-title" className="text-[16px] font-bold text-[#151D2B]">
              Leave this meeting?
            </h2>
            <p className="mt-2 text-[13px] text-[#6F7B8C]">
              You are still in the live call. Confirm to leave, or stay to continue the meeting.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={cancelBlockedLeave}
                className="h-10 rounded-xl border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                Stay in meeting
              </button>
              <button
                type="button"
                onClick={() => void confirmBlockedLeave()}
                className="h-10 rounded-xl bg-[#DC2626] px-4 text-[12px] font-semibold text-white hover:bg-[#B91C1C]"
              >
                Leave meeting
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {remoteControl.incoming ? (
        <ControlRequestDialog
          request={remoteControl.incoming}
          roomId={roomId}
          onAccept={() => void remoteControl.accept()}
          onDecline={() => void remoteControl.decline()}
        />
      ) : null}

      {pendingRemoteShare ? (
        <div className="fixed top-16 left-1/2 z-[55] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl border border-[#BFDBFE] bg-white px-4 py-3 shadow-2xl">
          <div className="flex items-start gap-3">
            <MonitorUp className="mt-0.5 size-[18px] shrink-0 text-[#016BE6]" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#151D2B]">Share your screen?</p>
              <p className="mt-0.5 text-[11px] text-[#6F7B8C]">
                Someone controlling your meeting asked to present. Choose a window or screen on your device.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingRemoteShare(false);
                    void handleShareScreen();
                  }}
                  className="rounded-lg bg-[#016BE6] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#0056EF]"
                >
                  Choose screen
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRemoteShare(false)}
                  className="rounded-lg border border-[#E1E7EE] px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed top-3 left-1/2 z-[10000] flex -translate-x-1/2 flex-wrap justify-center gap-2 px-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-full border border-[#E8ECF1] bg-white px-4 py-2 text-[12px] text-[#151D2B] shadow-lg">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
