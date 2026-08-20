import type { Socket } from 'socket.io-client';
import { RC_EVENTS } from '../types';
import type { ControlledUiState, RemoteUiCommand } from '../types';

function ack<T = Record<string, unknown>>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Remote control timed out')), 8_000);
    socket.emit(event, payload, (res: { error?: string; code?: string } & T) => {
      clearTimeout(t);
      if (res?.error) {
        const err = new Error(res.error) as Error & { code?: string };
        err.code = res.code;
        reject(err);
        return;
      }
      resolve(res);
    });
  });
}

export const remoteControlService = {
  request(socket: Socket, roomId: string, targetParticipantId: string) {
    return ack<{ sessionId: string; state: string }>(socket, RC_EVENTS.REQUEST, {
      roomId,
      targetParticipantId,
    });
  },
  respond(socket: Socket, sessionId: string, accept: boolean) {
    return ack(socket, RC_EVENTS.RESPOND, { sessionId, accept });
  },
  action(socket: Socket, sessionId: string, seq: number, actionType: RemoteUiCommand, payload: Record<string, unknown> = {}) {
    return ack(socket, RC_EVENTS.ACTION, { sessionId, seq, actionType, payload });
  },
  stop(socket: Socket, sessionId: string) {
    return ack(socket, RC_EVENTS.STOP, { sessionId });
  },
  cursor(socket: Socket, sessionId: string, x: number, y: number, visible: boolean) {
    socket.emit(RC_EVENTS.CURSOR, { sessionId, x, y, visible });
  },
  uiState(socket: Socket, sessionId: string, state: ControlledUiState) {
    socket.emit(RC_EVENTS.UI_STATE, { sessionId, state });
  },
  draft(socket: Socket, sessionId: string, chatDraft: string) {
    socket.emit(RC_EVENTS.DRAFT, { sessionId, chatDraft });
  },
  view(socket: Socket, sessionId: string, view: 'self' | 'remote') {
    return ack(socket, RC_EVENTS.VIEW, { sessionId, view });
  },
  sync(socket: Socket, sessionId: string) {
    socket.emit(RC_EVENTS.SYNC, { sessionId });
  },
};
