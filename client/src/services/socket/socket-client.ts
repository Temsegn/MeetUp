import { io, Socket } from 'socket.io-client';
import { API_URL } from '../../lib/apiUrl';

let currentSocket: Socket | null = null;

/**
 * Tear down any existing meeting socket so leave/rejoin never leaves a
 * reconnecting Manager (pending Engine.IO polls / duplicate sessions).
 */
export function destroySocketClient(socket?: Socket | null): void {
  const target = socket ?? currentSocket;
  if (!target) {
    if (!socket) currentSocket = null;
    return;
  }

  try {
    target.removeAllListeners();
    target.io.removeAllListeners();
    // Stop automatic reconnect before disconnecting.
    target.io.reconnection(false);
  } catch {
    /* ignore */
  }

  try {
    target.disconnect();
  } catch {
    /* ignore */
  }

  try {
    // Force-close the underlying Manager so no pending polling XHR remains.
    target.io.engine?.close();
  } catch {
    /* ignore */
  }

  if (currentSocket === target) {
    currentSocket = null;
  }
}

/**
 * Create a fresh, authenticated Socket.IO client for a meeting session.
 *
 * Reconnection is aggressive (bounded) so Wi-Fi↔mobile handovers recover
 * without abandoning the meeting UI. Media is rebuilt via join-room after
 * signaling recovers; admission is persisted server-side.
 *
 * Always destroys any previous meeting socket first (single-socket rule).
 */
export function createSocketClient(token: string): Socket {
  destroySocketClient();

  const socket = io(API_URL, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 40,
    reconnectionDelay: 800,
    reconnectionDelayMax: 12_000,
    randomizationFactor: 0.4,
    timeout: 20_000,
    // Prefer websocket-only so we don't leave long-polling XHRs in Network tab.
    forceNew: true,
  });

  currentSocket = socket;

  socket.on('connect', () => {
    console.info('[Socket] Connected', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected', reason);
    if (reason === 'io client disconnect' && currentSocket === socket) {
      currentSocket = null;
    }
  });

  return socket;
}

export const socketClient = {
  getSocket: () => currentSocket,
  createSocketClient,
  destroySocketClient,
};
