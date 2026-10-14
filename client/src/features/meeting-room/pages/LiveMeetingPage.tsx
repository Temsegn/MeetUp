import { API_URL } from '../../../lib/apiUrl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MonitorUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAccessToken } from '../../../services/auth/auth.service';
import { meetingsService, type Meeting } from '../../../services/meetings/meetings.service';
import { useLiveMeetingShell } from '../../dashboard/layouts/LiveMeetingShellContext';
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
import { MeetingVideoGrid } from '../components/MeetingVideoGrid';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeWorkspace } = useAuth();
  const meetingShell = useLiveMeetingShell();
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [guestEmail, setGuestEmail] = useState(() => {
    const fromQuery = searchParams.get('email')?.trim().toLowerCase() ?? '';
    return fromQuery;
  });
  const guestEmailLocked = Boolean(searchParams.get('email')?.trim());
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [waitingList, setWaitingList] = useState<
    { requestId: string; name: string; avatarUrl?: string | null; avatarColor?: string | null; isGuest?: boolean }[]
  >([]);

  const [meetingMeta, setMeetingMeta] = useState<Meeting | null>(null);
  const [joinGate, setJoinGate] = useState<{
    joinable: boolean;
    title: string;
    message: string | null;
    code: string | null;
    status: string;
  } | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  // Start collapsed — xl side rail stays visible; panels expand on demand.
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [pendingRemoteShare, setPendingRemoteShare] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmailDraft, setInviteEmailDraft] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [recordingTick, setRecordingTick] = useState(Date.now());
  const stageRef = useRef<HTMLDivElement | null>(null);
  const publishedTrackIdsRef = useRef<Set<string>>(new Set());
  /** When true, navigation/leave is intentional (Leave / End / host ended). */
  const allowLeaveRef = useRef(false);

  const addToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    meetingsService
      .getJoinStatus(roomId)
      .then((s) => {
        if (cancelled) return;
        setJoinGate({
          joinable: s.joinable,
          title: s.title,
          message: s.message,
          code: s.code,
          status: s.status,
        });
      })
      .catch(() => {
        if (!cancelled) setJoinGate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

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
          return;
        }
        if (m.status === 'ended') {
          setJoinGate({
            joinable: false,
            title: m.title || 'Meeting',
            message: 'This meeting has ended.',
            code: 'MEETING_ENDED',
            status: 'ended',
          });
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
    rejoinMeeting,
    connectionState,
    recoveryOutcome,
    rejoinBusy,
    mediaEpoch,
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

  const { localStream, screenStream, startLocalMedia, startScreenShare, stopScreenShare, error: mediaError } =
    useLocalMedia();
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
    recordingStartedAt,
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
    void startLocalMedia().catch(() => {});
  }, [startLocalMedia]);

  useEffect(() => {
    if (!socket) return;
    const onEnded = (payload?: { reason?: string }) => {
      addToast(
        payload?.reason === 'duration'
          ? 'This meeting has ended. The scheduled time has passed.'
          : 'Host ended the meeting',
      );
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
        throw mediaError ?? new Error(
          'Could not access camera or microphone. Click Allow camera and microphone, then choose Allow in the browser prompt.',
        );
      }
      await joinMeeting(token);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join. Is the backend running?');
    } finally {
      setIsJoining(false);
    }
  };

  // After admitted / host join / media recovery — publish local media (once per track id per epoch)
  useEffect(() => {
    if (!joined) {
      publishedTrackIdsRef.current.clear();
      return;
    }
    // New MediaSession after reconnect — allow republish of the same track ids.
    publishedTrackIdsRef.current.clear();
    const sess = session.current;
    const stream = localStream;
    if (!sess || !stream) return;
    void (async () => {
      try {
        for (const track of stream.getAudioTracks()) {
          if (publishedTrackIdsRef.current.has(track.id)) continue;
          publishedTrackIdsRef.current.add(track.id);
          try {
            const producer = await sess.produce(track, 'microphone');
            // Preserve user mute preference across recovery.
            if (isMuted && producer) {
              await sess.pauseProducer(producer.id);
            }
          } catch (err) {
            publishedTrackIdsRef.current.delete(track.id);
            throw err;
          }
        }
        for (const track of stream.getVideoTracks()) {
          if (publishedTrackIdsRef.current.has(track.id)) continue;
          publishedTrackIdsRef.current.add(track.id);
          try {
            const producer = await sess.produce(track, 'camera', true);
            if (isCameraOff && producer) {
              await sess.pauseProducer(producer.id);
            }
          } catch (err) {
            publishedTrackIdsRef.current.delete(track.id);
            throw err;
          }
        }
      } catch {
        addToast('Could not publish camera/microphone');
      }
    })();
    // mediaEpoch intentionally included so soft reconnect republishes on a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isMuted/isCameraOff applied at publish time only
  }, [joined, localStream, session, addToast, mediaEpoch]);

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
  const handleLeave = async (destination?: string) => {
    allowLeaveRef.current = true;
    if (isRecording) {
      try { await stopRecording(); } catch { /* ignore */ }
    }
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    await leaveMeeting();
    navigate(destination ?? (user ? '/app/meetings' : '/'));
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

  // Sidebar / shell asked to leave the live call before navigating away.
  useEffect(() => {
    if (!joined) return;
    const onRequestLeave = (event: Event) => {
      const to = (event as CustomEvent<{ to?: string }>).detail?.to;
      void handleLeave(to);
    };
    window.addEventListener('samtal:request-leave-meeting', onRequestLeave);
    return () => window.removeEventListener('samtal:request-leave-meeting', onRequestLeave);
    // handleLeave identity changes often; listen while joined.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, user]);

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
      const showingScreen = Boolean(remote?.screen?.getVideoTracks().some((t) => t.readyState !== 'ended'));
      const cameraHasVideo = Boolean(
        remote?.camera?.getVideoTracks().some((t) => t.readyState !== 'ended'),
      );
      // Only hide when the peer explicitly paused camera. Missing tracks mean
      // "still loading / no RTP yet", not camera-off.
      const resolvedCameraOff = showingScreen
        ? false
        : p.isCameraOff === true;
      return {
        id: p.id,
        name: p.name,
        stream: showingScreen ? remote!.screen : cameraHasVideo ? remote!.camera : null,
        audioStream: remote?.audio || null,
        isMuted: p.isMuted === true,
        isCameraOff: resolvedCameraOff,
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

  useEffect(() => {
    if (!isRecording || !recordingStartedAt) return;
    const id = window.setInterval(() => setRecordingTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRecording, recordingStartedAt]);

  // Controlled peer publishes UI state so the controller mirrors mute/camera/hand/share.
  useEffect(() => {
    if (remoteControl.session?.role !== 'controlled') return;
    remoteControl.publishUiState({
      version: Date.now(),
      sidebar: showChat ? 'chat' : showParticipants ? 'participants' : null,
      layout: screenStream ? 'presentation' : 'gallery',
      selectedParticipantId: null,
      isMuted,
      isCameraOff,
      isSharingScreen: Boolean(screenStream),
      isHandRaised: raisedHands.has(participantId),
      chatDraft: '',
      showAllParticipants: showParticipants,
      scrollTop: 0,
      whiteboardOpen,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    remoteControl.session?.role,
    remoteControl.session?.sessionId,
    isMuted,
    isCameraOff,
    screenStream,
    raisedHands,
    participantId,
    showChat,
    showParticipants,
    whiteboardOpen,
  ]);

  const sendGuestInvite = async () => {
    if (!isHost || !activeWorkspace?.workspaceId || !meetingMeta?.id) return;
    const email = inviteEmailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInviteBusy(true);
    setInviteError(null);
    try {
      const updated = await meetingsService.addParticipants(
        activeWorkspace.workspaceId,
        meetingMeta.id,
        { guestEmails: [email] },
      );
      setMeetingMeta(updated);
      setInviteEmailDraft('');
      setInviteOpen(false);
      addToast(`Invitation sent to ${email}`);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  const peerNames = useMemo(() => {
    const m = new Map<string, string>();
    if (participantId) m.set(participantId, effectiveName);
    peers.forEach((p) => m.set(p.id, p.name));
    if (remoteControl.session?.controlledUserId && remoteControl.session.controlledName) {
      m.set(remoteControl.session.controlledUserId, remoteControl.session.controlledName);
    }
    return m;
  }, [
    participantId,
    effectiveName,
    peers,
    remoteControl.session?.controlledUserId,
    remoteControl.session?.controlledName,
  ]);

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
  const meetingTitle = joinGate?.title?.trim() || meetingMeta?.title?.trim() || `Meeting ${roomId}`;
  const isGuestJoin = !user;

  const controllingRemote =
    remoteControl.session?.role === 'controlling' && remoteControl.viewMode === 'remote';
  const controllingSelf =
    remoteControl.session?.role === 'controlling' && remoteControl.viewMode === 'self';
  const controlledPeerId = remoteControl.session?.controlledUserId ?? null;
  const controlledPeerName = remoteControl.session?.controlledName ?? null;

  /** Whose stage is in focus during remote control (or screen share otherwise). */
  const focusTileId = controllingRemote
    ? controlledPeerId
    : controllingSelf
      ? participantId
      : screenSharerId;

  const stageNameLabel = controllingRemote
    ? controlledPeerName
    : controllingSelf
      ? 'Me'
      : focusTileId
        ? focusTileId === participantId
          ? 'Me'
          : tiles.find((t) => t.id === focusTileId)?.name ?? null
        : null;

  const labeledTiles = useMemo(
    () =>
      tiles.map((t) => ({
        ...t,
        labelOverride:
          t.id === participantId
            ? 'Me'
            : controllingRemote && t.id === controlledPeerId
              ? controlledPeerName
              : null,
      })),
    [tiles, participantId, controllingRemote, controlledPeerId, controlledPeerName],
  );

  if (!joined && joinGate && !joinGate.joinable) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[#F5F7FA] px-6 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Samhal</p>
        <h1 className="mt-3 text-xl font-semibold text-[#151D2B]">{meetingTitle}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#64748B]">
          {joinGate.message ||
            (joinGate.code === 'MEETING_CANCELLED'
              ? 'This meeting was cancelled.'
              : 'This meeting has ended. The scheduled time has passed.')}
        </p>
        <button
          type="button"
          onClick={() => navigate(user ? '/app/meetings' : '/')}
          className="mt-8 inline-flex h-10 items-center justify-center rounded-full bg-[#016BE6] px-5 text-sm font-semibold text-white hover:bg-[#0059C4]"
        >
          {user ? 'Back to meetings' : 'Back to home'}
        </button>
      </div>
    );
  }

  if (!joined) {
    return (
      <MeetingPreJoinScreen
        roomId={roomId}
        userName={displayName}
        onUserNameChange={setDisplayName}
        nameEditable
        requireName={isGuestJoin || !displayName.trim()}
        guestEmail={guestEmail}
        onGuestEmailChange={guestEmailLocked ? undefined : setGuestEmail}
        guestEmailLocked={guestEmailLocked}
        requireGuestEmail={isGuestJoin}
        avatarUrl={user?.avatarUrl}
        avatarColor={user?.avatarColor}
        localStream={localStream}
        mediaError={mediaError?.message ?? null}
        onRequestMedia={() => void startLocalMedia().catch(() => {})}
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
    <div
      ref={stageRef}
      data-room-id={roomId}
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden bg-[#F7F9FC]"
    >
      {connectionState === 'reconnecting' || connectionState === 'failed' ? (
        <div
          role="status"
          className={
            connectionState === 'failed'
              ? 'flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-[13px] text-[#991B1B] sm:px-4'
              : 'flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[13px] text-[#92400E] sm:px-4'
          }
        >
          <span className="min-w-0 font-semibold">
            {connectionState === 'reconnecting'
              ? 'Reconnecting… Stay on this page. Your admission is saved.'
              : recoveryOutcome === 'auth_denied'
                ? 'You no longer have access to this meeting.'
                : recoveryOutcome === 'meeting_ended'
                  ? 'This meeting has ended.'
                  : 'Connection lost. You can rejoin the meeting.'}
          </span>
          {connectionState === 'failed' &&
          recoveryOutcome !== 'auth_denied' &&
          recoveryOutcome !== 'meeting_ended' ? (
            <button
              type="button"
              disabled={rejoinBusy}
              onClick={() => void rejoinMeeting()}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-[#016BE6] px-4 text-[12px] font-bold text-white shadow-sm hover:bg-[#0056EF] disabled:opacity-60"
            >
              {rejoinBusy ? 'Rejoining…' : 'Rejoin meeting'}
            </button>
          ) : null}
        </div>
      ) : null}
      {/* Band 1 — compact header (overflow visible so invite/copy menu is not clipped) */}
      <header className="relative z-40 flex shrink-0 items-center gap-2 overflow-visible px-2 pt-2 sm:gap-3 sm:px-4 sm:pt-3 lg:px-5">
        <div className="relative z-40 min-w-0 flex-1 overflow-visible">
          <MeetingRoomHeader
            title={meetingTitle}
            participantCount={tiles.length}
            roomId={roomId}
            isHost={isHost}
            scheduledAt={meetingMeta?.scheduledAt}
            durationMinutes={meetingMeta?.duration}
            startedAt={meetingMeta?.startedAt}
            recording={isHost && isRecording}
            recordingElapsedMs={
              isRecording && recordingStartedAt
                ? Math.max(0, recordingTick - recordingStartedAt)
                : 0
            }
            userName={effectiveName}
            avatarUrl={user?.avatarUrl}
            avatarColor={user?.avatarColor}
            onLeave={() => setLeavePromptOpen(true)}
            onOpenAppMenu={meetingShell?.openMobileNav}
            onOpenParticipants={() => {
              setShowChat(false);
              setShowParticipants(true);
            }}
            onInviteByEmail={
              isHost
                ? () => {
                    setInviteError(null);
                    setInviteOpen(true);
                  }
                : undefined
            }
          />
        </div>
        {remoteControl.session ? (
          <div className="hidden min-w-0 shrink sm:block">
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
          </div>
        ) : null}
      </header>
      {remoteControl.session ? (
        <div className="shrink-0 px-2 pt-1 sm:hidden">
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
        </div>
      ) : null}

      {/* Band 2 — video/whiteboard (+ chat/participants panel on xl when open) */}
      <div
        className={cn(
          'grid min-h-0 min-w-0 flex-1 gap-2 overflow-hidden overflow-x-hidden px-2 pt-1.5 sm:gap-3 sm:px-4 sm:pt-2 lg:px-5',
          panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]' : 'grid-cols-1',
        )}
      >
        <div className="relative min-h-0 min-w-0 overflow-hidden rounded-xl bg-[#EEF2F7] sm:rounded-2xl">
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
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-1 sm:p-2">
                {stageNameLabel ? (
                  <div className="mb-1 flex shrink-0 items-center gap-2 px-0.5 sm:mb-1.5">
                    <p className="truncate text-[12px] font-semibold text-[#121B29] sm:text-[13px]">
                      {stageNameLabel}
                    </p>
                    {controllingRemote ? (
                      <span className="shrink-0 rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[10px] font-semibold text-[#016BE6]">
                        Controlling
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {focusTileId ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
                    {(() => {
                      const focusTile = labeledTiles.find((t) => t.id === focusTileId);
                      const others = labeledTiles.filter((t) => t.id !== focusTileId);
                      if (!focusTile) return null;
                      return (
                        <>
                          <VideoTile
                            participant={focusTile}
                            isScreenShare={
                              focusTile.isScreenShare || Boolean(screenSharerId === focusTileId)
                            }
                            className="min-h-0 min-w-0 flex-1"
                          />
                          {others.length > 0 ? (
                            <div className="flex min-w-0 shrink-0 gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none">
                              {others.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="shrink-0"
                                  onClick={() => {
                                    if (
                                      !remoteControl.session ||
                                      remoteControl.session.role !== 'controlling'
                                    ) {
                                      return;
                                    }
                                    if (p.id === participantId) {
                                      void remoteControl.switchView('self');
                                    } else if (p.id === controlledPeerId) {
                                      void remoteControl.switchView('remote');
                                    }
                                  }}
                                >
                                  <VideoTile
                                    participant={p}
                                    isScreenShare={p.isScreenShare}
                                    className="h-20 w-28 sm:h-28 sm:w-44"
                                  />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <MeetingVideoGrid
                    tiles={labeledTiles}
                    onOpenParticipants={() => {
                      setShowChat(false);
                      setShowParticipants(true);
                    }}
                  />
                )}
              </div>

              <ReactionOverlay
                reactions={activeReactions}
                peerNames={peerNames}
                ownParticipantId={participantId}
                ownUserName={
                  controllingRemote && controlledPeerName ? controlledPeerName : effectiveName
                }
              />
            </>
          )}
        </div>

        {panelOpen ? (
          <aside className="hidden min-h-0 min-w-0 flex-col gap-3 overflow-hidden xl:flex">
            {showParticipants ? (
              <div className={cn('min-h-0', showChat ? 'flex-[0.55]' : 'flex-1')}>
                <ParticipantsPanel
                  participants={panelPeople}
                  waiting={waitingList}
                  isHostViewer={isHostViewer}
                  remoteControlPendingId={
                    remoteControl.outgoingStatus === 'sent'
                      ? remoteControl.outgoingTargetId
                      : null
                  }
                  onParticipantAction={(id, action) => void handleParticipantAction(id, action)}
                  onAdmitWaiting={handleAdmitWaiting}
                  onDenyWaiting={handleDenyWaiting}
                  onClose={() => setShowParticipants(false)}
                />
              </div>
            ) : null}
            {showChat ? (
              <div className={cn('min-h-0', showParticipants ? 'flex-[0.45]' : 'flex-1')}>
                <MeetingChatPanel
                  roomId={roomId}
                  peerId={participantId}
                  userId={effectiveUserId ?? ''}
                  userName={effectiveName}
                  chatDisabled={chatDisabled && !controllingRemote}
                  actingAsName={controllingRemote ? controlledPeerName : null}
                  onSendOverride={
                    controllingRemote
                      ? (text) => {
                          void remoteControl.sendAction('SEND_CHAT', { content: text });
                        }
                      : undefined
                  }
                  onClose={() => setShowChat(false)}
                />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* Band 3 — controls always at bottom; overflow visible so More menu can open upward */}
      <div className="sticky bottom-0 z-50 shrink-0 overflow-visible border-t border-[#E8ECF1]/80 bg-[#F7F9FC]/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-4 sm:pt-2 lg:px-5">
        <ConferenceControlBar
          muted={
            controllingRemote ? Boolean(remoteControl.remoteUiState?.isMuted) : isMuted
          }
          cameraOff={
            controllingRemote
              ? Boolean(remoteControl.remoteUiState?.isCameraOff)
              : isCameraOff
          }
          handRaised={
            controllingRemote
              ? Boolean(remoteControl.remoteUiState?.isHandRaised)
              : raisedHands.has(participantId)
          }
          sharing={
            controllingRemote
              ? Boolean(remoteControl.remoteUiState?.isSharingScreen)
              : !!screenStream
          }
          recording={isRecording}
          recordingBusy={isRecordingBusy}
          whiteboardOpen={whiteboardOpen}
          participantsOpen={showParticipants}
          chatOpen={showChat}
          canEndMeeting={isHost && !controllingRemote}
          canRecord={isHost && !controllingRemote}
          shareDisabled={someoneElseSharing && !controllingRemote}
          shareDisabledReason="Someone else is sharing"
          onToggleMute={
            controllingRemote
              ? () => void remoteControl.sendAction('TOGGLE_MUTE')
              : () => void handleToggleMute()
          }
          onToggleCamera={
            controllingRemote
              ? () => void remoteControl.sendAction('TOGGLE_CAMERA')
              : () => void handleToggleCamera()
          }
          onToggleHand={
            controllingRemote
              ? () =>
                  void remoteControl.sendAction(
                    remoteControl.remoteUiState?.isHandRaised ? 'LOWER_HAND' : 'RAISE_HAND',
                  )
              : () => toggleRaiseHand()
          }
          onToggleShare={
            controllingRemote
              ? () =>
                  void remoteControl.sendAction(
                    remoteControl.remoteUiState?.isSharingScreen
                      ? 'STOP_SCREEN_SHARE'
                      : 'START_SCREEN_SHARE',
                  )
              : () => void handleShareScreen()
          }
          onToggleRecording={
            isHost && !controllingRemote
              ? isRecording
                ? () => void stopRecording()
                : () => void startRecording()
              : undefined
          }
          onToggleWhiteboard={
            controllingRemote ? () => undefined : handleToggleWhiteboard
          }
          onToggleParticipants={
            controllingRemote
              ? () => {
                  const next = !showParticipants;
                  setShowParticipants(next);
                  if (next) setShowChat(false);
                  void remoteControl.sendAction(
                    next ? 'OPEN_PARTICIPANTS' : 'CLOSE_PARTICIPANTS',
                  );
                }
              : () => {
                  setShowParticipants((open) => {
                    const next = !open;
                    if (next) setShowChat(false);
                    return next;
                  });
                }
          }
          onToggleChat={
            controllingRemote
              ? () => {
                  const next = !showChat;
                  setShowChat(next);
                  if (next) setShowParticipants(false);
                  void remoteControl.sendAction(next ? 'OPEN_CHAT' : 'CLOSE_CHAT');
                }
              : () => {
                  setShowChat((open) => {
                    const next = !open;
                    if (next) setShowParticipants(false);
                    return next;
                  });
                }
          }
          onSendReaction={
            controllingRemote
              ? (emoji) => void remoteControl.sendAction('SEND_REACTION', { reaction: emoji })
              : sendReaction
          }
          onLeave={() => setLeavePromptOpen(true)}
          onEndCall={() => void handleEndMeeting()}
          userName={controllingRemote && controlledPeerName ? controlledPeerName : effectiveName}
        />
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close panel"
            onClick={() => {
              setShowParticipants(false);
              setShowChat(false);
            }}
          />
          <div className="absolute inset-x-0 bottom-[4.75rem] flex min-h-[45svh] max-h-[min(70svh,calc(100dvh-9rem))] flex-col rounded-t-2xl border-t border-[#E1E7EE] bg-white p-3 shadow-[0_-12px_40px_rgba(15,23,42,0.16)] sm:bottom-[5.25rem]">
          {showParticipants ? (
            <div className="min-h-0 flex-1">
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
            </div>
          ) : null}
          {showChat ? (
            <div className="min-h-0 flex-1">
            <MeetingChatPanel
              roomId={roomId}
              peerId={participantId}
              userId={effectiveUserId ?? ''}
              userName={effectiveName}
              chatDisabled={chatDisabled && !controllingRemote}
              actingAsName={controllingRemote ? controlledPeerName : null}
              onSendOverride={
                controllingRemote
                  ? (text) => {
                      void remoteControl.sendAction('SEND_CHAT', { content: text });
                    }
                  : undefined
              }
              onClose={() => setShowChat(false)}
            />
            </div>
          ) : null}
          </div>
        </div>
      ) : null}

      {inviteOpen && isHost ? (
        <div className="fixed inset-0 z-[11000] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-[#E8ECF1] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
            <h2 className="text-[16px] font-bold text-[#151D2B]">Invite guest by email</h2>
            <p className="mt-2 text-[13px] text-[#6F7B8C]">
              Guests receive a join link. Their email is stored as invited; they enter a name to join.
            </p>
            <label className="mt-4 block text-[12px] font-semibold text-[#475569]">
              Email
              <input
                type="email"
                value={inviteEmailDraft}
                onChange={(e) => setInviteEmailDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendGuestInvite();
                  }
                }}
                placeholder="guest@example.com"
                className="mt-1 h-12 w-full rounded-xl border border-[#E1E7EE] px-3 text-[16px] outline-none focus:border-[#016BE6] sm:h-10 sm:text-[13px]"
                autoFocus
              />
            </label>
            {inviteError ? <p className="mt-2 text-[12px] text-[#DC2626]">{inviteError}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                disabled={inviteBusy}
                onClick={() => {
                  setInviteOpen(false);
                  setInviteError(null);
                }}
                className="h-12 rounded-xl border border-[#E1E7EE] px-4 text-[14px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:h-10 sm:text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={inviteBusy || !inviteEmailDraft.trim()}
                onClick={() => void sendGuestInvite()}
                className="h-12 rounded-xl bg-[#016BE6] px-4 text-[14px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60 sm:h-10 sm:text-[12px]"
              >
                {inviteBusy ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leavePromptOpen ? (
        <div className="fixed inset-0 z-[11000] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-meeting-title"
            className="w-full max-w-md rounded-t-2xl border border-[#E8ECF1] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
          >
            <h2 id="leave-meeting-title" className="text-[16px] font-bold text-[#151D2B]">
              Leave this meeting?
            </h2>
            <p className="mt-2 text-[13px] text-[#6F7B8C]">
              Are you sure you want to leave the meeting? You can rejoin later with the meeting
              link.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={cancelBlockedLeave}
                className="h-12 rounded-xl border border-[#E1E7EE] px-4 text-[14px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:h-10 sm:text-[12px]"
              >
                Stay in meeting
              </button>
              <button
                type="button"
                onClick={() => void confirmBlockedLeave()}
                className="h-12 rounded-xl bg-[#DC2626] px-4 text-[14px] font-semibold text-white hover:bg-[#B91C1C] sm:h-10 sm:text-[12px]"
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
