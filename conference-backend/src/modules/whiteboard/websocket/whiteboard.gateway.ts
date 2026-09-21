import type { Server, Socket } from 'socket.io';
import { validatePayload } from '../../../shared/validation/socket.schemas';
import { logger } from '../../../infrastructure/logging/logger';
import {
  WB_EVENTS,
  WB_MAX_UPDATE_BYTES,
  WB_UPDATE_RATE_LIMIT,
  WB_UPDATE_RATE_WINDOW_MS,
  WB_CURSOR_RATE_LIMIT,
  WB_CURSOR_RATE_WINDOW_MS,
} from '../whiteboard.constants';
import {
  WhiteboardClearSchema,
  WhiteboardCursorSchema,
  WhiteboardGetVisibilitySchema,
  WhiteboardJoinSchema,
  WhiteboardLeaveSchema,
  WhiteboardUpdateSchema,
  WhiteboardVisibilitySchema,
} from '../validators/whiteboard.schema';
import { getMeetingBinding } from '../services/whiteboard-authz.service';
import { whiteboardRoomService } from '../services/whiteboard.singleton';
import {
  clearWhiteboardActive,
  getWhiteboardOpener,
  isWhiteboardActive,
  markWhiteboardActive,
} from '../services/whiteboard-visibility.service';
import type { WhiteboardElement, WhiteboardFiles } from '../types/whiteboard.types';

type Callback = (res: unknown) => void;

const updateRateLimit = new Map<string, { count: number; windowStart: number }>();
const cursorRateLimit = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(
  map: Map<string, { count: number; windowStart: number }>,
  socketId: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const state = map.get(socketId) ?? { count: 0, windowStart: now };
  if (now - state.windowStart > windowMs) {
    state.count = 1;
    state.windowStart = now;
    map.set(socketId, state);
    return false;
  }
  state.count += 1;
  map.set(socketId, state);
  return state.count > limit;
}

