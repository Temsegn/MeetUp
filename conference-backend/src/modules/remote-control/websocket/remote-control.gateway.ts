import { Server, Socket } from 'socket.io';
import { validatePayload } from '../../../shared/validation/socket.schemas';
import { RC_EVENTS } from '../remote-control.constants';
import {
  RemoteControlActionSchema,
  RemoteControlCursorSchema,
  RemoteControlDraftSchema,
  RemoteControlRequestSchema,
  RemoteControlRespondSchema,
  RemoteControlStopSchema,
  RemoteControlUiStateSchema,
  RemoteControlViewSchema,
  RemoteControlSyncSchema,
} from '../validators/remote-control-command.schema';
import { RemoteControlError } from '../services/remote-control.service';
import { bindRemoteControlTransport, remoteControlService } from '../services/remote-control.singleton';
import { logger } from '../../../infrastructure/logging/logger';

type Callback = (res: unknown) => void;

function fail(callback: Callback | undefined, err: unknown): void {
  if (err instanceof RemoteControlError) {
    callback?.({ error: err.message, code: err.code });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error('Remote control handler error', { err: message });
  callback?.({ error: 'Remote control failed.', code: 'INTERNAL_ERROR' });
}

export function bindRemoteControlIo(io: Server): void {
  bindRemoteControlTransport({
    emitToSocket(socketId, event, payload) {
      io.to(socketId).emit(event, payload);
    },
  });
}

export function registerRemoteControlHandlers(_io: Server, socket: Socket): void {
  const user = socket.data.user as { userId: string; name: string };

  function currentParticipant(roomId: string): string | undefined {
    const current = socket.data.currentRoom as { roomId: string; participantId: string } | undefined;
    if (!current || current.roomId !== roomId) return undefined;
    return current.participantId;
  }

  socket.on(RC_EVENTS.REQUEST, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlRequestSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const participantId = currentParticipant(v.data.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      const session = remoteControlService.requestControl({
        roomId: v.data.roomId,
        requesterParticipantId: participantId,
        requesterUserId: user.userId,
        targetParticipantId: v.data.targetParticipantId,
      });
      callback?.({
        success: true,
        sessionId: session.sessionId,
        state: session.state,
        type: 'REMOTE_CONTROL_REQUEST',
      });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.RESPOND, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlRespondSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      const next = remoteControlService.respond({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        accept: v.data.accept,
      });
      callback?.({ success: true, sessionId: next.sessionId, state: next.state });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.ACTION, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlActionSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      const result = remoteControlService.dispatchAction({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        seq: v.data.seq,
        actionType: v.data.actionType,
        payload: v.data.payload,
      });
      if (result === 'duplicate') {
        callback?.({ success: true, duplicate: true });
        return;
      }
      callback?.({ success: true, seq: result.seq });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.STOP, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlStopSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.stop({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.CURSOR, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlCursorSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.forwardCursor({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        x: v.data.x,
        y: v.data.y,
        visible: v.data.visible,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.UI_STATE, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlUiStateSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.forwardUiState({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        state: v.data.state,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.DRAFT, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlDraftSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.forwardDraft({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        chatDraft: v.data.chatDraft,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.VIEW, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlViewSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.switchView({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
        view: v.data.view,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(RC_EVENTS.SYNC, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RemoteControlSyncSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    const session = remoteControlService.getSession(v.data.sessionId);
    if (!session) return callback?.({ error: 'Control session not found.', code: 'SESSION_NOT_FOUND' });
    const participantId = currentParticipant(session.roomId);
    if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    try {
      remoteControlService.requestSnapshot({
        sessionId: v.data.sessionId,
        actorParticipantId: participantId,
        actorUserId: user.userId,
      });
      callback?.({ success: true });
    } catch (err) {
      fail(callback, err);
    }
  });
}
