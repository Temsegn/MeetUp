import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../services/auth/auth.service';
import { useMeeting } from '../meeting/hooks/useMeeting';
import { useLocalMedia } from '../media/hooks/useLocalMedia';
import { ParticipantTile } from '../meeting/components/ParticipantTile/ParticipantTile';
import { MeetingControls } from '../meeting/components/MeetingControls/MeetingControls';
import { MeetingSidebar } from '../collaboration/components/MeetingSidebar/MeetingSidebar';
import { ReactionOverlay } from '../collaboration/components/ReactionOverlay/ReactionOverlay';
import { useReactions } from '../collaboration/hooks/useReactions';
import { PreJoinScreen } from '../meeting/components/PreJoinScreen/PreJoinScreen';
import { useResponsiveGrid } from '../meeting/hooks/useResponsiveGrid';
import { useActiveSpeakers } from '../media/hooks/useActiveSpeakers';
import { useMeetingScreenRecorder } from '../media/recording/useMeetingScreenRecorder';
import { Clock, Users as UsersIcon, X, MicOff, Hand } from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Maximum participant tiles rendered in the gallery grid.
 * The final slot becomes a "+N more" overflow tile when exceeded.
 */
const MAX_VISIBLE_TILES = 10;

// ── Component ───────────────────────────────────────────────────────────────