function payloadByteLength(payload: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Registers Excalidraw whiteboard handlers on an authenticated meeting socket.
 * Identity always comes from socket.data.currentRoom / socket.data.user.
 */
export function registerWhiteboardHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user as { userId: string; name: string };
  let attachedRoomId: string | null = null;
  let attachedClientId: string | null = null;

  socket.on(WB_EVENTS.JOIN, async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardJoinSchema, payload);
    if (!v.success) {
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    try {
      if (attachedRoomId && attachedRoomId !== binding.roomId) {
        await whiteboardRoomService.detachSocket(attachedRoomId, socket.id);
      }

      const snapshot = await whiteboardRoomService.attachSession({
        roomId: binding.roomId,
        socketId: socket.id,
        clientId: v.data.clientId,
        participantId: binding.participantId,
        userName: user.name,
      });

      attachedRoomId = binding.roomId;
      attachedClientId = v.data.clientId;

      callback?.({
        success: true,
        whiteboardId: snapshot.whiteboardId,
        revision: snapshot.revision,
        elements: snapshot.elements,
        files: snapshot.files,
        participantId: binding.participantId,
        clientId: v.data.clientId,
      });

      logger.info('Whiteboard joined', {
        roomId: binding.roomId,
        participantId: binding.participantId,
        clientId: v.data.clientId,
        revision: snapshot.revision,
        socketId: socket.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Whiteboard join failed', { roomId: binding.roomId, err: message });
      callback?.({ error: 'Whiteboard join failed', code: 'INTERNAL_ERROR' });
    }
  });

  socket.on(WB_EVENTS.UPDATE, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardUpdateSchema, payload);
    if (!v.success) {
      socket.emit(WB_EVENTS.ERROR, { code: 'VALIDATION_ERROR', message: v.error });
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    if (attachedRoomId !== binding.roomId) {
      return callback?.({ error: 'Join whiteboard first', code: 'NOT_JOINED' });
    }

    if (payloadByteLength(payload) > WB_MAX_UPDATE_BYTES) {
      logger.warn('Whiteboard update rejected (too large)', {
        roomId: binding.roomId,
        socketId: socket.id,
      });
      return callback?.({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
    }

    if (
      isRateLimited(
        updateRateLimit,
        socket.id,
        WB_UPDATE_RATE_LIMIT,
        WB_UPDATE_RATE_WINDOW_MS,
      )
    ) {
      logger.warn('Whiteboard update rate-limited', {
        roomId: binding.roomId,
        socketId: socket.id,
      });
      return callback?.({ error: 'Rate limited', code: 'RATE_LIMITED' });
    }

    const result = whiteboardRoomService.applyUpdate({
      roomId: binding.roomId,
      clientId: v.data.clientId,
      elements: v.data.elements as WhiteboardElement[],
      files: v.data.files as WhiteboardFiles | undefined,
    });

    if (!result) {
      return callback?.({ error: 'Whiteboard not found', code: 'NOT_FOUND' });
    }

    if (result.applied.length === 0 && !result.files) {
      return callback?.({ success: true, revision: result.revision, applied: 0 });
    }

    const syncPayload = {
      roomId: binding.roomId,
      revision: result.revision,
      clientId: v.data.clientId,
      elements: result.applied,
      files: result.files,
    };

    socket.to(binding.roomId).emit(WB_EVENTS.SYNC, syncPayload);
    callback?.({
      success: true,
      revision: result.revision,
      applied: result.applied.length,
    });
  });

  socket.on(WB_EVENTS.CURSOR, (payload: unknown) => {
    const v = validatePayload(WhiteboardCursorSchema, payload);
    if (!v.success) return;

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding || attachedRoomId !== binding.roomId) return;

    if (
      isRateLimited(
        cursorRateLimit,
        socket.id,
        WB_CURSOR_RATE_LIMIT,
        WB_CURSOR_RATE_WINDOW_MS,
      )
    ) {
      return;
    }

    socket.to(binding.roomId).emit(WB_EVENTS.CURSOR, {
      roomId: binding.roomId,
      clientId: v.data.clientId,
      participantId: binding.participantId,
      userName: user.name,
      x: v.data.x,
      y: v.data.y,
      pointer: v.data.pointer,
      button: v.data.button,
    });
  });

  socket.on(WB_EVENTS.CLEAR, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardClearSchema, payload);
    if (!v.success) {
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    if (attachedRoomId !== binding.roomId) {
      return callback?.({ error: 'Join whiteboard first', code: 'NOT_JOINED' });
    }

    const result = whiteboardRoomService.clearScene(binding.roomId, v.data.clientId);
    if (!result) {
      return callback?.({ error: 'Whiteboard not found', code: 'NOT_FOUND' });
    }

    const snapshot = whiteboardRoomService.getSnapshot(binding.roomId);
    io.to(binding.roomId).emit(WB_EVENTS.SYNC, {
      roomId: binding.roomId,
      revision: result.revision,
      clientId: v.data.clientId,
      elements: snapshot?.elements ?? [],
      files: snapshot?.files ?? {},
      cleared: true,
    });

    logger.info('Whiteboard cleared', {
      roomId: binding.roomId,
      participantId: binding.participantId,
      revision: result.revision,
    });

    callback?.({ success: true, revision: result.revision });
  });

  socket.on(WB_EVENTS.LEAVE, async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardLeaveSchema, payload);
    if (!v.success) {
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    if (attachedRoomId === binding.roomId) {
      await whiteboardRoomService.detachSocket(attachedRoomId, socket.id);
      attachedRoomId = null;
      attachedClientId = null;
    }

    callback?.({ success: true });
  });

  /**
   * Shared panel visibility for the meeting.
   * Open → broadcast to everyone; first opener is remembered.
   * Close → only the opener may close for everyone.
   */
  socket.on(WB_EVENTS.VISIBILITY, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardVisibilitySchema, payload);
    if (!v.success) {
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    if (v.data.open) {
      const alreadyActive = isWhiteboardActive(binding.roomId);
      markWhiteboardActive(binding.roomId, {
        participantId: binding.participantId,
        name: user.name,
      });
      const opener = getWhiteboardOpener(binding.roomId)!;
      if (!alreadyActive) {
        socket.to(binding.roomId).emit(WB_EVENTS.VISIBILITY, {
          roomId: binding.roomId,
          open: true,
          openedBy: {
            participantId: opener.openedByParticipantId,
            name: opener.openedByName,
          },
        });
      }
      return callback?.({
        success: true,
        active: true,
        openedByParticipantId: opener.openedByParticipantId,
      });
    }

    const opener = getWhiteboardOpener(binding.roomId);
    if (!opener) {
      return callback?.({ success: true, active: false });
    }
    if (opener.openedByParticipantId !== binding.participantId) {
      return callback?.({
        error: 'Only the person who opened the whiteboard can close it for everyone.',
        code: 'NOT_OPENER',
        active: true,
        openedByParticipantId: opener.openedByParticipantId,
      });
    }

    clearWhiteboardActive(binding.roomId);
    io.to(binding.roomId).emit(WB_EVENTS.VISIBILITY, {
      roomId: binding.roomId,
      open: false,
      closedBy: {
        participantId: binding.participantId,
        name: user.name,
      },
    });

    callback?.({ success: true, active: false });
  });

  socket.on(WB_EVENTS.GET_VISIBILITY, (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WhiteboardGetVisibilitySchema, payload);
    if (!v.success) {
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }

    const binding = getMeetingBinding(socket, v.data.roomId);
    if (!binding) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    const opener = getWhiteboardOpener(binding.roomId);
    callback?.({
      success: true,
      active: isWhiteboardActive(binding.roomId),
      openedByParticipantId: opener?.openedByParticipantId ?? null,
      openedByName: opener?.openedByName ?? null,
    });
  });

  socket.on('disconnect', () => {
    if (attachedRoomId) {
      void whiteboardRoomService.detachSocket(attachedRoomId, socket.id);
      attachedRoomId = null;
      attachedClientId = null;
    }
    updateRateLimit.delete(socket.id);
    cursorRateLimit.delete(socket.id);
  });
}

export function clearWhiteboardRateLimit(socketId: string): void {
  updateRateLimit.delete(socketId);
  cursorRateLimit.delete(socketId);
}

/** Call when a meeting peer leaves — close board for all if opener left, or clear if room empty. */
export function onWhiteboardPeerLeft(
  io: Server,
  roomId: string,
  participantId: string,
  remainingPeers: number,
  closedByName?: string,
): void {
  const opener = getWhiteboardOpener(roomId);
  if (opener && opener.openedByParticipantId === participantId) {
    clearWhiteboardActive(roomId);
    io.to(roomId).emit(WB_EVENTS.VISIBILITY, {
      roomId,
      open: false,
      closedBy: {
        participantId,
        name: closedByName || opener.openedByName,
      },
    });
    return;
  }
  if (remainingPeers <= 0) {
    clearWhiteboardActive(roomId);
  }
}
