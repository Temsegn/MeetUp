import type { Socket } from 'socket.io-client';
import {
  WB_EVENTS,
  type WhiteboardCursorPayload,
  type WhiteboardElement,
  type WhiteboardFiles,
  type WhiteboardJoinAck,
  type WhiteboardSyncPayload,
  type WhiteboardUpdateAck,
} from '../types';

export type WhiteboardSocketAdapter = {
  join: () => Promise<Extract<WhiteboardJoinAck, { success: true }>>;
  leave: () => void;
  sendUpdate: (opts: {
    elements: WhiteboardElement[];
    files?: WhiteboardFiles;
    baseRevision?: number;
  }) => Promise<WhiteboardUpdateAck>;
  sendCursor: (opts: {
    x: number;
    y: number;
    pointer?: 'mouse' | 'touch' | 'pen';
    button?: 'up' | 'down';
  }) => void;
  clear: () => Promise<WhiteboardUpdateAck>;
  onSync: (handler: (payload: WhiteboardSyncPayload) => void) => () => void;
  onCursor: (handler: (payload: WhiteboardCursorPayload) => void) => () => void;
  onError: (handler: (payload: { code: string; message: string }) => void) => () => void;
  destroy: () => void;
};

/**
 * Isolates Socket.IO whiteboard events from React components.
 */
export function createWhiteboardSocketAdapter(opts: {
  socket: Socket;
  roomId: string;
  clientId: string;
}): WhiteboardSocketAdapter {
  const { socket, roomId, clientId } = opts;
  const cleanups: Array<() => void> = [];

  function onSync(handler: (payload: WhiteboardSyncPayload) => void): () => void {
    const fn = (payload: WhiteboardSyncPayload) => {
      if (payload.roomId !== roomId) return;
      handler(payload);
    };
    socket.on(WB_EVENTS.SYNC, fn);
    const off = () => socket.off(WB_EVENTS.SYNC, fn);
    cleanups.push(off);
    return off;
  }

  function onCursor(handler: (payload: WhiteboardCursorPayload) => void): () => void {
    const fn = (payload: WhiteboardCursorPayload) => {
      if (payload.roomId !== roomId) return;
      if (payload.clientId === clientId) return;
      handler(payload);
    };
    socket.on(WB_EVENTS.CURSOR, fn);
    const off = () => socket.off(WB_EVENTS.CURSOR, fn);
    cleanups.push(off);
    return off;
  }

  function onError(handler: (payload: { code: string; message: string }) => void): () => void {
    const fn = (payload: { code: string; message: string }) => handler(payload);
    socket.on(WB_EVENTS.ERROR, fn);
    const off = () => socket.off(WB_EVENTS.ERROR, fn);
    cleanups.push(off);
    return off;
  }

  function join(): Promise<Extract<WhiteboardJoinAck, { success: true }>> {
    return new Promise((resolve, reject) => {
      socket.emit(WB_EVENTS.JOIN, { roomId, clientId }, (ack: WhiteboardJoinAck) => {
        if (ack && 'success' in ack && ack.success) {
          resolve(ack);
          return;
        }
        reject(new Error((ack as { error?: string })?.error || 'Whiteboard join failed'));
      });
    });
  }

  function leave(): void {
    socket.emit(WB_EVENTS.LEAVE, { roomId });
  }

  function sendUpdate(update: {
    elements: WhiteboardElement[];
    files?: WhiteboardFiles;
    baseRevision?: number;
  }): Promise<WhiteboardUpdateAck> {
    return new Promise((resolve) => {
      socket.emit(
        WB_EVENTS.UPDATE,
        {
          roomId,
          clientId,
          baseRevision: update.baseRevision,
          elements: update.elements,
          files: update.files,
        },
        (ack: WhiteboardUpdateAck) => resolve(ack ?? {}),
      );
    });
  }

  function sendCursor(cursor: {
    x: number;
    y: number;
    pointer?: 'mouse' | 'touch' | 'pen';
    button?: 'up' | 'down';
  }): void {
    socket.emit(WB_EVENTS.CURSOR, {
      roomId,
      clientId,
      ...cursor,
    });
  }

  function clear(): Promise<WhiteboardUpdateAck> {
    return new Promise((resolve) => {
      socket.emit(WB_EVENTS.CLEAR, { roomId, clientId }, (ack: WhiteboardUpdateAck) =>
        resolve(ack ?? {}),
      );
    });
  }

  function destroy(): void {
    for (const off of cleanups.splice(0)) off();
    leave();
  }

  return { join, leave, sendUpdate, sendCursor, clear, onSync, onCursor, onError, destroy };
}
