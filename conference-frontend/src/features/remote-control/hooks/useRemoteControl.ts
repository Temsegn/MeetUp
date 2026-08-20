import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { RC_EVENTS } from '../types';
import type {
  CommandHandlerMap,
  ControlledUiState,
  IncomingControlRequest,
  RemoteControlActionEnvelope,
  RemoteControlHistoryEvent,
  RemoteCursorState,
  RemoteViewMode,
} from '../types';
import { dispatchRemoteCommand } from '../commands/commandDispatcher';
import { applyCommandToUiState } from '../commands/applyUiState';
import { remoteControlService } from '../services/remoteControl.service';
import { useRemoteControlStore } from '../store/remoteControl.store';

interface UseRemoteControlOptions {
  socket: Socket | null;
  roomId: string;
  localParticipantId: string;
  handlers: CommandHandlerMap;
  addToast?: (message: string) => void;
}

export function useRemoteControl({
  socket,
  roomId,
  localParticipantId,
  handlers,
  addToast,
}: UseRemoteControlOptions) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const seqRef = useRef(0);
  const lastCursorAt = useRef(0);
  const lastDraftAt = useRef(0);

  const incoming = useRemoteControlStore((s) => s.incoming);
  const session = useRemoteControlStore((s) => s.session);
  const outgoingTargetId = useRemoteControlStore((s) => s.outgoingTargetId);
  const outgoingStatus = useRemoteControlStore((s) => s.outgoingStatus);
  const viewMode = useRemoteControlStore((s) => s.viewMode);
  const remoteUiState = useRemoteControlStore((s) => s.remoteUiState);
  const remoteCursor = useRemoteControlStore((s) => s.remoteCursor);
  const chatDraft = useRemoteControlStore((s) => s.chatDraft);
  const history = useRemoteControlStore((s) => s.history);
  const syncTick = useRemoteControlStore((s) => s.syncTick);
  const lastError = useRemoteControlStore((s) => s.lastError);
  const {
    setIncoming,
    setOutgoing,
    setSession,
    setViewMode,
    setRemoteUiState,
    setRemoteCursor,
    setChatDraft,
    pushHistory,
    bumpSyncTick,
    setError,
    reset,
  } = useRemoteControlStore();

  useEffect(() => {
    if (!socket || !localParticipantId) return;

    const onRequest = (payload: IncomingControlRequest) => {
      if (payload.roomId !== roomId) return;
      setIncoming(payload);
      addToast?.(`${payload.requesterName} wants to control your meeting interface`);
    };

    const onStarted = (payload: {
      sessionId: string;
      roomId: string;
      requesterId: string;
      requesterName: string;
      controlledUserId: string;
      controlledName: string;
      permissions: IncomingControlRequest['permissions'];
    }) => {
      if (payload.roomId !== roomId) return;
      const role =
        payload.requesterId === localParticipantId
          ? 'controlling'
          : payload.controlledUserId === localParticipantId
            ? 'controlled'
            : null;
      if (!role) return;
      setSession({ ...payload, role });
      seqRef.current = 0;
      if (role === 'controlling') {
        addToast?.(`You are controlling ${payload.controlledName}`);
        window.setTimeout(() => remoteControlService.sync(socket, payload.sessionId), 200);
      } else {
        addToast?.(`${payload.controlledName} — Remote control by ${payload.requesterName}`);
      }
    };

    const onAction = (envelope: RemoteControlActionEnvelope) => {
      if (envelope.controlledUserId !== localParticipantId) return;
      const result = dispatchRemoteCommand(envelope.actionType, envelope.payload, handlersRef.current);
      if (!result.ok) {
        console.warn('[remote-control] ignored command', envelope.actionType, result.reason);
      }
    };

    const onCursor = (payload: RemoteCursorState & { sessionId?: string }) => {
      const current = useRemoteControlStore.getState().session;
      if (!current || (payload.sessionId && payload.sessionId !== current.sessionId)) return;
      setRemoteCursor(payload);
    };

    const onUiState = (payload: { sessionId?: string; state: ControlledUiState }) => {
      const current = useRemoteControlStore.getState().session;
      if (!current || current.role !== 'controlling') return;
      if (payload.sessionId && payload.sessionId !== current.sessionId) return;
      const localDraft = useRemoteControlStore.getState().chatDraft;
      setRemoteUiState({ ...payload.state, chatDraft: localDraft });
    };

    const onDraft = (payload: { sessionId?: string; chatDraft: string }) => {
      const current = useRemoteControlStore.getState().session;
      if (!current || current.role !== 'controlled') return;
      if (payload.sessionId && payload.sessionId !== current.sessionId) return;
      setChatDraft(payload.chatDraft);
    };

    const onHistory = (event: RemoteControlHistoryEvent) => {
      const current = useRemoteControlStore.getState().session;
      if (!current || event.sessionId !== current.sessionId) return;
      pushHistory(event);
    };

    const onSync = (payload: { sessionId?: string }) => {
      const current = useRemoteControlStore.getState().session;
      if (!current || current.role !== 'controlled') return;
      if (payload.sessionId && payload.sessionId !== current.sessionId) return;
      bumpSyncTick();
    };

    const onEnded = (payload: { sessionId?: string; reason?: string; type?: string }) => {
      const current = useRemoteControlStore.getState().session;
      const pending = useRemoteControlStore.getState().incoming;
      if (current && payload.sessionId && current.sessionId !== payload.sessionId) return;
      if (!current && pending && payload.sessionId && pending.sessionId !== payload.sessionId) return;
      reset();
      if (payload.type === 'REMOTE_CONTROL_REJECTED' || payload.reason === 'rejected') {
        addToast?.('Control request declined');
      } else if (payload.reason === 'revoked' || payload.type === 'REMOTE_CONTROL_REVOKED') {
        addToast?.('Remote control revoked');
      } else {
        addToast?.('Remote control ended');
      }
    };

    socket.on(RC_EVENTS.REQUEST, onRequest);
    socket.on(RC_EVENTS.STARTED, onStarted);
    socket.on(RC_EVENTS.ACTION, onAction);
    socket.on(RC_EVENTS.CURSOR, onCursor);
    socket.on(RC_EVENTS.UI_STATE, onUiState);
    socket.on(RC_EVENTS.DRAFT, onDraft);
    socket.on(RC_EVENTS.HISTORY, onHistory);
    socket.on(RC_EVENTS.SYNC, onSync);
    socket.on(RC_EVENTS.REJECTED, onEnded);
    socket.on(RC_EVENTS.STOPPED, onEnded);
    socket.on(RC_EVENTS.REVOKED, onEnded);
    socket.on(RC_EVENTS.ENDED, onEnded);

    return () => {
      socket.off(RC_EVENTS.REQUEST, onRequest);
      socket.off(RC_EVENTS.STARTED, onStarted);
      socket.off(RC_EVENTS.ACTION, onAction);
      socket.off(RC_EVENTS.CURSOR, onCursor);
      socket.off(RC_EVENTS.UI_STATE, onUiState);
      socket.off(RC_EVENTS.DRAFT, onDraft);
      socket.off(RC_EVENTS.HISTORY, onHistory);
      socket.off(RC_EVENTS.SYNC, onSync);
      socket.off(RC_EVENTS.REJECTED, onEnded);
      socket.off(RC_EVENTS.STOPPED, onEnded);
      socket.off(RC_EVENTS.REVOKED, onEnded);
      socket.off(RC_EVENTS.ENDED, onEnded);
    };
  }, [socket, roomId, localParticipantId, addToast, setIncoming, setSession, setRemoteCursor, setRemoteUiState, setChatDraft, pushHistory, bumpSyncTick, reset]);

  useEffect(() => {
    return () => reset();
  }, [roomId, reset]);

  const requestControl = useCallback(
    async (targetParticipantId: string) => {
      if (!socket) return;
      setError(null);
      setOutgoing(targetParticipantId, 'sent');
      try {
        await remoteControlService.request(socket, roomId, targetParticipantId);
      } catch (err) {
        setOutgoing(null, 'idle');
        const message = err instanceof Error ? err.message : 'Could not request control';
        setError(message);
        addToast?.(message);
      }
    },
    [socket, roomId, addToast, setOutgoing, setError],
  );

  const respond = useCallback(
    async (accept: boolean) => {
      if (!socket || !incoming) return;
      try {
        await remoteControlService.respond(socket, incoming.sessionId, accept);
        setIncoming(null);
        if (!accept) reset();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not respond';
        setError(message);
        addToast?.(message);
      }
    },
    [socket, incoming, addToast, reset, setError, setIncoming],
  );

  const stop = useCallback(async () => {
    if (!socket || !session) return;
    try {
      await remoteControlService.stop(socket, session.sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not stop control';
      addToast?.(message);
    }
  }, [socket, session, addToast]);

  const sendAction = useCallback(
    async (actionType: Parameters<typeof remoteControlService.action>[3], payload: Record<string, unknown> = {}) => {
      if (!socket || !session || session.role !== 'controlling' || viewMode !== 'remote') return;
      const { remoteUiState: currentUi, setRemoteUiState: setUi, setChatDraft: setDraft } = useRemoteControlStore.getState();
      setUi(applyCommandToUiState(currentUi, actionType, payload));
      if (actionType === 'SEND_CHAT') setDraft('');
      const nextSeq = seqRef.current + 1;
      try {
        await remoteControlService.action(socket, session.sessionId, nextSeq, actionType, payload);
        seqRef.current = nextSeq;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Command rejected';
        addToast?.(message);
      }
    },
    [socket, session, viewMode, addToast],
  );

  const sendCursor = useCallback(
    (x: number, y: number, visible: boolean) => {
      if (!socket || !session) return;
      const t = Date.now();
      if (visible && t - lastCursorAt.current < 40) return;
      lastCursorAt.current = t;
      remoteControlService.cursor(socket, session.sessionId, x, y, visible);
    },
    [socket, session],
  );

  const publishUiState = useCallback(
    (state: ControlledUiState) => {
      if (!socket || !session || session.role !== 'controlled') return;
      remoteControlService.uiState(socket, session.sessionId, state);
    },
    [socket, session],
  );

  const sendDraft = useCallback(
    (value: string) => {
      if (!socket || !session || session.role !== 'controlling' || viewMode !== 'remote') return;
      setChatDraft(value);
      const t = Date.now();
      if (value !== '' && t - lastDraftAt.current < 50) return;
      lastDraftAt.current = t;
      remoteControlService.draft(socket, session.sessionId, value);
    },
    [socket, session, viewMode, setChatDraft],
  );

  const switchView = useCallback(
    async (next: RemoteViewMode) => {
      if (!socket || !session || session.role !== 'controlling') return;
      setViewMode(next);
      try {
        await remoteControlService.view(socket, session.sessionId, next);
      } catch {
        /* view is local-first */
      }
      if (next === 'remote') {
        remoteControlService.sync(socket, session.sessionId);
      }
    },
    [socket, session, setViewMode],
  );

  return {
    incoming,
    session,
    outgoingTargetId,
    outgoingStatus,
    lastError,
    viewMode,
    remoteUiState,
    remoteCursor,
    chatDraft,
    history,
    syncTick,
    requestControl,
    accept: () => respond(true),
    decline: () => respond(false),
    stop,
    sendAction,
    sendCursor,
    sendDraft,
    publishUiState,
    switchView,
    setChatDraft,
  };
}