export const MeetingPage: React.FC = () => {
  const { roomId = 'test-room' } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen,          setSidebarOpen]          = useState<'chat' | 'participants' | null>(null);
  const [joinError,            setJoinError]            = useState<string | null>(null);
  const [isJoining,            setIsJoining]            = useState(false);
  const [isMuted,              setIsMuted]              = useState(false);
  const [isCameraOff,          setIsCameraOff]          = useState(false);
  const [toasts,               setToasts]               = useState<{ id: string; message: string }[]>([]);
  const [currentTime,          setCurrentTime]          = useState(new Date());
  const [showAllParticipants,  setShowAllParticipants]  = useState(false);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Toast helper
  const addToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Meeting / media hooks ─────────────────────────────────────────────────
  const {
    joined, participantId, joinMeeting, leaveMeeting, session,
    peers, remoteStreams, creatorId,
  } = useMeeting(roomId, getAccessToken() ?? '', user?.name ?? 'Guest', user?.id, addToast);

  const {
    localStream, screenStream,
    startLocalMedia, startScreenShare, stopScreenShare,
  } = useLocalMedia();

  const stageRef = useRef<HTMLDivElement | null>(null);

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
    getStageEl: () => stageRef.current,
    getAudioStreams,
    onCaptureReady: () => {
      setSidebarOpen('chat');
    },
    addToast,
  });

  // Acquire camera/mic on mount
  useEffect(() => { startLocalMedia(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reactions ─────────────────────────────────────────────────────────────
  const { activeReactions, sendReaction, raisedHands, toggleRaiseHand } = useReactions(
    roomId,
    participantId || '__pre_join__',
  );

  // Peer name map (for reaction overlay)
  const peerNames = useMemo(() => {
    const m = new Map<string, string>();
    peers.forEach(p => m.set(p.id, p.name));
    if (participantId && user?.name) m.set(participantId, user.name);
    return m;
  }, [peers, participantId, user?.name]);

  // ── Screen share detection ────────────────────────────────────────────────
  const remoteScreenStreams = useMemo(() => {
    const screens: { id: string; name: string; stream: MediaStream }[] = [];
    peers.forEach(p => {
      const s = remoteStreams.get(p.id);
      if (s?.screen && s.screen.getTracks().length > 0) {
        screens.push({ id: p.id, name: p.name, stream: s.screen });
      }
    });
    return screens;
  }, [peers, remoteStreams]);

  const activeScreenShare = screenStream
    ? { id: participantId, name: 'Your Screen', stream: screenStream, isLocal: true }
    : remoteScreenStreams.length > 0
      ? { ...remoteScreenStreams[0], isLocal: false, name: `${remoteScreenStreams[0].name}'s Screen` }
      : null;

  // ── Active speakers ───────────────────────────────────────────────────────
  const activeSpeakers = useActiveSpeakers([
    { id: participantId, stream: localStream },
    ...peers.map(p => ({
      id: p.id,
      stream: remoteStreams.get(p.id)?.audio || remoteStreams.get(p.id)?.camera || null,
    })),
  ]);

  // Sort: host first, then active speakers, then the rest
  const sortedPeers = useMemo(() => {
    return [...peers].sort((a, b) => {
      const aHost = a.isHost || a.userId === creatorId;
      const bHost = b.isHost || b.userId === creatorId;
      if (aHost && !bHost) return -1;
      if (!aHost && bHost) return 1;
      const aSpk = activeSpeakers.has(a.id);
      const bSpk = activeSpeakers.has(b.id);
      if (aSpk && !bSpk) return -1;
      if (!aSpk && bSpk) return 1;
      return 0;
    });
  }, [peers, activeSpeakers, creatorId]);

  // ── Tile accounting ───────────────────────────────────────────────────────
  //
  // Total slots      = local tile + peer tiles
  // Visible tiles    = min(total, MAX_VISIBLE_TILES)
  // If total > MAX_VISIBLE_TILES:
  //   - Show (MAX_VISIBLE_TILES - 1) real tiles  (1 local + N-1 peers)
  //   - 1 overflow tile showing "+remaining"
  //
  const totalTiles       = peers.length + 1; // +1 for local
  const hasOverflow      = totalTiles > MAX_VISIBLE_TILES;
  const maxPeerSlots     = hasOverflow ? MAX_VISIBLE_TILES - 2 : peers.length; // -1 for local, -1 for overflow
  const visiblePeers     = sortedPeers.slice(0, maxPeerSlots);
  const overflowCount    = hasOverflow ? totalTiles - (visiblePeers.length + 1) : 0;
  const renderedTileCount = visiblePeers.length + 1 + (hasOverflow ? 1 : 0);

  // Grid layout — above/below rows (e.g. 5 top, 4 bottom), never one long horizontal strip
  const { layout, gridStyle, rowPlan } = useResponsiveGrid(
    renderedTileCount,
    !!activeScreenShare,
    !!sidebarOpen,
  );

  const galleryTiles = useMemo(() => {
    type GalleryTile =
      | { key: string; kind: 'local' }
      | { key: string; kind: 'peer'; peer: typeof visiblePeers[number] }
      | { key: string; kind: 'overflow'; count: number };

    const tiles: GalleryTile[] = [
      { key: 'local', kind: 'local' },
      ...visiblePeers.map((p) => ({ key: p.id, kind: 'peer' as const, peer: p })),
    ];
    if (hasOverflow) {
      tiles.push({ key: 'overflow', kind: 'overflow', count: overflowCount });
    }
    return tiles;
  }, [visiblePeers, hasOverflow, overflowCount]);

  const galleryRows = useMemo(() => {
    const plan = rowPlan.length ? rowPlan : [galleryTiles.length || 1];
    const rows: typeof galleryTiles[] = [];
    let idx = 0;
    for (const size of plan) {
      rows.push(galleryTiles.slice(idx, idx + size));
      idx += size;
    }
    // Safety: any leftover tiles go into an extra row
    if (idx < galleryTiles.length) {
      rows.push(galleryTiles.slice(idx));
    }
    return rows;
  }, [galleryTiles, rowPlan]);

  // ── Join handler ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoinError(null);
    setIsJoining(true);
    try {
      // Ensure we have a live MediaStream BEFORE joining/producing.
      // Stale React state can be null even after getUserMedia succeeded.
      const stream = localStream ?? await startLocalMedia();
      if (!stream || stream.getTracks().length === 0) {
        throw new Error('Could not access camera/microphone. Allow permissions and try again.');
      }

      await joinMeeting();
      const sess = session.current;
      if (!sess) throw new Error('Media session failed to initialize');

      for (const track of stream.getAudioTracks()) {
        await sess.produce(track, 'microphone');
      }
      for (const track of stream.getVideoTracks()) {
        await sess.produce(track, 'camera', true);
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join. Is the backend running?');
    } finally {
      setIsJoining(false);
    }
  };

  // ── Media controls ────────────────────────────────────────────────────────
  const handleToggleMute = async () => {
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('microphone')) {
      if (isMuted) await sess.resumeProducer(p.id);
      else         await sess.pauseProducer(p.id);
    }
    setIsMuted(m => !m);
  };

  const handleToggleCamera = async () => {
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('camera')) {
      if (isCameraOff) await sess.resumeProducer(p.id);
      else             await sess.pauseProducer(p.id);
    }
    setIsCameraOff(c => !c);
  };

  const handleShareScreen = async () => {
    try {
      const stream = await startScreenShare();
      if (!stream) return;
      const sess = session.current;
      if (!sess) return;
      for (const track of stream.getTracks()) {
        const producer = await sess.produce(track, 'screen');
        track.addEventListener('ended', () => sess.closeProducer(producer.id));
      }
    } catch (err) { console.error('Screen share failed', err); }
  };

  const handleStopScreenShare = async () => {
    stopScreenShare();
    const sess = session.current;
    if (!sess) return;
    for (const p of sess.getProducersBySource('screen')) {
      await sess.closeProducer(p.id);
    }
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (isRecording) {
      try { await stopRecording(); } catch { /* ignore */ }
    }
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    await leaveMeeting();
    navigate('/');
  };

  const toggleSidebar = (panel: 'chat' | 'participants') => {
    setSidebarOpen(s => s === panel ? null : panel);
  };

  // ── Pre-join ──────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <PreJoinScreen
        roomId={roomId}
        localStream={localStream}
        userName={user?.name ?? 'Guest'}
        onJoin={handleJoin}
        onRequestMedia={startLocalMedia}
        isJoining={isJoining}
        joinError={joinError}
        onBack={() => navigate('/')}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — meeting in session
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={stageRef}
      data-meeting-root
      data-room-id={roomId}
      className="w-full bg-slate-900 text-white flex flex-col relative"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-[52px] flex items-center justify-between px-3 sm:px-5 z-30">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5 text-slate-200 text-xs sm:text-sm">
            <Clock size={13} />
            <span className="font-semibold">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 font-mono">{roomId}</span>
        </div>

        <button
          onClick={() => toggleSidebar('participants')}
          className="bg-slate-800/80 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium border border-slate-700 shadow-lg hover:bg-slate-700 transition"
        >
          <UsersIcon size={14} className="text-blue-400" />
          <span>{totalTiles}</span>
        </button>
      </header>

      {/* ── Video area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <main
          className={`flex-1 min-h-0 min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:mr-80' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          {layout === 'presentation' && activeScreenShare ? (
            /* ── Presentation layout ─────────────────────────────────── */
            <div className="w-full h-full flex flex-col gap-1.5 p-1.5 sm:p-2">
              {/* Main screen share */}
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                <ParticipantTile
                  stream={activeScreenShare.stream}
                  name={activeScreenShare.name}
                  isLocal={activeScreenShare.isLocal}
                  isScreen
                />
              </div>
              {/* Film strip */}
              <div
                className="flex-shrink-0 flex gap-1.5 overflow-x-auto pb-1"
                style={{ height: 'clamp(80px, 15vh, 130px)' }}
              >
                {localStream && (
                  <div className="flex-shrink-0 aspect-video h-full">
                    <ParticipantTile
                      stream={localStream}
                      name={user?.name || participantId}
                      isLocal
                      isHandRaised={raisedHands.has(participantId)}
                      isMuted={isMuted}
                      isCameraOff={isCameraOff}
                    />
                  </div>
                )}
                {sortedPeers.map(p => (
                  <div key={p.id} className="flex-shrink-0 aspect-video h-full">
                    <ParticipantTile
                      stream={remoteStreams.get(p.id)?.camera || null}
                      audioStream={remoteStreams.get(p.id)?.audio || null}
                      name={p.name}
                      isHandRaised={raisedHands.has(p.id)}
                      isMuted={p.isMuted}
                      isCameraOff={p.isCameraOff}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Gallery layout — rows above/below (odd counts: e.g. 5 then 4) ── */
            <div style={gridStyle}>
              {galleryRows.map((row, rowIdx) => {
                const widest = Math.max(1, ...(rowPlan.length ? rowPlan : [row.length]));
                const tilePct = 100 / widest;
                return (
                  <div
                    key={`row-${rowIdx}`}
                    className="flex-1 min-h-0 flex justify-center"
                    style={{ gap: 6 }}
                  >
                    {row.map((tile) => (
                      <div
                        key={tile.key}
                        className="h-full min-w-0"
                        style={{ width: `calc(${tilePct}% - 4px)`, maxWidth: `calc(${tilePct}% - 4px)` }}
                      >
                        {tile.kind === 'local' && (
                          <ParticipantTile
                            stream={localStream}
                            name={user?.name || participantId}
                            isLocal
                            isHandRaised={raisedHands.has(participantId)}
                            isMuted={isMuted}
                            isCameraOff={isCameraOff}
                          />
                        )}
                        {tile.kind === 'peer' && (
                          <ParticipantTile
                            stream={remoteStreams.get(tile.peer.id)?.camera || null}
                            audioStream={remoteStreams.get(tile.peer.id)?.audio || null}
                            name={tile.peer.name}
                            isHandRaised={raisedHands.has(tile.peer.id)}
                            isMuted={tile.peer.isMuted}
                            isCameraOff={tile.peer.isCameraOff}
                          />
                        )}
                        {tile.kind === 'overflow' && (
                          <ParticipantTile
                            stream={null}
                            name=""
                            overflowCount={tile.count}
                            onOverflowClick={() => setShowAllParticipants(true)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setSidebarOpen(null)}
            />
            <div className="fixed md:absolute top-0 right-0 bottom-[72px] w-80 max-w-full bg-slate-800 border-l border-slate-700 shadow-2xl z-30">
              <MeetingSidebar
                roomId={roomId}
                peerId={participantId}
                userId={user?.id ?? ''}
                peers={peers}
                userName={user?.name ?? 'Guest'}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <MeetingControls
        roomId={roomId}
        peerId={participantId}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isSharingScreen={!!screenStream}
        isSomeoneElseSharing={remoteScreenStreams.length > 0}
        isRecording={isRecording}
        isRecordingBusy={isRecordingBusy}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onShareScreen={handleShareScreen}
        onStopScreenShare={handleStopScreenShare}
        onToggleRecording={isRecording ? stopRecording : startRecording}
        onSendReaction={sendReaction}
        isHandRaised={raisedHands.has(participantId)}
        onToggleRaiseHand={toggleRaiseHand}
        onToggleChat={() => toggleSidebar('chat')}
        onToggleParticipants={() => toggleSidebar('participants')}
        onLeave={handleLeave}
      />

      {/* ── All-participants modal (opened from "+N" tile) ───────────── */}
      {showAllParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllParticipants(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm max-h-[75dvh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700">
              <div className="flex items-center gap-2 font-semibold text-white text-sm">
                <UsersIcon size={16} className="text-blue-400" />
                All participants ({totalTiles})
              </div>
              <button
                onClick={() => setShowAllParticipants(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {/* Self */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/20">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {(user?.name ?? 'G').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Guest'}</p>
                  <p className="text-xs text-blue-300/80">
                    You
                    {isMuted ? ' · Muted' : ''}
                    {raisedHands.has(participantId) ? ' · ✋ Hand raised' : ''}
                  </p>
                </div>
                {isMuted && <MicOff size={14} className="text-red-400 flex-shrink-0" />}
              </div>

              {/* All peers */}
              {sortedPeers.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-700/40 hover:bg-slate-700/60 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-slate-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {activeSpeakers.has(p.id) && <span className="text-blue-400">Speaking</span>}
                      {p.isMuted && <span>Muted</span>}
                      {raisedHands.has(p.id) && <span className="text-amber-400">✋ Hand raised</span>}
                    </div>
                  </div>
                  {p.isMuted && <MicOff size={14} className="text-red-400 flex-shrink-0" />}
                  {raisedHands.has(p.id) && <Hand size={14} className="text-amber-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-slate-800 border border-slate-700 shadow-lg text-white px-4 py-2 rounded-lg text-sm"
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Reactions ───────────────────────────────────────────────────── */}
      <ReactionOverlay
        reactions={activeReactions}
        peerNames={peerNames}
        ownParticipantId={participantId}
      />
    </div>
  );
};
